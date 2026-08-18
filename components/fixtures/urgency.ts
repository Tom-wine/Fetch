'use client'

import * as React from 'react'

import { urgencyOf, type Urgency } from '@/lib/format/date'

const DAY = 86_400_000

/**
 * The §8.4 countdown ramp, as a hook.
 *
 * `urgencyOf` is the shared ramp from `lib/format/date` — the same one `RelativeTime`
 * uses — so a row's kickoff and its value-at-risk can never disagree about how
 * worried to look.
 *
 * It returns `null` until mount: urgency is derived from `Date.now()`, and rendering
 * a colour on the server that the client immediately recomputes is a hydration
 * mismatch. Callers treat `null` as "no ramp yet" and render the neutral tone, which
 * is also what a browser with JS disabled sees.
 */
export function useUrgency(kickoff: string): Urgency | null {
  const [urgency, setUrgency] = React.useState<Urgency | null>(null)

  React.useEffect(() => {
    setUrgency(urgencyOf((Date.parse(kickoff) - Date.now()) / DAY))
  }, [kickoff])

  return urgency
}

/** Text tone per urgency. `null` (pre-mount) reads as the neutral muted state. */
export const RAMP_TEXT: Record<Urgency, string> = {
  past: 'text-faint',
  urgent: 'text-danger-ink',
  soon: 'text-warning-ink',
  later: 'text-muted',
}

/** The matching fill, for the unsold-share bar under the figure. */
export const RAMP_FILL: Record<Urgency, string> = {
  past: 'bg-neutral-chip/40',
  urgent: 'bg-danger',
  soon: 'bg-warning',
  later: 'bg-neutral-chip/60',
}

export function rampText(urgency: Urgency | null): string {
  return urgency ? RAMP_TEXT[urgency] : 'text-muted'
}

export function rampFill(urgency: Urgency | null): string {
  return urgency ? RAMP_FILL[urgency] : 'bg-neutral-chip/60'
}
