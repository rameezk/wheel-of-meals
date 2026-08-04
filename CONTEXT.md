# Wheel of Meals

Answers the weekly household question "what should we cook?" by keeping a shared
list of meals a household likes and drawing a random week's worth from it on demand.

## Language

**Household**:
The durable root of the system: the group of people who cook and eat together.
A Household owns a [[Meal Bank]] and a set of [[Cooking Days]], and is identified
by its [[Slug]]. It may also carry a display name, which is decoration only -
nothing is identified by it.
_Avoid_: family, group, account, user, team

**Meal Bank**:
The collection of [[Meal]]s a [[Household]] has accumulated. Grows over time and
is the thing a [[Spin]] draws from.
_Avoid_: list, pool, library, wheel

**Meal**:
A single dish a [[Household]] is willing to cook, held in its [[Meal Bank]].
A Meal is a name and, optionally, a free-text description. It is deliberately not
a recipe: it carries no ingredients, method, or timings.
_Avoid_: dish, recipe, food, item

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
