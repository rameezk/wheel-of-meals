---
name: heal-stale-prs
description: "Heal open pull requests that have fallen behind origin/main by merging main in, resolving conflicts with intent, gating locally, pushing, and waiting for CI. Use the morning after an AFK run, or whenever open PRs are behind main."
disable-model-invocation: true
---

# Heal stale pull requests

Runs in the operator's own interactive session, so it has the operator's `gh`
credential and network. It fetches, resolves, gates, and pushes directly - there
is no script/session credential split.

It scans every open pull request behind `origin/main` and reports the whole
batch, then heals **one** pull request per invocation. Strict up-to-date
([ADR-0006](../../../docs/adr/0006-main-is-squash-only-and-unversioned.md)) means
merging any one healed pull request re-stales the rest, so the operator keeps the
merge order: merge the healed pull request yourself, then re-invoke for the next.
See [ADR-0017](../../../docs/adr/0017-stale-pull-requests-are-healed-by-hand-at-the-gate.md)
for why this is manual, merges rather than rebases, and heals one at a time.

If the operator named a specific pull request, heal that one. Otherwise heal the
next in the loop's queue order: **bugs first, then lowest issue number.**

## 1. Scan and report the batch

```
git fetch origin
gh pr list --state open --json number,title,headRefName,isDraft,labels,body
```

For each non-draft pull request, decide whether it is behind `origin/main` and,
if so, whether catching up is clean or conflicting - without touching any branch:

```
git rev-list --count origin/<headRefName>..origin/main
git merge-tree --write-tree origin/<headRefName> origin/main
```

A count of `0` means the pull request is already current - skip it. Otherwise it
is behind: `merge-tree` exits `0` for a clean catch-up and non-zero (printing the
conflicted paths) for a real conflict.

Report every behind pull request up front, ordered in the loop's queue order,
each with: number, title, `Fixes #N`, and **clean** vs **conflicting**. Pull
requests already current are not listed. This is the whole morning's landscape.

## 2. Pick the one to heal

The named pull request if the operator gave one; otherwise the first behind pull
request in queue order (bugs first - by the `bug` label - then lowest issue
number). Announce which one and why.

## 3. Heal it

```
git checkout <headRefName>
git merge origin/main
```

- **Clean catch-up** (no conflict): the merge completes on its own. Go to the
  gate.
- **Conflict:** resolve using the **`resolving-merge-conflicts`** skill. Read
  each conflicting hunk together with **both** `Fixes #N` issue bodies (this
  pull request's, and the one on `main` that moved), so you resolve intent, not
  text. Get both issue bodies with `gh issue view <N>`. Preserve both intents
  where compatible; where not, pick the one matching this pull request's goal and
  note the trade-off. **Never invent new behaviour** - the healed pull request
  must still do only what its two originating issues asked for. Never
  `git merge --abort`.

If the conflict is genuinely **ambiguous** - you cannot tell which intent should
win without guessing - stop. Abort the merge, leave the branch untouched, and
bucket the pull request as **needs you** with the reason. Do not guess-and-push a
semantic merge.

## 4. Local gate before push

Fast gate only; end-to-end tests are left to CI.

```
npm run lint
npm run typecheck
npm run test
```

If any fail, the merge broke something. Fix it if the fix is obvious and within
the two issues' intent; otherwise abort and bucket the pull request as **needs
you** with the failing gate. Do not push a locally-broken merge.

## 5. Push and wait for CI

```
git push
gh pr checks <number> --watch
```

- CI green -> **healed and green**, waiting at the merge gate.
- CI still running when you must move on -> **healed and awaiting CI**.
- CI red -> **needs you**, reported with the failing check. A push that goes red
  is demoted, not left looking mergeable.

## 6. Summarise

Give the operator a final summary of the batch:

- **Healed and green** - pushed, CI green, waiting at the merge gate.
- **Healed and awaiting CI** - pushed, checks still running.
- **Needs you** - ambiguous conflict left untouched, local-gate failure, or red
  CI - each by pull request number with the reason.

Then remind the operator: merge the healed pull request yourself and re-invoke
this skill for the next one - merging re-stales the rest of the batch.
