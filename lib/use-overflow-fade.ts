'use client'

import * as React from 'react'

/**
 * The affordance for a strip that scrolls sideways.
 *
 * A ranked strip of club tabs is allowed to run off the edge — §9 rule 1 exempts it,
 * because wrapping twenty clubs onto four rows buries the toolbar below the fold. What
 * it is not allowed to do is run off the edge SILENTLY. The strip on `/accounts` ended
 * mid-chip after Chelsea with nothing to say there was more, so at 1440px half the
 * clubs did not exist as far as the operator was concerned.
 *
 * A mask that fades the overflowing edge says it in the cheapest possible way: the
 * content visibly continues past the boundary instead of being guillotined by it. It
 * appears only on the side that actually has more — both sides once the strip is
 * scrolled into the middle — so a strip that fits is untouched.
 *
 * A fade is not a control, so nothing here removes one: the strip still scrolls with a
 * wheel or a trackpad, and its buttons are still reached by Tab and by arrow keys.
 */

/** How much of an overflowing edge fades out. */
const FADE_PX = 28

export function useOverflowFade<T extends HTMLElement = HTMLDivElement>() {
  // A callback ref rather than useRef, because the strip is not always the element
  // this hook is first mounted alongside: ClubTabs renders a row of skeletons while the
  // counts load and the real strip only afterwards. A ref object would still be null
  // when the effect ran, and an effect with no dependencies never looks again.
  const [element, setElement] = React.useState<T | null>(null)
  const [edges, setEdges] = React.useState({ start: false, end: false })

  React.useEffect(() => {
    if (!element) return

    const measure = () => {
      const max = element.scrollWidth - element.clientWidth
      // A pixel of slack: sub-pixel layout leaves a fraction of overflow on strips
      // that visibly fit, and a fade over nothing reads as a rendering fault.
      const start = element.scrollLeft > 1
      const end = element.scrollLeft < max - 1
      setEdges((previous) =>
        previous.start === start && previous.end === end ? previous : { start, end },
      )
    }

    measure()
    element.addEventListener('scroll', measure, { passive: true })

    // Two observers, because the strip changes width for two unrelated reasons. The box
    // changes when the window does; the CONTENT changes when the data lands, and eight
    // club tabs replacing eight skeletons inside the same box fires no resize at all.
    const resize = new ResizeObserver(measure)
    resize.observe(element)
    const mutate = new MutationObserver(measure)
    mutate.observe(element, { childList: true, subtree: true, characterData: true })

    return () => {
      element.removeEventListener('scroll', measure)
      resize.disconnect()
      mutate.disconnect()
    }
  }, [element])

  const style = React.useMemo<React.CSSProperties>(() => {
    if (!edges.start && !edges.end) return {}
    const head = edges.start ? `transparent 0, #000 ${FADE_PX}px` : '#000 0'
    const tail = edges.end ? `#000 calc(100% - ${FADE_PX}px), transparent 100%` : '#000 100%'
    const mask = `linear-gradient(to right, ${head}, ${tail})`
    return { maskImage: mask, WebkitMaskImage: mask }
  }, [edges])

  return { ref: setElement, style }
}
