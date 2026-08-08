# Every pull request gets a preview, on a second Worker and a shared database

Every pull request uploads a version of the Worker to a separate
`wheel-of-meals-preview` service and comments a URL at it. The diff says what
changed; it does not say how the app feels, and
[ADR-0008](0008-the-spin-always-plays.md) makes an animation the centrepiece of
this product, which no screenshot reviews. Overnight runs of the loop in
[ADR-0009](0009-the-afk-loop-runs-agents-up-to-the-human-gate.md) leave a stack
of pull requests waiting at the human gate, so the reviewer's cost of opening
one is the thing worth lowering.

## A named environment, not a second configuration

`env.preview` in `wrangler.jsonc` deploys as `wheel-of-meals-preview`. The point
of a separate service rather than preview versions of the production Worker is
that a preview version of production sits in production's version list, one
dashboard click from being promoted to live. A version of a different Worker
cannot be promoted onto the production hostname at all, whatever is clicked.

The preview environment sets `workers_dev: true` and declares `"routes": []`.
The empty list is load-bearing rather than decoration: `routes` is one of the
fields a named environment *does* inherit, so an absent `routes` under
`env.preview` is not "no routes" but production's custom domain, and deploying
the environment would reassign `wheel-of-meals.rameezkhan.dev` away from the
production Worker. Wrangler warns about exactly this at upload. With the empty
list, production keeps its custom domain and gains no `workers.dev` address, so
[ADR-0004](0004-the-hostname-is-permanent.md) is untouched: the permanent
hostname is still the only one a [[Household]] link can be built on.

Wrangler does not inherit bindings into a named environment, so
`d1_databases` and `ratelimits` are redeclared in full under `env.preview` -
omitting them uploads cleanly and fails at runtime, which is the worst place to
find out. `assets` is inherited; that was read off
`node_modules/wrangler/config-schema.json`, where every non-inherited field
carries a note saying so and `assets` carries none, rather than assumed. A
preview serving the API and no frontend would have been a miserable thing to
debug.

`wrangler versions upload` refuses to upload a version of a Worker that does not
exist, which every first run of this job is. The job deploys the environment once
to bring the Worker into being and then uploads, rather than leaving a manual
`wrangler deploy --env preview` written down somewhere for the operator to
remember. It is guarded on `wrangler deployments list`, so it is a bootstrap
rather than a deploy on every pull request: the root `workers.dev` address is
whatever created the Worker, and the aliased URLs are the ones anybody is given.

The URL is stable because the upload passes `--preview-alias pr-<number>`, so
one comment never goes stale and later pushes post nothing. Cloudflare keeps the
1000 most recently deployed aliases per Worker and evicts the least recent,
which is why there is no teardown workflow here.

## The database is shared, and that is the accepted trade

One permanent preview D1 serves every pull request. The alternative - a database
created and destroyed per pull request - needs create and delete API calls, a
teardown workflow that must run on close, and an answer for the orphans left
when it does not run: a control plane for a dinner app.

The cost is real and is accepted rather than mitigated. Migrations from pull
requests that are never merged accumulate in it, and two open branches touching
the same table can leave it in a shape neither expects. This app has produced two
migrations in its lifetime. When it bites, it is fixed by hand.

A seed runs after migrations on every preview: one fixed [[Household]] on a known
[[Slug]], a dozen [[Meal]]s, and non-default [[Cooking Days]], written to change
nothing when re-run. Each preview is a distinct origin, so nothing remembered in
`localStorage` carries between pull requests, and without a seed every review
would begin by typing a dozen meals in by hand. The seed names
`wheel-of-meals-preview` in the npm script that runs it, so there is no
invocation of it that reaches production.

## Considered Options

**A second Cloudflare account holding no production resources.** The strongest
option on the axis that matters, because the token in the preview job would then
be unable to name production at all - the containment would be structural rather
than a matter of which commands the workflow happens to run. Rejected because a
second account is a second bill, a second set of credentials to rotate, and a
second place to look when something is misconfigured, against a product with one
Worker and one database. Revive if this repository ever gains a second
contributor whose pull requests run this job, at which point the token stops
being reachable only by code the operator wrote or a loop the operator started.

**Gating the preview build behind a GitHub environment approval.** Would put a
human between agent-authored code and the Cloudflare token, restoring
ADR-0009's original claim exactly. Rejected because it costs most of the value:
the reason to build this is that the reviewer wants a live URL waiting when they
open the pull request, and an approval means the reviewer must first approve,
then wait for a build, before they can look. It would turn a preview into a
thing you request.

**Cloudflare Workers Builds instead of GitHub Actions.** Builds connect the
repository to Cloudflare directly and would issue no long-lived token into CI.
Rejected because this repository declares its toolchain in `flake.nix`
([ADR-0011](0011-the-repository-declares-its-own-toolchain.md)) and every job
runs in that devshell; Workers Builds supplies its own build image and its own
Node, which is precisely the second definition of the toolchain ADR-0011 exists
to prevent. Revive if Workers Builds ever runs a container the repository
specifies.

**Pointing the end-to-end suite at the preview URL.** Rejected because it would
be a third Playwright run against a database concurrent pull requests are
writing to, under a 20-per-minute [[Household]] creation limit
([ADR-0007](0007-writes-are-rate-limited-in-the-worker.md)). That manufactures
flakiness rather than finding it. The suite stays local per pull request and
against production after merge.

**Adding preview, alias and seed to the glossary.** Rejected on the ground
ADR-0009 already settled: these are workflow terms, and `CONTEXT.md` is
deliberately free of implementation concerns.

## Consequences

The preview job does not `needs: check`. A pull request whose tests fail is
often the one most worth looking at, and a failing test does not imply a broken
screen. That is deliberate, and it means a preview can exist for a branch that
would not merge.

Agent-authored code now runs in a job holding an account-wide Cloudflare token
before a person has read it, which narrows ADR-0009's claim that the agent has
no route to anything but the branch. ADR-0009 is amended to say so and point
here. The honest accounting is that `npm ci` in the existing deploy job already
runs untrusted transitive install scripts alongside that same token, so the
surface is not new - it moves from after the human gate to before it. What
remains true, and is the part worth keeping, is that nothing agent-authored
reaches the production hostname or the production database without a merge, and
the merge still needs a click.

Pull request comments now point at preview URLs, so this is harder to withdraw
than it was to add. The URLs are not durable - Cloudflare evicts aliases - but
they are linked from a permanent record of the review.
