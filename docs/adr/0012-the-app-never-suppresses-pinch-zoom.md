# The app never suppresses pinch zoom

Every page in the app can be pinched to any scale the reader wants. The viewport
meta tag carries `width=device-width, initial-scale=1.0` and nothing else - no
`maximum-scale`, no `user-scalable=no` - and it stays that way.

This is an accessibility commitment, not a styling preference. A reader with low
vision zooms to read, and taking that away to smooth over somebody else's
annoyance fails WCAG 1.4.4. It is not a trade to make.

The record exists because there is a bug that pushes hard towards breaking it.
Mobile Safari zooms the page when a text field is focused whose text computes
below 16px, and every widely cited fix for that is to lock the viewport. It is
the wrong fix twice over: it removes pinch zoom, and mobile Safari has
historically ignored the lock anyway.

The right fix is to remove the reason for the zoom. Safari zooms because the
field really is too small to type into comfortably, which is a fair reading of
the page rather than a misbehaviour. So the shared field style declares its own
size at the 16px base, unconditionally - no breakpoint, no `pointer: coarse`
query, no user-agent branch - and every text field in the app routes through it.

## Considered Options

**`maximum-scale=1` or `user-scalable=no` in the viewport.** The first result for
the symptom, and the reason this record is written down rather than left
implicit. Rejected: it fixes the focus zoom by removing zoom, which is the
accessibility failure above. Never revive.

**Sizing only below a breakpoint.** Appealing because the report came from a
phone. Rejected because an iPad sits above the small breakpoint, so the fields
that zoom on an iPad would keep zooming. It fixes the device that happened to be
tested rather than the class of bug.

**A `pointer: coarse` media query.** Narrower and still wrong for the same
reason as the breakpoint - it scopes the fix to a guess about the device instead
of stating what a field is. One unconditional declaration is smaller and cannot
be wrong about hardware.

**Sizing the fields at a pixel value.** Rejected in favour of the `base` step of
the type scale, so a reader who has raised their browser's text size keeps that
increase instead of having it overridden to exactly 16px.

## Consequences

Field text, and therefore field height, is slightly larger everywhere, desktop
included: the landing page, the first-run guide, the Meal Bank and Settings.
That is accepted rather than worked around.

The labels wrapping those fields keep their smaller size, so a label and its
field are deliberately different sizes. Levelling them up looks like a tidy-up
and would restore the bug, since a field nested inside a small-text label
inherits 14px and starts zooming again. That is the specific reason the shared
style declares a size at all - inheritance is what broke it.

`e2e/fields.spec.ts` walks every screen that holds a field and asserts the floor
across all of them without naming any. A field added later is covered by it
without anyone remembering this record exists.

Buttons are untouched. The behaviour is about focusable text entry, and a small
button is not a field.
