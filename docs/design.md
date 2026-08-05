# Wheel of Meals - v1 Design

The shared understanding reached before any code was written. Domain vocabulary
is defined in [`CONTEXT.md`](../CONTEXT.md); the decisions with lasting
consequences are recorded in [`docs/adr/`](./adr/).

## The problem

Every week a household asks itself the same question: what are we cooking? The
answer is usually there already - a set of meals everyone likes and has cooked
before - but recalling it under pressure on a Saturday is the hard part.

This app keeps that set in one shared place and draws a week from it at random,
so the question becomes a button rather than a conversation.

## What it is, and what it is not

It is a shared [[Meal Bank]] plus a randomiser.

It is not a recipe manager, a shopping list, a calendar, or a to-do list. The
committed week gets copied out into whatever to-do list the household already
uses; this app deliberately stops at the suggestion.

## Shape

A [[Household]] is the durable root. It holds:

- a [[Slug]] - four random food words, e.g. `banana-apple-delicious-sauce`
- a [[Meal Bank]] - the [[Meal]]s it cooks
- its [[Cooking Days]] - defaulting to Sunday through Thursday
- an optional display name

A [[Spin]] draws one [[Week]]: one Meal per Cooking Day, no repeats. A Spin is
never stored (ADR-0003).

## Access

Possession of the Slug is the entire security model - no accounts, no passwords,
no recovery (ADR-0002). Anyone with the link can read and edit.

- The Slug is four words from a curated food wordlist, chosen for unambiguous
  spelling so it survives being said out loud. Collisions are checked on
  generation.
- Creation warns bluntly that the link cannot be recovered.
- The last-used Slug is remembered locally and offered on the landing page as a
  button - never as an automatic redirect, so a second Household or helping a
  family member stays possible.
- Every page is `noindex`, and `robots.txt` disallows everything. An indexed
  Household page would be a total compromise of the access model.

## Rules

**The draw.** A pure function of a Meal Bank, a set of Cooking Days, and an
injected random source, returning a Week. No database, no clock, no ambient
randomness - which is what keeps it directly testable.

- No Meal appears twice in a Week. This is an invariant of the Week, not just of
  the initial draw, so a per-day re-spin must avoid the other days too.
- A Meal Bank holding fewer Meals than there are Cooking Days yields a Week with
  empty days. A thin bank visibly produces a thin week; it is not padded with
  repeats and the Spin is not blocked.
- Per-day re-spin is impossible when the Bank holds exactly as many Meals as
  there are Cooking Days. The control is disabled visibly rather than silently
  doing nothing.
- A Household must have at least one Cooking Day.

**The Meal Bank.** Add, edit, delete. Deletes are hard - a Meal is a name and
maybe a sentence, cheaper to retype than to manage an archive for.

- Exact duplicate names are rejected, case- and whitespace-insensitive. Two
  identical Meals would silently double that Meal's odds of being drawn, which is
  a bug nobody would ever diagnose.
- Deleting a Meal does not disturb a Week already on someone's screen, because
  that Week only ever existed in their browser.

**Concurrency.** Every mutation is a single scoped operation - add this Meal,
edit that one, delete that one. The client never sends the whole Bank, so two
people editing at once both simply succeed. Updates appear on refresh; there is
no polling and no live connection.

**Limits.** Meal name 100 characters, description 500, 500 Meals per Household.
Every write endpoint is rate limited per caller in the Worker - 20 Household
creations a minute, 120 other writes - see ADR-0007. Caps are set now because
retrofitting them means choosing between breaking existing data and not
enforcing the limit.

## Experience

**First run.** A new Household is empty, and the app is useless until the Bank
holds at least as many Meals as there are Cooking Days - so the empty state *is*
the onboarding. A one-time screen asks for the meals the household cooks often,
offering tappable suggestions alongside a free-text field. Suggestions are tapped
in by choice, never pre-filled: a Bank seeded with dishes the household does not
cook would have the app's first act be a wrong suggestion.

The optional Household name is never asked for here. It waits in settings.

**Spinning.** One wheel spin of food emojis, then all days reveal together with a
staggered card flip. Per-day re-spin gets a quick card flip rather than another
full wheel.

Five sequential wheel spins were rejected: a satisfying spin is 2-3 seconds, and
this runs every Saturday for years. Delight that repeats becomes latency.

The animation is skippable by tapping. It plays for everyone otherwise:
`prefers-reduced-motion` is deliberately not honoured, because the spin is the
product rather than decoration around it (ADR-0008).

Non-cooking days stay visible but greyed, so a week still looks like a week and
it is obvious the app has not forgotten Friday.

**Sharing a Week.** One button: the native share sheet where available, plain
text to the clipboard where it is not. Plain text with day labels pastes usefully
into any to-do app, notes app or message. A generated image was rejected - it is
the one format that cannot be pasted into a to-do list, which was the point.

## Stack

Vite + React + TypeScript + Tailwind as a static SPA, served by a Hono Worker
that also serves `/api/*`, with D1 underneath (ADR-0001). Zod at the API
boundary, so one set of types describes the row, the response and the props, and
is enforced at runtime rather than only at compile time.

Deployed by GitHub Actions on green: PRs run tests, only `main` deploys, and D1
migrations run as part of deploy rather than by hand.

## Testing

- **Unit** - the draw. All the invariants above live here, and the injected
  random source makes them deterministic.
- **Integration** - Hono routes against a real local D1 via
  `@cloudflare/vitest-pool-workers`. Slug lookup, caps and duplicate rejection
  are proven here.
- **End-to-end** - Playwright, one happy path only: create → first run → spin →
  five days. It exists to prove the Worker serves the SPA and the API from a
  single deploy, which is the least-proven assumption in the stack.

## Deliberately later

None of these are blocked by the decisions above; all are additive.

- **Persisted Weeks and history** - the prerequisite for "don't repeat last
  week".
- **Meal metadata** (tags, effort) - the prerequisite for a Spin that is anything
  other than uniformly random. Without it the draw cannot know it has served
  three curries in a row, or put a four-hour roast on a Tuesday.
- **Breakfast and lunch.**
- **Read-only share links** - a second Slug pointing at the same Household, no
  migration needed.
- **Pausing a Meal** instead of deleting it.
- **Deleting a Household** - abandoning one costs nothing, and a delete button
  with no authentication is a griefing vector.
