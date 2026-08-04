# `main` is squash-only, and nothing is versioned

Every pull request lands on `main` as exactly one commit. The commit subject is
the pull request title and the commit body is the pull request body, taken from
GitHub deterministically rather than from however many commits the branch
happened to contain. Squash is the only merge method the repository offers and
the only one the `default` ruleset permits, so the mixed history this repo
carries today - PR #5 squashed, PRs #19, #20 and #21 landed as merge commits
dragging their stepping stones with them - cannot recur by accident.

The unit of history is now the unit that is actually built, reviewed and would be
reverted. A single revert backs out a whole feature, a `git bisect` step lands on
a shippable state rather than a half-built one, and `git log --grep` finds the
originating issue because `Fixes #N` travels from the pull request body into git.
Intermediate commits are not lost - they stay on the pull request page, which is
where they are useful during review and nowhere else.

Linearity is a consequence, not a rule. Squash-only makes it structural, so no
linear-history rule is configured; adding one would state the same constraint
twice and give a second place for it to drift.

## The merge experience

Auto-merge is enabled. The human gate stays exactly where it was - somebody reads
the diff and clicks - but the click no longer has to wait out a Playwright
browser install and an end-to-end run. A failing check holds the pull request
unmerged, which is what makes walking away safe.

`allow_update_branch` is enabled. The ruleset's strict up-to-date requirement is
kept, because with continuous deployment and no staging environment, `main` is
the first place a semantic conflict between two independently green pull requests
would otherwise surface. That requirement now costs one button instead of a local
fetch, rebase and push, and the merge commit the button adds to the branch is
discarded by the squash - catching up with `main` never pollutes `main`.

Branches are deleted on merge, so the branch list shows work in flight rather
than work completed.

## Versioning is dropped entirely

Semver communicates compatibility risk to a consumer who chooses when to upgrade.
This project has no such consumer: it is a continuously deployed site whose only
version is the tip of `main`. So `package.json` stays at `0.0.0`, no git tags are
created, no release tooling is installed, and no `CHANGELOG.md` is generated.
"What shipped between these two points" is derived on demand from the compare
view or `git log` rather than maintained as state that can drift out of step with
the history it claims to describe.

Conventional commit prefixes are kept as a human readability discipline, not as a
machine contract. Nothing reads them, so an occasional imperfect prefix costs
consistency and nothing else. They apply to working commits on a branch too -
one rule, no context boundary to remember.

## Considered Options

Each was rejected, and each carries the condition that would bring it back.

**Rebase merge.** Puts every stepping stone on `main` under a different set of
hashes, which is the tangle problem with extra confusion. Revive if a branch ever
carries a sequence of commits that are each independently meaningful on `main` -
which is a sign the branch should have been several pull requests.

**Merge commits.** What the repo did by accident, and the thing being removed.
Revive if `main` ever needs to record the integration of a genuinely long-lived
parallel line of development, such as a maintenance branch.

**Semver, git tags and release tooling.** Revive when an artefact appears that
someone pins - a published package, a versioned API contract, a downloadable
build. Explicitly _not_ when a collaborator joins: another person working on the
repo does not pin anything, and mistaking that for a versioning trigger is the
most likely way this decision gets undone for no gain.

**A generated `CHANGELOG.md`.** Would mean a bot writing commits to `main` and a
file that can disagree with the history it describes. Revive alongside semver, if
at all - a changelog serves the same pinning consumer.

**A CI job linting pull request titles.** Costs pipeline time on every pull
request to catch a mistake a human already sees while reviewing, and would
false-positive on a title containing a colon. Correcting the title during review
is free and happens while the title is still editable. Revive when pull requests
are merged without a human reading the title.

**Required approvals above `0`.** GitHub rejects self-approval and every pull
request here is authored by the repo owner, with no bypass actor configured.
Setting this to `1` would make `main` unmergeable outright. Revive when agents
run autonomously, at which point a separate bot identity authors the pull request
and a human approval becomes something that can actually be given.

**A CI check for configuration drift.** The repository settings and the ruleset
are set once and read back once. Machinery to guard them would exceed the thing
it guards. Revive if the configuration is ever found changed without a decision
behind it.

## Consequences

The repository settings and the `default` ruleset are now coupled: `squash` is
the only method permitted in both. Changing either alone leaves no legal merge
method and nothing can land on `main` at all, so they move together or not at
all.

A pull request title and body are permanent, and are written accordingly -
`AGENTS.md` states the rules. Detail stays in the issue, where it can still be
revised after the commit is written.

Existing history is left alone. The merge-commit tangles from earlier pull
requests stay where they are - `main` is deployed from and rewriting it for
cosmetics buys nothing - and `main` is linear from this change forward.
