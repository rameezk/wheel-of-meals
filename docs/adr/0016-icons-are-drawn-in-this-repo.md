# Icons are drawn in this repo

An **Icon** is a small monochrome mark standing for an action or a state, drawn
as SVG, taking its colour from the text it sits with, and never the only carrier
of meaning - a text name always accompanies it, visible or screen-reader-only.
The share control that prompted this is the case in point: the box-and-arrow is
a hint, "Share the Recipe" is the promise, and the hint never ships without the
promise.

Every Icon is drawn to one house style, so a set assembled over months still
reads as one hand. A 24-unit square `viewBox`, roughly 1.5 units of stroke,
round caps and round joins, no fill, and a stroke of `currentColor`. Size is
expressed in ems, so an Icon is as tall as the text beside it and rises and
falls with it. Colour is never passed to an Icon: it inherits the colour of the
words it accompanies, which is what keeps it honest through a disabled state, a
focus ring, or a later change to the palette. An Icon that took a colour prop
could drift from its label; one that cannot, cannot.

They live together. `Icons.tsx` holds the whole set behind one small `Icon`
wrapper that fixes the `viewBox`, the stroke, the caps and the `aria-hidden`,
leaving each Icon to supply only its own geometry. One module is what lets the
set be seen at a glance and kept consistent - a stray fill or a square cap shows
up against its neighbours - and it is the seam we would cut along on the day we
stop drawing them.

## Drawn here, not installed

An icon library is a runtime dependency, and this codebase runs on Hono, React
and Zod and little else. Eight Icons do not earn a ninth name in
`package.json`, its transitive tree, its bytes on the wire, and its own upgrade
cadence. Drawing them here costs a few dozen lines and buys the thing a
dependency cannot give: Icons that match the app's own hairline borders, the
same stroke weight as the `border-stone-800` rows they sit among, rather than a
foreign set's idea of a stroke.

This is a decision to revisit, not a principle. When the set outgrows what one
module can keep consistent - when nobody can hold all the Icons in their head
and new ones start disagreeing with old ones on weight or optical size - take
the dependency deliberately, replace `Icons.tsx` with an adapter over it, and
let its maintainers carry the consistency we can no longer carry by hand. The
trigger is the set outgrowing the module, not the mild irritation of drawing the
next mark.

## The Mark is not an Icon

The plate at the top of every screen is the app's identity, and it is
deliberately in colour. It is a **Mark**, a different category with a different
job: an Icon stands in for an action or a state and defers to a label, while the
Mark stands for the whole app and answers to nothing. It is not to be tidied
into a monochrome outline to "match the Icons" later - matching would erase the
one thing it is there to do. The house style above governs Icons only. The Mark
is out of its scope on purpose.

## Named for meaning, not shape

An Icon is named for what it means, not what it depicts. The cog is `Settings`,
not `Cog`; the box-and-arrow is `Share`, not `BoxWithArrow`. A meaning name
survives a redraw - resketch the cog as three sliders and `Settings` still tells
the truth, where `Cog` would quietly start lying the moment the shape changed.
The name is a promise about the referent, and the referent is what stays put.

The one deliberate exception is the chevron, named for its shape. Pure
navigation furniture - the mark that says "there is more this way" - has no
domain meaning to name it after, and `Chevron` is honest where `More` or
`Forward` would overclaim. It is the exception that the rule is worth keeping:
name for meaning wherever a meaning exists, and only fall back to shape where
there is genuinely none.

## Consequences

The share Icon lives inside the share control rather than at its three call
sites, because it marks the action and not the screen. So the one Icon reaches
the control under the Week, the control in the Household footer and the control
on a Recipe at once, and a fourth share control would grow it for free.

Because an Icon is `aria-hidden` by definition, the label alone is the
accessible name and nothing about the tree an assistive technology walks
changes. That is also the gap the tests cannot close: an Icon that renders a
blank square passes lint and typecheck exactly as a correct one does, so the
drawings are checked by eye on the preview and only there.
