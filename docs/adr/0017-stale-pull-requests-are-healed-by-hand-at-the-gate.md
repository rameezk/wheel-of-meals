# Stale pull requests are healed by hand at the gate

[ADR-0009](0009-the-afk-loop-runs-agents-up-to-the-human-gate.md) covers the
loop up to the human gate: it fills a queue of independent pull requests, each
cut from the same `origin/main`, and stops. This record covers what happens at
that gate the next morning.

The strict up-to-date requirement is kept on purpose
([ADR-0006](0006-main-is-squash-only-and-unversioned.md)): a branch must catch
up to `main` before it can merge, because with continuous deployment and no
staging, `main` is the first place a semantic conflict between two independently
green pull requests would otherwise surface. So the morning after a run the
operator merges the first pull request, `main` moves, and every other pull
request in the batch falls behind. Catching a stale branch up conflicts whenever
two branches touched the same lines, and historically that is almost every
multi-pull-request run: the batch converges on a small set of central client
files - `HouseholdPage.tsx`, `Week.tsx`, `MealBank.tsx` - and the shared
`household.spec.ts` and `test-fixtures.ts`. Across five multi-pull-request
clusters, all five had file overlap between at least two pull requests
concentrated on those regions; ADRs and migrations rarely or never collided.
File overlap is not a guaranteed conflict, but the concentration makes conflicts
frequent and structural rather than incidental.

The `heal-stale-prs` skill is the answer. A human-triggered skill the operator
runs inside the morning Claude session, it scans every open pull request behind
`origin/main` and reports the whole batch's landscape - clean fast-forward
versus real conflict - then heals one pull request at a time by merging `main`
into its branch, resolving conflicts with intent, running a fast local gate,
pushing, and waiting for that pull request's CI before moving on. It is a
stale-pull-request healer, not an AFK tool: a pull request behind `main` is
healed the same way regardless of whether the loop or a person opened it, and
provenance is irrelevant because AFK and hand-authored pull requests are
indistinguishable by author.

## Why manual, and why merge

The healer runs in the operator's own session, so it holds the operator's `gh`
credential and network and pushes directly - there is no script-and-session
credential split like `afk.sh` needs, where the script owns the push because the
sandboxed session cannot reach GitHub. That does not move the gate ADR-0009
draws. The healer produces resolutions that wait at the gate for a human to read
and click; agent-authored change still cannot reach `main`, and therefore
production, without a person having read it. Healing is one pull request at a
time precisely so the operator keeps the merge order: strict up-to-date means
merging any one healed pull request re-stales the rest, so the operator decides
which pull request wins a conflict by choosing what lands first, then re-invokes
the skill for the next.

Resolution merges `origin/main` into the branch and never rebases. This is what
GitHub's update-branch button does, the squash discards the merge commit at land
time (ADR-0006), and it never rewrites already-pushed history or force-pushes.
The resolver reads the conflicting hunks together with both `Fixes #N` issue
bodies - the closing reference always reaches the pull request body under
ADR-0006, so the two issue numbers are always available - and combines intents
rather than text: it preserves both where compatible, picks the one matching the
merge's goal where not, and never invents new behaviour. The per-conflict
mechanics are delegated to the existing `resolving-merge-conflicts` skill; the
healer adds only the batch selection, the local gate, the CI wait, and the
bucketing.

The gate only holds if what arrives at it is trustworthy, so a resolution is
gated before it is pushed and again after. The local gate runs `lint`,
`typecheck`, and `test` (unit and integration); end-to-end tests are left to CI,
so the gate stays fast and needs no Playwright browser install or dev-server
babysitting. After a push, the healer waits for that pull request's checks to
conclude. Every pull request lands in one of three buckets: healed and green
(clean catch-up or confident resolution, locally green, pushed, CI green,
waiting at the merge gate); healed and awaiting CI (pushed, checks still
running); or needs you (an ambiguous conflict left untouched, a local-gate
failure, or a red CI) reported by name with the reason. The skill never
guesses-and-pushes a semantic merge.

## Considered Options

Each was rejected, and each carries the condition that would bring it back.

**Front-of-loop prevention.** Guard the queue in `afk.sh` from picking tickets
that would collide, so the batch never goes stale against itself. Rejected
because the hotspot files are what nearly every UI ticket touches, so an honest
overlap guard would starve the batch to one ticket a run - which is stacking in
disguise, already rejected in ADR-0009. Revive if the app grows enough
independent surface area that tickets stop converging on the same files.

**Unattended auto-healing.** Promote the healer to a `/loop` or a `scripts/`
executable that heals without a human present. Rejected because it is real
machinery that re-pushes agent work which still needs human review, buying
little over a sharp manual tool the operator runs where they already are.
Revive if the operator stops reviewing between merges.

**Rebase instead of merge.** Rejected because it force-pushes an already-pushed
branch, fighting ADR-0006 and the repo's no-force-push discipline. Revive under
the same condition ADR-0006 names for rebase merge: a branch carrying a sequence
of commits each independently meaningful on `main`.

**Heal-all-then-watch-CI.** Heal the whole batch in one pass and wait on every
pull request's CI together. Rejected because strict up-to-date re-stales the rest
of the batch the moment one merges, wasting the CI just spent on them. Revive if
the operator would merge a whole batch without re-reviewing between merges.

**An automated test harness for the skill.** The deliverable is markdown agent
instructions and this record - there is no pure function or new code seam to
unit-test. Stubbing `gh` and `git` would assert the easy half (which commands
run) while leaving the real question untested: whether a session produces a
correct resolution and the right bucketing. This is exactly why ADR-0009
rejected a harness for `afk.sh`; the seam here is the same staged manual
end-to-end. Revive if the skill grows logic whose correctness is not observable
from a real run.

**Adding the healer's vocabulary to the glossary.** Heal, stale pull request,
batch: these are workflow terms, not domain terms, and `CONTEXT.md` is a pure
domain glossary. ADR-0009 already set the precedent of keeping the loop's
vocabulary out of it. Revive if healing ever becomes something the product
itself models.

## Consequences

The morning session gains one repeatable procedure in place of an ad-hoc "fix
broken PRs" prompt that was different every time, gated nothing before pushing,
and left no consistent record of which pull requests were healed cleanly and
which need a human. The final summary - healed and green, healed and awaiting
CI, or needs you and why - is that record.

The strict up-to-date requirement (ADR-0006) and the human merge gate (ADR-0009)
are unchanged; this tool serves them and does not move them. The security
posture is preserved because the skill runs in the operator's own session:
agent-authored change still waits at the gate for a human to read, and the
healer produces resolutions there rather than moving the boundary.

The procedure itself lives in the `heal-stale-prs` skill, not in `AGENTS.md`:
this is a human-triggered tool the operator invokes, not a rule an autonomous
loop agent follows. Anyone proposing unattended healing, a rebase-based
resolution, or a queue-time overlap guard should read this first.
