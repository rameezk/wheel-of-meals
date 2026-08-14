# Wheel of Meals

Answers the weekly household question "what should we cook?" by keeping a shared
list of meals a household likes and drawing a random week's worth from it on demand.

## Language

**Household**:
The durable root of the system: the group of people who cook and eat together.
A Household owns a [[Meal Bank]] and a set of [[Cooking Days]], and is identified
by its [[Slug]]. It may also carry a display name, which is decoration only -
nothing is identified by it. The client never reaches a Household directly; it
goes through the [[Households Port]].
_Avoid_: family, group, account, user, team

**Meal Bank**:
The collection of [[Meal]]s a [[Household]] has accumulated. Grows over time and
is the thing a [[Spin]] draws from.
_Avoid_: list, pool, library, wheel

**Meal**:
A single dish a [[Household]] is willing to cook, held in its [[Meal Bank]].
A Meal is a name and, optionally, a free-text description and a [[Recipe]],
edited whole and saved in one act - its name, description and Recipe together,
never through separate doors. How the dish is actually cooked lives in the
Recipe a Meal may carry, and a Meal that carries none is complete as it stands.
_Avoid_: dish, recipe, food, item

**Recipe**:
How a [[Meal]] is cooked, kept with the Meal so nobody has to find it again.
Optional, and belongs to exactly one Meal - it is reached only through that Meal
and goes with it when the Meal is deleted. It holds up to three parts, each
optional on its own: a [[Source]], its [[Ingredients]] and its [[Method]]. A
Recipe with no parts filled in does not exist, so saving an empty one removes it.
It is written as part of the [[Meal]], in the one act that saves the Meal's name
and description, rather than on its own.
_Avoid_: instructions, details, notes, card, page

**Source**:
The link a [[Recipe]] came from: someone else's page, kept so the cook can open
it again. An `http` or `https` link, capped at 1,000 characters, and stored as it
was typed apart from a missing scheme, which is filled in as `https://`. Nothing
else about it is rewritten - a link that needs its query string keeps it.
_Avoid_: url, link, website, reference, citation

**Ingredients**:
What a [[Recipe]] calls for, as one piece of free text the cook typed rather than
a structured list of quantities. Capped at 1,000 characters, kept line for line
as it was typed, and never parsed - nothing here knows what a tablespoon is.
_Avoid_: shopping list, groceries, items, quantities

**Method**:
How a [[Recipe]] is cooked, as one piece of free text the cook typed rather than
numbered steps the system understands. Capped at 2,000 characters and kept line
for line as it was typed, so steps read as steps.
_Avoid_: instructions, directions, steps, procedure

**Cooking Days**:
The days of the week a [[Household]] cooks for itself, and therefore the days a
[[Spin]] fills. Defaults to Sunday through Thursday. Days outside this set are
days the Household eats out or orders in.
_Avoid_: active days, enabled days, schedule

**Spin**:
One draw of a [[Week]] from a [[Meal Bank]]. A Spin is ephemeral - it is never
stored, and two people spinning the same Meal Bank get different results.
_Avoid_: roll, shuffle, randomise, generate, plan

**Week**:
The result of a [[Spin]]: one [[Meal]] for each of the [[Household]]'s
[[Cooking Days]]. No Meal appears twice in a Week, so a [[Meal Bank]] holding
fewer Meals than there are Cooking Days yields a Week with empty days.
_Avoid_: menu, plan, schedule, meal plan

**Slug**:
The four-word, randomly generated, food-themed phrase that identifies a
[[Household]] and is the sole means of access to it. Possession of the Slug is
the only credential; there are no accounts and no passwords.
_Avoid_: id, code, key, link

**Households Port**:
The client's whole vocabulary for reaching a [[Household]]: create one, open the
one a [[Slug]] names, rename it, set its [[Cooking Days]], and add, save or
remove a [[Meal]] in its [[Meal Bank]]. A save is whole: it carries a Meal's
name, description and [[Recipe]] together, so there is one way to save one Meal
rather than a separate door for its name and another for its Recipe. It is a
client-side interface, not the
Worker's HTTP API: the HTTP API is merely what one [[Adapter]] happens to speak,
and the Port names what the client needs rather than what the Worker exposes. A
[[Spin]] is not on it, because a Spin is drawn in the browser and never leaves
it. Plural because it addresses any Household by [[Slug]] rather than standing
for one of them.
_Avoid_: client, service, repository, gateway, API

**Adapter**:
One implementation of the [[Households Port]]. There are two: one that speaks to
the Worker over HTTP, and one that holds Households in memory for the tests. The
client is written against the Port alone, so the two are interchangeable and the
tests need no Worker.
_Avoid_: driver, backend, provider, implementation, mock, stub

**Open Household**:
The [[Household]] this browser has opened with its [[Slug]], held for as long as
the cook is on it, together with everything they can do to it: rename it, set its
[[Cooking Days]], and add, save or remove a [[Meal]] in its [[Meal Bank]], where
a save is whole and carries the Meal's name, description and [[Recipe]] together.
Opening a Slug yields one of four things - a lookup still running, nothing found,
a lookup that failed, or an Open Household - and only the last carries the
Household and those verbs, so nothing further in is handed a Household that is
not there. It holds the [[Meal Bank]] and patches it as each change lands rather
than opening the Household again, and it is the one place a refusal from the
[[Households Port]] becomes a sentence a cook reads. It is also what remembers
the Household on the device, and what forgets a Slug that opens nothing.
_Avoid_: session, current household, context, store, state
