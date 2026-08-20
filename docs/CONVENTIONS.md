# Conventions

Hazards this codebase has already paid for. Each one cost a day to diagnose and is invisible in the
code that triggers it, so it is written down rather than left to be rediscovered.

---

## Dynamic routes do not read `params` in the page

**The hazard.** In the App Router `params` is a Promise. Awaiting it — or `use(params)`, which is
the same thing — suspends the SERVER render at the page. The client's hydration render does not
suspend in the same place, because the params are already resolved in the RSC payload. `useId`
encodes a node's position including its parent's child count, so a suspension anywhere in the tree
renumbers ids across the whole of it: a page-level `await` moves ids in the LAYOUT ABOVE IT.

It presents as a hydration mismatch far from its cause. The reported symptom was "useId differs
between server and client" in the sidebar's Collapsibles and the topbar's DropdownMenu, on what
looked like every route. Nothing in either component was wrong; both were downstream of the shift.
Attribute-only mismatches are the tell — no branch differed, so no element was added or removed,
and React reported no missing or extra nodes.

**The fix.** Dynamic pages are plain synchronous server components that never touch `params`. The
id is read with `useParams()` inside the client screen that already owns the rest of that route's
URL state — a synchronous value on both renders, no promise, no suspension. `metadata` is
unaffected: the pages stay server components. Never `suppressHydrationWarning`; the DOM is
genuinely mismatched and hiding the warning leaves it that way.

**How to verify.** Compare each DOM attribute against the same node's React fiber `memoizedProps` —
the DOM keeps the SERVER value, since React does not patch a mismatched attribute, while the fiber
holds what the CLIENT rendered. See `b4d53a4`.

---

## Third-party CSS imported into this project arrives unlayered

**The hazard.** Tailwind v4 puts this project's own CSS inside `@layer`. A stylesheet imported from
a package — `driver.js/dist/driver.css`, and every library that ships one — does not go into a
layer. **Unlayered rules beat every rule inside `@layer`, regardless of specificity.** A single
class selector from a dependency wins against anything the design system declares in a layer, and
no amount of specificity in the layered rule changes that; layer order is resolved before
specificity is even considered.

driver.js overrode the popover styling this way. The overrides were written in `@layer base`
alongside the rest of the design system, looked correct, and did nothing.

**The fix.** Put the overrides outside `@layer` too. They live at the END of `app/globals.css`,
after every layer, with a comment saying why. Same trick for any future library that ships a
stylesheet.

**How to verify — not by eye.** The failure does not announce itself as "your style was overridden".
The app looked plausible; what caught it was the contrast gate, reporting the popover title at
**1.12:1** against its background. Run `npm run check` (which includes `check:contrast`) and axe over
any surface a third-party stylesheet touches, and treat a contrast failure on a component you
styled as evidence that your rule never applied.
