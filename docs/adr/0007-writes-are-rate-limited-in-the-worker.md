# Writes are rate limited in the Worker

Creating a [[Household]] is unauthenticated by design - ADR-0002 makes the
[[Slug]] the only credential, and a Slug cannot be presented before the thing it
identifies exists. So `POST /api/households` is an open write endpoint on the
public internet, and the caps that arrived with the [[Meal Bank]] work bound how
big one Household gets, not how many of them a crawler can make.

Every write is counted in the Worker, against the caller's IP, through
Cloudflare's rate limiting bindings. The two limits are declared in
`wrangler.jsonc`:

- **Household creation**, 20 per minute. A person creates one Household, ever,
  and clicks twice when they are unsure it worked.
- **Every other write** - naming a Household, changing its [[Cooking Days]],
  adding, editing and deleting [[Meal]]s - 120 per minute. Typing a Meal takes
  seconds, so a household at full tilt is nowhere near two writes per second.

Both sit far above anyone cooking and far below the thousands per minute that
would make a crawler's effort worthwhile.

The headroom above one person's use is deliberate, because the key is an IP and
an IP is not a person. Behind carrier-grade NAT or an office router, thousands of
unrelated people share one. The first draft of this decision set creation to 5
per minute and the end-to-end suite found the flaw immediately: eleven browsers
on one address exhausted it in half a minute. Real users behind a shared address
would have hit the same wall, and unlike the test suite they would have had no
way to know why.

## The rules live where the Worker lives

The acceptance criterion was that the rules be recreatable from the repository
rather than clicked into a dashboard. A binding in `wrangler.jsonc` is stronger
than recreatable: it is *applied* by `wrangler deploy`, so the deployed limits
cannot drift from the ones in git without someone editing git. There is no
Terraform, no API script, and no runbook to follow, because there is no second
place holding the truth.

It also buys the response. A refused write returns `429` with the same
`{ error, message }` body every other refusal in this app uses, so the client's
existing `Refusal` path renders it and the user reads a sentence rather than
meeting a block page. `createHousehold` had been the one call that discarded the
server's message; it no longer is.

## A request with no `cf-connecting-ip` is not counted

The key is the caller's IP, taken from `cf-connecting-ip`. Cloudflare sets that
header at the edge and overwrites whatever the client sent, so in production it
is always present and cannot be forged. Its absence therefore means the request
did not come through the edge at all: `vitest`, or a Worker running locally.

Those requests pass through uncounted. The alternative - a shared fallback
bucket - would put every local request and every test in one counter, so a test
suite would exhaust the limit and fail whichever test happened to run last. That
is a fail-open on a path that does not exist in production, in exchange for
limits that are exercised by real keys in the tests rather than mocked away.

## What this does not stop

A minute is the longest window the binding offers, so these limits bound a burst
and not a patient crawler. Twenty creations a minute, sustained all day from one
address and never once tripping the limit, is tens of thousands of [[Household]]s
- and the per-location counters below multiply it again for anything distributed.

That residual is accepted rather than overlooked. Stopping it needs state this
app does not keep: a daily counter per address, which is a Durable Object, a
cron, and a second thing to reason about, bought against a threat that has not
appeared. The guard here is against the failure mode the ticket names - an
endpoint found by a crawler and hammered - and the slow version stays visible in
the D1 row count on the dashboard, which is the signal that would justify
building more.

## Considered Options

**Cloudflare WAF rate limiting rules.** The obvious reading of "Cloudflare rate
limiting rules", and where this ticket started. On the Free plan they give one
rule with a ten-second window, and a refused request gets Cloudflare's block
page - an opaque failure, which the acceptance criteria ruled out. Recording them
in the repository would also have meant Terraform or an API script whose only job
is to reproduce a handful of numbers. Revive if abuse ever needs stopping *before*
it reaches the Worker, at which point the outer net and the inner one both exist
and are allowed to disagree.

**Turnstile.** Held in reserve deliberately. A captcha in front of Household
creation is paid for by every real user on their first visit, to stop abuse that
has not happened. Revive when it has.

**Keying by [[Slug]] instead of IP.** Would protect one Household from a
runaway client but not the account from a crawler creating Households, which is
the failure being guarded. It also cannot key Household creation at all, since
no Slug exists yet.

## Consequences

Counters are per Cloudflare location and best-effort, not a global ledger. A
caller spread across enough locations gets a multiple of the stated limit. The
limits are set for the order of magnitude, not the exact number, so this changes
nothing about what they stop.

Adding a write endpoint gets rate limiting without anyone remembering to ask for
it: the middleware counts by HTTP method, so any new write is limited the moment
it is routed - and a write to a path that routes nowhere is counted too, so
probing for an unmetered endpoint costs the prober the same quota as using one.
An endpoint that should be metered *separately* - not merely limited - is the
only case that needs a change here.

The two namespace ids in `wrangler.jsonc` are account-wide. Another Worker on
this account reusing `1001` or `1002` would share these counters, which is the
binding's documented behaviour and worth knowing before a second Worker appears.
