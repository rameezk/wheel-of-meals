# The Meal Bank ships whole, and is never paginated

`GET /api/households/:slug` returns the [[Household]] with its entire
[[Meal Bank]] in one response, and the client holds all of it in memory. The
Meal Bank page filters that array in the browser as the cook types. There is no
page parameter, no cursor, no search endpoint, and no windowed list.

Five caps are what make this safe, and they are the load-bearing figures of this
record rather than incidental validation: 500 [[Meal]]s to a [[Meal Bank]], 500
characters of description on a Meal, and, on its [[Recipe]], 1,000 characters of
[[Source]], 1,000 of [[Ingredients]] and 2,000 of [[Method]]. A Meal's name adds
at most 100 more. A Meal carrying all of it is roughly 4.7 KB of JSON, so the
worst Bank anyone can construct is around 2.3 MB. It is read back in one indexed
lookup by Household, already ordered by lowercased name, and the caps are
enforced in the Worker rather than assumed here.

That worst case is a Household that has written a full recipe out 500 times, and
no real Bank comes near it: almost every Meal is a name and a description, a
handful carry a Source, and the few that are written out land in the tens of
kilobytes together. The megabyte the first three caps stayed under was the guard;
with a Recipe now holding its Ingredients and its Method, it becomes the trigger
instead. A real Household measured shipping more than a megabyte is the signal to
revisit the options below, not to quietly shave a cap.

The 500-Meal cap exists as a guard on the payload and the database, not as a statement
about how many Meals a Household is allowed to like. Nothing in the product
tells the cook there is a limit, because no real Bank approaches it - a
Household that cooks something new every week for a decade lands near 500.

## Considered Options

**Server-side pagination.** The obvious shape for an unbounded list, and the
reason this record exists: a reader who sees the whole Bank rendered at once
will reach for it in good faith. It would silently break the filter. A filter
over one page of 50 finds a Meal only if that Meal happens to be on the page
the cook is looking at, so "type `butter`, see every butter dish together" -
the whole reason the filter earns its place - stops being true, and stops being
true quietly rather than loudly. Revive only together with the option below,
never on its own.

**Server-side filtering.** Fixes what pagination breaks, at the cost of a round
trip per keystroke, a debounce, a loading state, a race between in-flight
responses, and an offline story where the current one narrows a list that is
already on the device. It buys nothing at 500 Meals. Revive if the cap is ever
lifted far enough that the whole Bank stops fitting in one response.

**Virtualising the list.** Renders only the visible rows while still holding the
whole Bank client-side, so the filter survives. Rejected because the problem it
solves has not appeared: 500 rows of two lines each is within what a browser
renders comfortably, and virtualisation costs correct scroll restoration,
keyboard navigation, and find-in-page. Revive if a real Bank near the cap
measurably janks on a mid-range phone - measured, not assumed.

## Consequences

The filter is instant and works with no network, because it never leaves the
device. Nothing about typing in it can fail.

Raising any of the five caps is not a one-line change to a constant. It is a
decision about this record, and each number in the Worker should be read as the
load-bearing assumption it is.

The Household payload grows with the Bank, and the Meal Bank page is the only
place that renders all of it. Anything that starts rendering the whole Bank
somewhere else - a picker, a second list - inherits that cost and should be
weighed against this record rather than around it.
