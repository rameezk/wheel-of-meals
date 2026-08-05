# The Spin always plays, and reduced motion is not honoured

The wheel plays for everyone. We do not consult `prefers-reduced-motion`
anywhere in the app: there is no media query in the stylesheet and no
`matchMedia` call in the client. Every [[Spin]] mounts the wheel, turns it for
2.2 seconds, and then flips the day cards in.

The wheel is not decoration around the [[Spin]] - it is the reason the app is
enjoyable to use, and the moment the whole product is built around. Suppressing
it leaves a list of [[Meal]]s that appears out of nowhere, which is a different
and worse product.

## Considered Options

- **Honour the setting but soften it rather than skip it** - keep a static wheel
  and cross-fade the [[Week]] in, so the moment survives without the rotation.
  Rejected because the still wheel is the part that carries no delight; what is
  left is a pause before a list, which costs the user time and returns nothing.
- **A stored per-[[Household]] preference to skip the spin.** Rejected as a
  worse re-implementation of a signal the operating system already carries. It
  covers one Household rather than the device, needs a settings row and a
  migration, and has to be discovered by someone who has already expressed this
  preference once, globally. If this option ever starts to look necessary, that
  is a reason to revisit this ADR rather than to build around it.
- **Gate the card flip but not the wheel.** Rejected as incoherent. Having
  shown someone a 2.2 second rotation, withholding a 420ms card flip is not a
  meaningful kindness, and it keeps a half-honoured setting alive in the code
  for no benefit.

## Consequences

This has a real accessibility cost and we are accepting it knowingly. Users who
set `prefers-reduced-motion` do so because motion provokes vestibular symptoms -
dizziness, nausea, migraine. They will see a full-screen rotation they asked
their device to prevent, every time they spin.

Their only relief is tapping to skip, which lands the [[Week]] immediately. That
relief arrives *after* the motion has started, which is the weakest part of this
decision.

`e2e/household.spec.ts` asserts that the wheel appears under
`emulateMedia({ reducedMotion: "reduce" })`. That test failing means someone has
restored the check - most likely in good faith, during an accessibility pass. The
failure is the intended signal, not a bug. Read this ADR before making it pass.
