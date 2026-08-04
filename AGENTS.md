# wheel-of-meals

Randomise your meals for the week.

## Workflow

- All work is committed to a branch and delivered through a pull request. Never
  commit directly to `main`. The `default` ruleset already rejects a direct push,
  so this rule exists to stop you attempting it, not to create the constraint.
- Use conventional commit prefixes on every commit, including working commits on
  a branch.
- The pull request title is the commit message - write it as one, prefix
  included.
- The pull request body becomes the commit body. Keep it to a sentence or two
  plus `Fixes #N`; the detail belongs in the issue.
- `main` is squash-only. See
  [ADR-0006](docs/adr/0006-main-is-squash-only-and-unversioned.md).

## Agent skills

### Issue tracker

Issues and PRDs live as GitHub issues in `rameezk/wheel-of-meals`, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
