# A Spin is ephemeral

The only thing this system stores is the [[Household]] - its [[Meal Bank]],
[[Cooking Days]] and [[Slug]]. A [[Spin]] is not stored. It happens in the
browser, and two people spinning the same Meal Bank get different [[Week]]s.

This looks wrong at first glance, because the point of sharing a [[Slug]] is that
the family sees the same thing. What the family shares is the *Meal Bank*, not
the Week. The app answers "what could we cook?"; the commitment to what we are
actually eating gets copied out into whatever to-do list the household already
uses.

## Consequences

There is no notion of a current week, a past week, or a meal history. Any future
feature that depends on history - "don't repeat what we had last week", or
weighting Meals by how recently they came up - requires storing Spins first. That
is additive: nothing here has to be undone to add it.

A Week on screen is not affected when someone else edits the Meal Bank, because
it only ever existed in that browser.
