# The AFK loop runs agents up to the human gate, and no further

`scripts/afk.sh` works the ready queue unattended. It picks eligible tickets,
claims each one by assigning it, cuts a branch from `main`, runs a bounded
Claude Code session against the issue body, checks what came back, and pushes
and opens the pull request itself. A run can happen while nobody is watching,
against a repository that deploys `main` to production on every merge.

The human gate stays exactly where it was. Somebody reads the diff and clicks
merge, and nothing about the loop moves that boundary - it only fills the queue
of things waiting at it. The script owns the push and `gh pr create`; the agent
owns neither, and runs with no GitHub credential and no route to GitHub at all.
So agent-authored change cannot reach `main`, and therefore production, without
a person having read it.

That claim is about where the change lands, not about what runs. Since
[ADR-0014](0014-every-pull-request-gets-a-preview.md), agent-authored code is
executed by a pull request job holding an account-wide Cloudflare token before
anybody has read it, and that job writes to a preview Worker and a preview
database. Production's hostname and production's database still sit behind the
merge, which is the part this record was ever about; ADR-0014 carries the
reasoning and the accounting of what the token exposes. The position above is
the same one
[ADR-0006](0006-main-is-squash-only-and-unversioned.md) arrived at
independently when it kept required approvals at `0`: the click is the review.

The gate only holds if what arrives at it is reviewable, so the script checks
the branch before it pushes: the session's branch is still checked out, the
working tree is clean, the branch is exactly one commit ahead of `origin/main`,
the subject is conventional and carries no issue number, and the last line is
`Fixes #N`. A branch that fails any of those is discarded, the ticket is
unassigned and commented on, and no pull request is opened. Under squash-only
that commit _is_ the pull request body, so a malformed commit is not a cosmetic
problem - it is a pull request that closes nothing and explains nothing.

Numbered files are allocated to the session rather than inferred by it. A run
works several tickets from the same `main`, so two sessions asking "what is the
next decision record number?" would both answer the same thing and collide at
merge. The script reads the highest number across `origin/main` and every branch
this run has already published, and tells the session in its system prompt which
number is its own.

## Considered Options

Each was rejected, and each carries the condition that would bring it back.

**Stacked pull requests.** Mechanically viable: the official stacking extension
handles the post-squash restack correctly, which was checked rather than
assumed. Rejected because a stack encodes a dependency chain, and this queue is
a priority queue whose members are independent by construction. Stacking would
make the first pull request a single point of failure for every one behind it,
force merges in priority order rather than correctness order, and require a
terminal round trip after each merge - where the repository's one-click branch
update already covers the equivalent in the browser. Revive if a batch ever
becomes a genuine dependency chain.

**A container instead of the operating system's sandbox.** Would supply the same
filesystem and network confinement, at the cost of moving authentication out of
the operator's keychain and paying the known macOS filesystem performance
penalty - on a project where every ticket ends in a browser test run. Revive
when the goal becomes moving the loop off the operator's machine entirely,
rather than confining what it can touch on it.

**A bot identity - a GitHub App or a dedicated token.** Claims and pull requests
appear under the operator's own account, and that genuinely costs signal:
"assigned to the operator" stops meaning "the operator is working on this".
Rejected for now under the same revival condition ADR-0006 already records for
required approvals: when agents run genuinely autonomously, a separate identity
authors the work and a human approval becomes something that can actually be
given.

**An automated test suite for the script.** The realistic harness stubs the
`gh` and `claude` executables, which asserts the easy half - argument
construction, branch bookkeeping - while leaving the hard half untested:
whether the sandbox permits the loopback connection the end-to-end suite needs,
whether a real session reliably produces exactly one commit, whether the local
dev server survives a killed session. `shellcheck` in `npm run lint` plus a
staged first run cover the failure classes a harness would not. Revive if the
script grows logic whose correctness is not observable from a real run - a
non-trivial pure function over queue data, say.

**Adding the loop's vocabulary to the glossary.** Queue, claim, session, record:
these are workflow terms, not domain terms, and `CONTEXT.md` is deliberately
free of implementation concerns. Revive if the loop ever becomes something the
product itself models rather than something the repository is worked with.

## Consequences

The queue's eligibility rules are the loop's whole safety story on the input
side, so they are strict: a ticket is attempted only when it is triaged
`ready-for-agent`, is unblocked by any open issue, has no sub-issues, and is
unassigned. Bugs sort ahead of everything else, then by issue number. Anything a
human has claimed is invisible to the loop, which makes assignment the shared
signal in both directions.

A failed attempt leaves the ticket runnable rather than half-done. The branch is
deleted, the assignee is removed, and a comment records that an unattended run
tried and did not open a pull request. Nothing about a failure is silently
retried within a run.

Records of each session - transcript, stderr, and a summary carrying cost,
turns, session id and permission denials - are written under the operator's
state directory and never committed. They are diagnostic output about a machine
and a night, not part of the project's history.

`AGENTS.md` states the resulting rules for an agent working here, without this
reasoning. Anyone proposing a workflow that contradicts them should read this
first.
