# The tests run against their own rate limits

ADR-0007 sets the production ceilings at 20 creations, 120 writes and 300 reads
a minute, and says the tests exercise them with real keys rather than mocking
them away. That held, and it was expensive: to watch a limit refuse anything, a
test has to clear it, so `rate-limit-reads.test.ts` fired 350 requests three
times over.

`SELF.fetch` in `@cloudflare/vitest-pool-workers` gets slower with every request
already made in the same isolate. Four identical 350-request bursts in one file
take 2.8s, 19.5s, 54.1s and 106.5s - per-request cost climbing from about 8ms to
about 300ms, so a file's total cost is roughly quadratic in the requests it
makes. It is not our middleware and it is not concurrency: the same requests
issued one at a time give the same curve, and a bare `SELF.fetch` to an unrouted
path with no `cf-connecting-ip`, reaching neither the limiter nor D1, degrades
identically.

The third burst is the one that crossed 90 seconds on a loaded runner. That test
timed out on `main` in the run that landed the file, and again on the next pull
request, while passing in 27 to 30 seconds elsewhere. A test that fails about
half the time teaches everyone to re-run CI rather than read it, which costs more
than the coverage was worth.

So `wrangler.jsonc` gains a `test` environment whose ceilings are 4, 6 and 8. A
burst that clears one is a dozen requests instead of 350, and the whole worker
suite's rate limiting now runs in about 135ms rather than three minutes.

## What the tests assert, and where

Splitting the numbers splits the claim in two, and the two halves fail for
different reasons.

**That the middleware behaves** is what can actually break when someone edits
`rate-limit.ts`: a burst past a ceiling is refused with a comprehensible 429,
reads and writes and creation are counted against separate ceilings, a request
with no `cf-connecting-ip` is not counted, a path that routes nowhere is. None of
that depends on the ceiling being 300 rather than 8, so those tests run against
the small ones and each takes about 10ms.

**That the production ceilings sit far above anyone cooking** is a claim about
configuration, and no amount of traffic through a test worker demonstrates it.
`config/ceilings.test.ts` reads `wrangler.jsonc` and asserts it directly - reads
above a busy week of page loads, writes above a long sitting at the Meal Bank,
creation above the few Households one family needs and below the write ceiling.
It costs 3ms and it is a stronger check than the burst it replaces, because it
fails when someone lowers a number rather than when someone happens to exceed it.

The old test names carried that second claim - "allows far more page loads than a
family ever makes" - while only ever proving the first. Now each name means what
it says.

## One place holds the numbers

`config/ceilings.ts` parses `wrangler.jsonc`. `vitest.worker.config.ts` reads the
`test` ceilings through it and passes them to the worker as a `CEILINGS` binding,
so a test says `justPast(ceiling.reads)` and never repeats a literal. Changing a
limit in `wrangler.jsonc` moves the tests with it.

The config tests also pin the properties that keep this arrangement honest: every
environment names the same three limiters, preview matches production so a
preview refuses what production refuses, and the test ceilings stay under 20 so a
burst past them cannot grow back into the quadratic.

## Consequences

The `test` environment is never deployed. It exists so `wrangler.jsonc` stays the
one place limits are declared; its D1 `database_id` is a placeholder because
miniflare never resolves it. `wrangler deploy` without `--env` is untouched, and
so is `--env preview`.

The worker tests no longer prove the deployed ceilings can be reached, only that
the mechanism refuses what is past them. That is the trade: the reachability of
300 was demonstrated against a local limiter that shares no code with the one at
the edge, and ADR-0007 already notes the real counters are per-location and
best-effort, so the demonstration was weaker than it looked.

The end-to-end suite is untouched and still runs against the production ceilings,
because `wrangler dev` takes no `--env`. That matters: ADR-0007 records that the
first draft set creation to 5 per minute and the end-to-end suite found the flaw
when eleven browsers on one address exhausted it. The guard that caught a ceiling
set too low for real traffic is the one that runs real browsers, and it is
unchanged.

The quadratic itself is not fixed, only avoided. `meals.test.ts` still adds 500
Meals to prove the Meal Bank cap and takes about 12 seconds locally for it. That
cap is a product promise rather than a knob, it has never flaked, and it sits far
enough inside its timeout to leave alone - but any new test that wants hundreds
of requests in one file should expect them to cost more than the last hundred
did.
