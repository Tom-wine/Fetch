'use client'

import * as React from 'react'

/**
 * A CSS breakpoint, readable from React.
 *
 * Used only where a layout has to be a DIFFERENT COMPONENT rather than a
 * differently-styled one — a form that is a panel on a wide screen and a dialog on a
 * narrow one. `lg:hidden` cannot do that: a Radix dialog that is merely hidden still
 * mounts its overlay, traps focus and locks scrolling, so the wide layout ends up
 * dimmed behind an invisible modal.
 *
 * Everything that is genuinely just styling stays in Tailwind. This is the exception,
 * not a second responsive system.
 *
 * `useSyncExternalStore` rather than an effect: the server has no viewport, so the
 * server snapshot is always `false` and the real value arrives on the first client
 * render instead of a frame later.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )

  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    // No viewport on the server. Rendering the narrow layout first is the safe
    // default: it is the one that works at every width.
    () => false,
  )
}

/** Tailwind's `lg` breakpoint. */
export const LG = '(min-width: 1024px)'
