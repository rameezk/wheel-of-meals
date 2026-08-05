#!/usr/bin/env bash
set -euo pipefail

readonly SETTINGS=".claude/settings.afk.json"
readonly READY_LABEL="ready-for-agent"
readonly BUG_LABEL="bug"
readonly DEFAULT_CAP=3
readonly ADR_DIR="docs/adr"
readonly MIGRATION_DIR="migrations"
readonly SUBJECT_PATTERN='^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(\([a-z0-9._/-]+\))?!?: .+'

CREATED_BRANCHES=()

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

  [ "$(git rev-parse --abbrev-ref HEAD)" = "$branch" ] || die "the session left $branch checked out elsewhere"
  [ -z "$(git status --porcelain)" ] || die "the session left the working tree dirty"

  ahead=$(git rev-list --count origin/main..HEAD)
  [ "$ahead" -eq 1 ] || die "the branch is $ahead commits ahead of main, expected exactly 1"

  message=$(git log -1 --pretty=%B)
  subject=$(head -n 1 <<<"$message")
  last_line=$(grep -v '^[[:space:]]*$' <<<"$message" | tail -n 1)

  [[ "$subject" =~ $SUBJECT_PATTERN ]] || die "the commit subject is not conventional: $subject"
  [[ "$subject" != *"#"[0-9]* ]] || die "the commit subject carries an issue number: $subject"
  [ "$last_line" = "Fixes #$issue" ] || die "the commit does not end with 'Fixes #$issue': $last_line"

  echo "afk: the commit is well formed"
}

work_ticket() {
  local issue="$1"

  local issue_json title body state comments
  issue_json=$(gh issue view "$issue" --json title,body,state,comments)
  title=$(jq -r '.title' <<<"$issue_json")
  body=$(jq -r '.body // ""' <<<"$issue_json")
  state=$(jq -r '.state' <<<"$issue_json")
  comments=$(jq -r '.comments[] | "### Comment from @\(.author.login)\n\n\(.body)\n"' <<<"$issue_json")
  [ "$state" = "OPEN" ] || die "issue #$issue is $state"
  [ -n "$body" ] || body="_No description._"
  [ -n "$comments" ] || comments="_No comments._"

  local branch
  branch="$issue-$(slugify "$title")"
  if git show-ref --verify --quiet "refs/heads/$branch"; then
    die "branch $branch already exists"
  fi

  echo "afk: claiming #$issue"
  gh issue edit "$issue" --add-assignee @me >/dev/null

  echo "afk: cutting $branch from main"
  git fetch origin main
  git checkout main
  git merge --ff-only origin/main
  git checkout -b "$branch"
  CREATED_BRANCHES+=("$branch")

  local adr migration
  adr=$(next_number "$ADR_DIR" origin/main "${CREATED_BRANCHES[@]}")
  migration=$(next_number "$MIGRATION_DIR" origin/main "${CREATED_BRANCHES[@]}")
  echo "afk: the next decision record is $adr and the next migration is $migration"

  echo "afk: running the session"
  local prompt
  prompt=$(printf '/implement\n\n# Issue #%s: %s\n\n%s\n\n## Comments on the issue\n\n%s\n' \
    "$issue" "$title" "$body" "$comments")

  claude -p "$prompt" \
    --settings "$SETTINGS" \
    --append-system-prompt "$(session_rules "$issue" "$branch" "$adr" "$migration")" \
    --permission-mode acceptEdits ||
    die "the session exited non-zero; branch $branch is left in place"

  verify "$issue" "$branch"

  echo "afk: pushing $branch and opening its pull request"
  git push -u origin "$branch"
  gh pr create --fill
}

main() {
  [ $# -le 1 ] || usage
  local cap="${1:-$DEFAULT_CAP}"
  [[ "$cap" =~ ^[1-9][0-9]*$ ]] || usage

  local tool
  for tool in gh git jq claude; do
    command -v "$tool" >/dev/null || die "$tool is not on the path"
  done

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

  echo "afk: working ${#issues[@]} ticket(s) of at most $cap"

  local issue
  for issue in "${issues[@]}"; do
    work_ticket "$issue"
  done

  echo "afk: the run is done"
}

main "$@"
