# The repository declares its own toolchain, in a Nix flake

`flake.nix` names every binary this repository's shell scripts and npm scripts
invoke by name - `nodejs_24`, `coreutils`, `jq`, `gh`, `git`, `shellcheck` and
`lsof` - and `flake.lock` pins the nixpkgs they come from. `.envrc` is `use
flake` and nothing else, so direnv loads that shell on entering the directory
and drops it on leaving. A clone plus `direnv allow` plus `npm install` is the
whole setup.

The membership rule is what keeps the file honest: if `scripts/afk.sh` or an
npm script calls a binary by name, the flake supplies it. That makes the flake
and `afk.sh`'s precondition loop the same list, checked from two directions.
`npm` arrives with `nodejs_24` rather than as an entry of its own, and `lsof`
comes from nixpkgs rather than from macOS shipping `/usr/sbin/lsof`, so the
shell is the same on Linux. Node modules are below the line: `npm install` and
`npm ci` still govern `vite`, `wrangler`, `vitest` and `playwright`, and
Playwright's Chromium still comes from `npx playwright install` into a cache
outside nix entirely.

`claude` is the exception, and is called out as one. The agent binary the AFK
loop runs is installed by its own installer and is not in nixpkgs, so the
precondition loop keeps a message of its own for it while every other tool now
shares one. "The flake is the manifest" is therefore a near-truth, and the
README says so rather than implying otherwise.

The devshell has no `shellHook`. With direnv, entry happens on every `cd` into
the directory and on every change to `flake.nix` or `flake.lock`, so a hook that
ran `npm install` would fire a network install as a side effect of navigation,
mutate the working tree from a shell prompt, and fail confusingly when offline
or mid-rebase. Entering the directory does nothing but change the path.

## Considered Options

**Adding `coreutils` to the operator's home-manager configuration.** One line,
and it would have unblocked that night's run. Rejected because the blocker it
answers is not "this machine lacks `timeout`" but "the repository cannot
describe what it needs": `afk.sh` opened with a list of tools it dies without,
which is a dependency manifest with no supplier, and its `timeout` failure
told the reader to go and edit a different, private repository. A fix outside
the repository is invisible to the next machine. Revive nothing here - this is
the decision the record exists to make.

**Pinning nixpkgs on GitHub, or `nixpkgs-unstable`.** The conventional choice,
and it costs no hosted third party. Rejected because the operator's nix-darwin
configuration is already built from FlakeHub's weekly-delayed channel,
`https://flakehub.com/f/DeterminateSystems/nixpkgs-weekly/0.1`, so pinning the
same input means the devshell's tools resolve against a nixpkgs the machine
already has on disk, while a second, near-identical nixpkgs would fetch a second
copy of everything. The cost is a hosted vendor in the path of `nix develop` on
a public repository. It is bounded: `flake.lock` pins a resolved tarball by
hash, so a working clone keeps working even if the vendor does not, and the
escape hatch is swapping the one `inputs.nixpkgs.url` line for
`github:NixOS/nixpkgs/nixpkgs-unstable` and re-locking, with no other change to
the flake. Revive if the vendor's terms, availability or delay stop suiting the
repository, or if a contributor other than the operator ever builds this shell
often enough that the shared-store argument no longer holds.

**`flake-utils` or `flake-parts`.** The usual way to write `forAllSystems`.
Rejected for a single-shell flake with one input: `lib.genAttrs` over a
two-element list is a few lines and adds neither a dependency nor a second thing
to keep updated. Revive when the flake grows outputs whose plumbing is worth a
framework - packages, checks, a NixOS module.

**A consistent GNU userland.** Putting `coreutils` on the path swaps `tr`,
`cut`, `head`, `date` and `sort` from BSD to GNU inside the shell while `sed`,
`grep`, `awk` and `xargs` stay BSD, and the tidy answer is to add `gnused`,
`gnugrep`, `gawk` and `findutils` so the shell matches Linux. Rejected because
it solves a drift that does not exist. This was checked rather than assumed:
`afk.sh`'s `slugify` is the only code the swap reaches, and BSD and GNU produce
byte-identical output for it - including the `tr -c` with a character class,
where the two are most often said to diverge - as do `date` and `head`. `afk.sh`
runs only on the operator's machine, and CI only ShellChecks it, never executes
it. The accepted risk is that a future script relies on a GNU-only flag or on
BSD `tr` semantics and ShellCheck catches neither. Revive the moment anything in
`scripts/` runs somewhere other than the operator's machine.

**Re-executing `afk.sh` under `nix develop -c` when a tool is missing.** Would
make the precondition loop self-healing. Rejected because it wraps a working
direct path, and a script that re-executes itself moments before spawning a
network-sandboxed session is markedly harder to reason about when a run has gone
wrong. The loop stays a guard that explains, not one that repairs: nothing
forces `afk.sh` to run inside the devshell - `bash scripts/afk.sh` from a plain
shell, or a scheduled job, both bypass direnv - and a guard is worth most
exactly there.

**Adding devshell, flake and direnv to the glossary.** Rejected on the ground
[ADR-0009](0009-the-afk-loop-runs-agents-up-to-the-human-gate.md) already
settled for queue, claim and session: `CONTEXT.md` describes what the product
models, and these describe how the repository is worked on. Revive under the
same condition, which is that the product starts modelling them.

## Consequences

`.nvmrc` still says `24` while `flake.nix` says `nodejs_24`, and neither is
obviously authoritative. The duplication is deliberate and temporary: CI's
`actions/setup-node` still reads `.nvmrc`, and moving CI into the devshell is a
CI change that does not belong in the same pull request as the flake it depends
on. Issue #60 runs CI inside `nix develop` and deletes `.nvmrc`, and until it
lands, a reader should treat the flake as the intent and `.nvmrc` as the thing
CI happens to read. That interval is the reason this record is written now
rather than deferred to the successor.

Updating `flake.lock` is human work and stays off the ready queue. An unattended
session runs with no network and is now told not to run `nix`, `nix develop` or
`direnv` - the rule sits in `AGENTS.md` and in the `session_rules` heredoc in
`afk.sh`, in the same shape as the existing rule about `gh` and `git push`. A
ticket that changes `flake.nix` edits the file and leaves evaluation to the
operator, which is also why the ticket that introduced the flake was worked by
hand: it could not have generated the lock file it was writing, nor entered the
shell to check that it evaluates.

`direnv allow` is per-clone and untracked. That is direnv's design - trusting a
file is a property of a checkout on a machine, not of the repository - and the
README documents it rather than working around it. `.direnv/` is added to this
repository's `.gitignore` even though the operator's global excludes already
cover it, because the repository already ignores its own tool artifacts rather
than assuming a contributor's machine configuration.

Nothing new is tested. The flake's correctness is "the shell builds and the
tools are on the path", and a test asserting that asserts that nix works. The
one executable change - the reworked precondition loop - is covered by
`shellcheck scripts/*.sh` in `npm run lint`, which is already wired into CI, and
which now finds its ShellCheck in the devshell on a developer machine.
`nix flake check` is not added either: with a single `devShells.default` output
it evaluates the flake and little else, and its value arrives for free with #60,
where CI builds the shell on every job.
