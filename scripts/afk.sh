#!/usr/bin/env bash
set -euo pipefail

readonly SETTINGS=".claude/settings.afk.json"
readonly READY_LABEL="ready-for-agent"
readonly BUG_LABEL="bug"
readonly DEFAULT_CAP=3
readonly ADR_DIR="docs/adr"
readonly MIGRATION_DIR="migrations"
readonly SUBJECT_PATTERN='^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(\([a-z0-9._/-]+\))?!?: .+'
readonly SESSION_LIMIT="2h"
readonly SESSION_GRACE="1m"
readonly DEV_PORT=8788
readonly RECORD_ROOT="$HOME/.local/state/wheel-of-meals/afk"
readonly ATTEMPT_COMMENT="An unattended agent run attempted this ticket and did not open a pull request. The ticket has been unassigned and is back in the queue. The record of the attempt is on the operator's machine."

NUMBERED_REFS=(origin/main)
CLAIMED_ISSUE=""
CURRENT_BRANCH=""
RECORD_DIR=""

usage() {
  cat >&2 <<USAGE
usage: ${0##*/} [count]

Works the ready queue, one ticket at a time, and opens a pull request for each.
count is how many tickets this run may attempt (default $DEFAULT_CAP).
USAGE
  exit 64
}

die() {
  echo "afk: $*" >&2
  exit 1
}

note() {
  echo "afk: $*" >&2
}

slugify() {
  printf '%s\n' "$1" |
    LC_ALL=C tr -c '[:alnum:]\n' '-' |
    LC_ALL=C tr '[:upper:]' '[:lower:]' |
    LC_ALL=C sed -e 's/--*/-/g' -e 's/^-//' -e 's/-$//' |
    cut -c1-50 |
    sed -e 's/-$//'
}

queue() {
  local cap="$1"

  gh issue list \
    --state open \
    --label "$READY_LABEL" \
    --limit 200 \
    --json number,labels,assignees,blockedBy,subIssues |
    jq -r \
      --argjson cap "$cap" \
      --arg bug "$BUG_LABEL" '
        map(select(
          (.assignees | length) == 0
          and .subIssues.totalCount == 0
          and ([.blockedBy.nodes[] | select(.state == "OPEN")] | length) == 0
        ))
        | map({ number, bug: ([.labels[].name] | index($bug) != null) })
        | sort_by(if .bug then 0 else 1 end, .number)
        | limit($cap; .[])
        | .number
      '
}

next_number() {
  local dir="$1"
  shift

  local ref name number highest=0
  for ref in "$@"; do
    while read -r name; do
      number=${name##*/}
      number=${number:0:4}
      [[ "$number" =~ ^[0-9]{4}$ ]] || continue
      number=$((10#$number))
      ((number > highest)) && highest=$number
    done < <(git ls-tree -r --name-only "$ref" -- "$dir")
  done

  printf '%04d\n' $((highest + 1))
}

session_rules() {
  local issue="$1" branch="$2" adr="$3" migration="$4"
  cat <<RULES
This is an unattended run working GitHub issue #$issue on branch $branch.

You have no GitHub credential and no network route to GitHub. Do not run \`gh\`,
do not run \`git push\`, and do not try to open a pull request. The script that
started you does all of that itself, once it has checked your commit.

Other branches in this run are being cut from the same \`main\`, so numbered
files are allocated to you rather than inferred. Every number below these is
already taken, on \`main\` or on a sibling branch you cannot see:

  - A decision record, if you add one, is \`$ADR_DIR/$adr-<slug>.md\`.
  - A migration, if you add one, is \`$MIGRATION_DIR/${migration}_<slug>.sql\`.

Leave the branch as exactly one commit, written like this:

  - Subject: a conventional commit message (\`feat:\`, \`fix:\`, \`chore:\`, ...).
    Never put an issue number in the subject.
  - Body: what changed and why it was built that way.
  - Last line, exactly: \`Fixes #$issue\`

Amend that one commit for every further change; never add a second. A branch
that breaks any of these rules is discarded without a pull request.
RULES
}

verify() {
  local issue="$1" branch="$2" message subject last_line ahead

  if [ "$(git rev-parse --abbrev-ref HEAD)" != "$branch" ]; then
    note "the session left $branch checked out elsewhere"
    return 1
  fi
  if [ -n "$(git status --porcelain)" ]; then
    note "the session left the working tree dirty"
    return 1
  fi

  ahead=$(git rev-list --count origin/main..HEAD)
  if [ "$ahead" -ne 1 ]; then
    note "the branch is $ahead commits ahead of main, expected exactly 1"
    return 1
  fi

  message=$(git log -1 --pretty=%B)
  subject=$(head -n 1 <<<"$message")
  last_line=$(grep -v '^[[:space:]]*$' <<<"$message" | tail -n 1)

  if [[ ! "$subject" =~ $SUBJECT_PATTERN ]]; then
    note "the commit subject is not conventional: $subject"
    return 1
  fi
  if [[ "$subject" == *"#"[0-9]* ]]; then
    note "the commit subject carries an issue number: $subject"
    return 1
  fi
  if [ "$last_line" != "Fixes #$issue" ]; then
    note "the commit does not end with 'Fixes #$issue': $last_line"
    return 1
  fi

  echo "afk: the commit is well formed"
}

publish() {
  local branch="$1"

  echo "afk: pushing $branch and opening its pull request"
  git push -u origin "$branch" || return 1
  if ! gh pr create --fill; then
    note "the pull request could not be opened; taking $branch off the remote so the ticket stays runnable"
    git push origin --delete "$branch" >/dev/null 2>&1 || note "$branch is left on the remote and will block a later attempt"
    return 1
  fi
}

run_session() {
  local prompt="$1" rules="$2" transcript="$3" errors="$4"

  local status=0
  timeout --kill-after="$SESSION_GRACE" "$SESSION_LIMIT" \
    claude -p "$prompt" \
    --settings "$SETTINGS" \
    --append-system-prompt "$rules" \
    --permission-mode acceptEdits \
    --output-format stream-json \
    --verbose \
    >"$transcript" 2>"$errors" || status=$?

  return "$status"
}

clear_dev_port() {
  local pids
  pids=$(lsof -ti "tcp:$DEV_PORT" 2>/dev/null || true)
  [ -n "$pids" ] || return 0

  echo "afk: clearing port $DEV_PORT"
  xargs kill <<<"$pids" 2>/dev/null || true
  sleep 5

  pids=$(lsof -ti "tcp:$DEV_PORT" 2>/dev/null || true)
  [ -n "$pids" ] || return 0
  xargs kill -9 <<<"$pids" 2>/dev/null || true
}

release_ticket() {
  local issue="$1"

  echo "afk: releasing #$issue back to the queue"
  gh issue edit "$issue" --remove-assignee @me >/dev/null || note "#$issue could not be unassigned"
  gh issue comment "$issue" --body "$ATTEMPT_COMMENT" >/dev/null || note "#$issue could not be commented on"
}

abandon_branch() {
  [ -n "$CURRENT_BRANCH" ] || return 0

  local branch="$CURRENT_BRANCH" tip
  CURRENT_BRANCH=""
  tip=$(git rev-parse "$branch" 2>/dev/null || echo "unknown")

  git checkout --force main >/dev/null 2>&1 || die "cannot return to main after $branch"
  git reset --hard origin/main >/dev/null || die "main cannot be reset onto origin/main after $branch"
  git clean -fd >/dev/null || note "the working tree could not be cleaned after $branch"
  git branch -D "$branch" >/dev/null 2>&1 || note "$branch could not be deleted and will block a later attempt"
  echo "afk: discarded $branch so the ticket can be attempted again; its tip was $tip"
}

record_session() {
  local issue="$1" branch="$2" status="$3" outcome="$4" transcript="$5" summary="$6"

  local result ended tallied
  result=$(jq -c 'select(.type == "result")' "$transcript" 2>/dev/null | tail -n 1) || true
  [ -n "$result" ] || result='{}'

  tallied=$({ jq -c 'select(.type == "assistant") | .message.usage // empty' "$transcript" 2>/dev/null || true; } |
    jq -c -s '{
      input_tokens: (map(.input_tokens // 0) | add // 0),
      output_tokens: (map(.output_tokens // 0) | add // 0),
      cache_creation_input_tokens: (map(.cache_creation_input_tokens // 0) | add // 0),
      cache_read_input_tokens: (map(.cache_read_input_tokens // 0) | add // 0),
      tallied_from: "transcript"
    }') || tallied='null'

  case "$status" in
    0) ended=$(jq -r '.terminal_reason // .subtype // "unknown"' <<<"$result") ;;
    124 | 137) ended="terminated at the $SESSION_LIMIT limit" ;;
    *) ended="exited $status" ;;
  esac

  jq -n \
    --argjson issue "$issue" \
    --arg branch "$branch" \
    --arg outcome "$outcome" \
    --arg ended "$ended" \
    --argjson result "$result" \
    --argjson tallied "$tallied" \
    '{
      issue: $issue,
      branch: $branch,
      outcome: $outcome,
      ended: $ended,
      cost_usd: ($result.total_cost_usd // null),
      num_turns: ($result.num_turns // null),
      session_id: ($result.session_id // null),
      usage: ($result.usage // $tallied),
      permission_denials: ($result.permission_denials // null)
    }' >"$summary"

  local cost denials
  cost=$(jq -r 'if .cost_usd == null then "unknown" else "$\(.cost_usd)" end' "$summary")
  denials=$(jq -r 'if .permission_denials == null then "an unknown number of" else (.permission_denials | length | tostring) end' "$summary")
  echo "afk: #$issue $outcome, session $ended, cost $cost, $denials denied permission(s)"
  echo "afk: the record is in $RECORD_DIR"
}

work_ticket() {
  local issue="$1"

  local issue_json title body state comments
  if ! issue_json=$(gh issue view "$issue" --json title,body,state,comments); then
    note "issue #$issue could not be read"
    return 1
  fi
  title=$(jq -r '.title' <<<"$issue_json")
  body=$(jq -r '.body // ""' <<<"$issue_json")
  state=$(jq -r '.state' <<<"$issue_json")
  comments=$(jq -r '.comments[] | "### Comment from @\(.author.login)\n\n\(.body)\n"' <<<"$issue_json")
  if [ "$state" != "OPEN" ]; then
    note "issue #$issue is $state"
    return 1
  fi
  [ -n "$body" ] || body="_No description._"
  [ -n "$comments" ] || comments="_No comments._"

  local branch
  branch="$issue-$(slugify "$title")"
  if git show-ref --verify --quiet "refs/heads/$branch"; then
    note "branch $branch already exists"
    return 1
  fi

  echo "afk: claiming #$issue"
  if ! gh issue edit "$issue" --add-assignee @me >/dev/null; then
    note "#$issue could not be claimed"
    return 1
  fi
  CLAIMED_ISSUE="$issue"

  echo "afk: cutting $branch from main"
  git fetch origin main || {
    note "origin could not be fetched"
    return 1
  }
  git checkout main || {
    note "main could not be checked out"
    return 1
  }
  git merge --ff-only origin/main || {
    note "main could not be fast-forwarded onto origin/main"
    return 1
  }
  git checkout -b "$branch" || {
    note "$branch could not be created"
    return 1
  }
  CURRENT_BRANCH="$branch"

  local adr migration
  adr=$(next_number "$ADR_DIR" "${NUMBERED_REFS[@]}") || {
    note "the next decision record number could not be worked out"
    return 1
  }
  migration=$(next_number "$MIGRATION_DIR" "${NUMBERED_REFS[@]}") || {
    note "the next migration number could not be worked out"
    return 1
  }
  echo "afk: the next decision record is $adr and the next migration is $migration"

  local prompt
  prompt=$(printf '/implement\n\n# Issue #%s: %s\n\n%s\n\n## Comments on the issue\n\n%s\n' \
    "$issue" "$title" "$body" "$comments")

  local transcript="$RECORD_DIR/issue-$issue.transcript.jsonl"
  local errors="$RECORD_DIR/issue-$issue.stderr.log"
  local summary="$RECORD_DIR/issue-$issue.summary.json"

  echo "afk: running the session, at most $SESSION_LIMIT, transcript in $transcript"
  local status=0
  run_session \
    "$prompt" \
    "$(session_rules "$issue" "$branch" "$adr" "$migration")" \
    "$transcript" \
    "$errors" || status=$?

  local outcome="failed"
  if [ "$status" -eq 0 ] && verify "$issue" "$branch" && publish "$branch"; then
    outcome="succeeded"
    NUMBERED_REFS+=("$branch")
    CURRENT_BRANCH=""
    CLAIMED_ISSUE=""
  fi

  record_session "$issue" "$branch" "$status" "$outcome" "$transcript" "$summary"
  [ "$outcome" = "succeeded" ]
}

main() {
  [ $# -le 1 ] || usage
  local cap="${1:-$DEFAULT_CAP}"
  [[ "$cap" =~ ^[1-9][0-9]*$ ]] || usage

  local tool
  for tool in gh git jq claude lsof; do
    command -v "$tool" >/dev/null || die "$tool is not on the path"
  done
  command -v timeout >/dev/null ||
    die "timeout is not on the path; it is what bounds each session, and it ships with coreutils - add coreutils to your home-manager packages and re-run"

  local root
  root=$(git rev-parse --show-toplevel) || die "not inside a git repository"
  cd "$root" || die "cannot enter $root"
  [ -f "$SETTINGS" ] || die "$SETTINGS is missing"
  [ -z "$(git status --porcelain)" ] || die "working tree is dirty"

  local listing
  listing=$(queue "$cap") || die "the ready queue could not be read"

  local line issues=()
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    issues+=("$line")
  done <<<"$listing"

  if [ ${#issues[@]} -eq 0 ]; then
    echo "afk: nothing is eligible; every ready ticket is claimed, blocked, or a parent"
    return 0
  fi

  RECORD_DIR="$RECORD_ROOT/$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$RECORD_DIR" || die "cannot create $RECORD_DIR"

  echo "afk: working ${#issues[@]} ticket(s) of at most $cap, recording to $RECORD_DIR"
  trap clear_dev_port EXIT

  local issue failed=0
  for issue in "${issues[@]}"; do
    if ! work_ticket "$issue"; then
      failed=$((failed + 1))
      if [ -n "$CLAIMED_ISSUE" ]; then
        release_ticket "$CLAIMED_ISSUE"
        CLAIMED_ISSUE=""
      fi
      abandon_branch
    fi
    clear_dev_port
  done

  echo "afk: the run is done; ${#issues[@]} attempted, $failed failed"
  [ "$failed" -eq 0 ]
}

main "$@"
