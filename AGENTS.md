# wheel-of-meals

Randomise your meals for the week.

## Workflow

- All work is committed to a branch and delivered through a pull request. Never
  commit directly to `main`, and never push - the human pushes the branch and
  opens the pull request with `gh pr create --fill`. The `default` ruleset
  already rejects a direct push, so this rule exists to stop you attempting it,
  not to create the constraint.
- Every pull request closes exactly one issue. If none exists, create one before
  starting the work.
- Use conventional commit prefixes on every commit.
- Until the pull request exists, the branch is exactly one commit. Amend it with
  each further change; never stack a second. `gh pr create --fill` takes its
  title and body from that one commit, and at two or more commits it falls back
  to the branch name and a list of subjects, losing everything below the subject
  line. Once the pull request is open its title and body belong to GitHub, so
  later commits are added normally - never amend or force-push a branch that has
  been pushed.
- That commit is the pull request, and after the squash it is the permanent
  record on `main`. Write it as one:
  - Subject: the conventional commit message. No issue number - GitHub appends
    the pull request number at the squash, and two bracketed numbers in one
    subject cannot be told apart.
  - Body: what changed and why it was built that way. The issue holds the spec;
    this holds the reasoning a later `git blame` needs.
  - Last line: `Fixes #N`. Nothing else closes the issue.
- `main` is squash-only. See
  [ADR-0006](docs/adr/0006-main-is-squash-only-and-unversioned.md).

## Agent skills

### Issue tracker

Issues and PRDs live as GitHub issues in `rameezk/wheel-of-meals`, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
