# The repository is public deliberately, and its visibility is load-bearing

This repository is public because two things it relies on are free only while it
is. GitHub repository rulesets are free on public repositories and require
GitHub Pro on private ones, and GitHub Actions minutes are unlimited on public
repositories against a monthly allowance on private ones. Visibility is
therefore not a presentation choice about who may read the code. It is the
setting the merge gate and the CI budget both hang off, and it is changed from a
page that mentions neither.

## Going private disables the merge gate silently

On 7 August the repository was flipped from public to private. Nothing reported
an error, no setting was edited, and no file changed. The `default` ruleset
stayed stored and `ACTIVE`, still carrying `REQUIRED_STATUS_CHECKS` with the
context `Lint, typecheck and test`, along with `PULL_REQUEST`, `DELETION` and
`NON_FAST_FORWARD`, and it stopped being enforced. The configuration survived;
the enforcement did not.

The only symptom was a missing check on the pull request page. Reading the
ruleset back confirms nothing, which is what makes this worth a record: GraphQL
returns the stored rule intact, and so does the REST endpoint that lists
rulesets, because both answer "what is configured". Only the endpoints that
answer "what applies to this branch right now" tell the truth, and they answer
`403 Upgrade to GitHub Pro or make this repository public`:

```
gh api repos/rameezk/wheel-of-meals/rules/branches/main
```

Rules on a public repository, a `403` on a private one. That request is the
check, and there is no other; a settings page showing an `Active` ruleset shows
it either way.

The gate was genuinely working beforehand, which is what ruled out a broken
workflow. PR #45 enabled auto-merge at 13:27:43 on 5 August, its CI run
completed at 13:29:16, and it merged at 13:29:18 - auto-merge held it for the
full run. GitHub offers auto-merge at all only when a required check or a
required approval exists, and
[ADR-0006](0006-main-is-squash-only-and-unversioned.md) keeps required approvals
at `0`, so the offer itself was evidence of the required check. The ruleset was
last modified on 4 August at 12:46 and has not been touched since, so nothing in
the repository's own history caused the change.

What was lost is larger than one check. The chain runs visibility to ruleset
enforcement, to the merge gate, to ADR-0006's "a failing check holds the pull
request unmerged, which is what makes walking away safe", to the safety story
[ADR-0009](0009-the-afk-loop-runs-agents-up-to-the-human-gate.md)'s loop
operates under. `allow_auto_merge` is enabled, so auto-merge is the one path
where the human click lands before the check result exists: without the required
check, the click merges immediately and the review the loop stops at is the only
gate left. Direct-push rejection, force-push protection and branch-deletion
protection go at the same moment and just as quietly - `AGENTS.md` says the
ruleset rejects a direct push, and while private that sentence is false. Every
link in that chain is invisible from the tree, which is why this record exists.

## The Actions budget goes too

Public repositories get unlimited GitHub Actions minutes. A private repository
on the Free plan gets 2,000 per month, and on Pro 3,000.

The measured cadence overruns both. In its first 3.1 days the repository ran 63
workflow runs totalling 198 minutes, about 1,900 minutes per month, and that was
before #60 moved CI into the devshell and roughly doubled run length - from
1m45s on `actions/setup-node` to about 3m50s warm and 6m06s cold. Projected
forward that is 3,500 to 4,000 minutes per month. Going private would exhaust a
Free allowance in the second week and a Pro one before the month ended, and the
first sign would be CI refusing to start.

This number is recorded because it is the price of a future flip, not because it
needs acting on now. Public makes the budget unlimited, so the overrun stops
existing.

## The remedy, if the repository ever must go private

GitHub Pro. The `403` names both options and they are the only two: stay public,
or subscribe. Pro restores ruleset enforcement and raises Actions to 3,000
minutes per month, which the cadence above still overruns, so a flip to private
costs a subscription and a CI budget conversation rather than a subscription
alone. Recording that here means the next flip is costed in advance instead of
discovered from a missing check.

## Considered Options

**Subscribing to GitHub Pro and going private now.** Rejected because public
costs nothing and restores everything: required checks, direct-push rejection,
force-push and deletion protection, and unlimited Actions minutes, together and
for free. The exposure that privacy would avoid had already happened - the
contents were public from 4 August until the flip - so paying for privacy now
buys a property the repository no longer has. Revive if the repository ever
holds something that must not be read, at which point Pro is the mechanism and
the Actions arithmetic above is the second half of the bill.

**Staying private and accepting an unenforced ruleset.** Rejected outright. It
leaves a stored ruleset reading back as `ACTIVE` while enforcing nothing, which
is worse than having no ruleset: every document that reasons from the gate,
including ADR-0006 and ADR-0009, silently becomes wrong. If the gate is ever
deliberately given up, the ruleset is deleted and those documents are amended in
the same change, so the tree stops claiming a protection that is not there.

**A CI check that asserts the repository is public.** Rejected on the ground
ADR-0006 already settled for configuration drift: "machinery to guard them would
exceed the thing it guards". The check would also need a token with repository
administration scope to read what it asserts, and it runs on Actions minutes -
the resource whose exhaustion is the other half of this record. This record is
the control. Revive under ADR-0006's condition, which is the configuration being
found changed without a decision behind it, and note that it has now been found
so once.

**A sentence in `AGENTS.md` instead of a record.** Rejected because `AGENTS.md`
states rules for working in the repository and this is a decision with reasoning
behind it: what depends on visibility, what the failure looks like, what the
remedy costs. A rule with no room for the reasoning is what already failed here,
since `AGENTS.md`'s existing sentence about the ruleset gave a reader nothing to
check when it stopped being true.

## Consequences

Visibility joins the coupled set. ADR-0006 recorded that the repository settings
and the `default` ruleset move together because `squash` is the only method
permitted in both; visibility is the third member, and the one that can be
changed from a page mentioning neither of the others. ADR-0006's Consequences
now names it and points here, rather than restating this reasoning in a second
place where it can drift.

Nothing detects a flip. This record is the entire control, so a change of
visibility is a decision made against it rather than a settings click that
happens to be noticed. The two facts to confirm by hand after any change are the
`gh api .../rules/branches/main` call above returning rules rather than a `403`,
and a pull request page showing `Lint, typecheck and test` as required.

`ci.yml` is untouched and was never implicated. It still triggers on
`pull_request` and its job is still named `Lint, typecheck and test`, which is
the context the ruleset requires; confirming that was part of the diagnosis and
is what pointed at the ruleset rather than the workflow.

The API asymmetry is the transferable lesson. "What is configured" and "what is
enforced" are different questions, and on GitHub they are different endpoints
that can disagree without either being broken. A configuration read back
successfully is not evidence that it applies.
