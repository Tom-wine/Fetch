'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { useLocale } from '@/lib/format/LocaleProvider'
import { formatDateTime, formatRelative, urgencyOf, type Urgency } from '@/lib/format/date'

/**
 * `in 3 days` / `2h ago` (§7 #29), with the §8.4 urgency ramp: inside 7 days a
 * kickoff reads danger, because that is the window where unsold seats become a loss.
 *
 * The absolute timestamp is always available in the title attribute — the relative
 * form is for scanning, not for deciding.
 */
const TONE: Record<Urgency, string> = {
  past: 'text-faint',
  urgent: 'text-danger-ink',
  soon: 'text-warning-ink',
  later: 'text-muted',
}

export function RelativeTime({
  value,
  /** Apply the countdown colour ramp. Off for "last checked", on for kickoffs. */
  ramp = false,
  className,
}: {
  value: string | Date
  ramp?: boolean
  className?: string
}) {
  const { settings } = useLocale()

  // Rendering `now` on the server and again on the client guarantees a mismatch,
  // so the relative form only appears after mount; SSR shows the absolute time.
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const absolute = formatDateTime(value, settings)
  if (!mounted) {
    return (
      <span className={cn('text-muted tabular-nums', className)} suppressHydrationWarning>
        {absolute}
      </span>
    )
  }

  const { text, daysAway } = formatRelative(value, settings)
  const tone = ramp ? TONE[urgencyOf(daysAway)] : 'text-muted'

  return (
    <span className={cn(tone, 'tabular-nums', className)} title={absolute}>
      {text}
    </span>
  )
}

/** The absolute half of a kickoff cell: `14/09/2026, 15:00`. */
export function DateTime({ value, className }: { value: string | Date; className?: string }) {
  const { settings } = useLocale()
  return (
    <span className={cn('tabular-nums', className)} suppressHydrationWarning>
      {formatDateTime(value, settings)}
    </span>
  )
}
