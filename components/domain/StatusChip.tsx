import * as React from 'react'

import { cn } from '@/lib/utils'
import { upperSnake } from '@/lib/format/text'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * The §3.5 chip recipe, in one place.
 *
 *   dark:  bg-{hue}/15  text-{hue}      border-{hue}/25
 *   light: bg-{hue}/12  text-{hueInk}   border-{hue}/30
 *
 * `text-{hue}-ink` collapses onto the raw hue in dark mode (see globals.css), so a
 * single class set covers both themes and only the opacities differ.
 */

export type ChipTone = 'success' | 'warning' | 'danger' | 'violet' | 'neutral' | 'primary'

const TONES: Record<ChipTone, string> = {
  success: 'bg-success/15 text-success-ink border-success/25 dark:bg-success/15',
  warning: 'bg-warning/15 text-warning-ink border-warning/25',
  danger: 'bg-danger/15 text-danger-ink border-danger/25',
  violet: 'bg-violet/15 text-violet-ink border-violet/25',
  neutral: 'bg-neutral-chip/15 text-neutral-chip-ink border-neutral-chip/25',
  primary: 'bg-primary/12 text-primary-ink border-primary/25',
}

/** UNDELIVERABLE is the one outline variant — it needs to read as broken, not tinted. */
const OUTLINE = 'bg-transparent text-danger-ink border-danger/60 border-dashed'

export function Chip({
  tone = 'neutral',
  outline = false,
  className,
  children,
  ...props
}: {
  tone?: ChipTone
  outline?: boolean
  className?: string
  children: React.ReactNode
} & Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'>) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-sm border px-2 py-0.5 text-chip font-medium whitespace-nowrap uppercase',
        outline ? OUTLINE : TONES[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}

/** Listing statuses, from the §5 `Listing.status` union. */
export type ListingStatus = 'ACTIVE' | 'INACTIVE' | 'SOLDOUT' | 'PAUSED' | 'UNDELIVERABLE'

/** Account statuses, from the §5 `AccountStatus` union. */
export type AccountStatus = 'active' | 'needs_login' | 'needs_otp' | 'locked' | 'expired' | 'error'

interface StatusSpec {
  tone: ChipTone
  outline?: boolean
  /** Plain English, for the tooltip §9 rule 10 requires on every domain flag. */
  hint: string
}

const LISTING: Record<ListingStatus, StatusSpec> = {
  ACTIVE: { tone: 'success', hint: 'Live on the marketplace and buyable right now.' },
  INACTIVE: { tone: 'neutral', hint: 'Created but not published. No buyer can see it.' },
  SOLDOUT: { tone: 'danger', hint: 'Every seat on this listing has sold.' },
  PAUSED: { tone: 'warning', hint: 'Temporarily hidden by you. Reactivate to sell again.' },
  UNDELIVERABLE: {
    tone: 'danger',
    outline: true,
    hint: 'Sold, but the tickets could not be delivered. This needs attention today.',
  },
}

const ACCOUNT: Record<AccountStatus, StatusSpec> = {
  active: { tone: 'success', hint: 'Logged in with a valid session. Ready to buy.' },
  needs_login: { tone: 'warning', hint: 'The session expired. Log in again before the on-sale.' },
  needs_otp: { tone: 'warning', hint: 'The club sent a two-factor code that is still unanswered.' },
  locked: { tone: 'danger', hint: 'The club has locked this account. It cannot buy.' },
  expired: { tone: 'danger', outline: true, hint: 'The membership has lapsed and needs renewing.' },
  error: { tone: 'danger', hint: 'The last check failed. Retry, then look at the account.' },
}

export function StatusChip({
  status,
  kind,
  withTooltip = true,
  className,
}: {
  status: ListingStatus | AccountStatus
  /** Which union `status` belongs to — the two overlap in spirit but not in values. */
  kind: 'listing' | 'account'
  withTooltip?: boolean
  className?: string
}) {
  const spec =
    kind === 'listing' ? LISTING[status as ListingStatus] : ACCOUNT[status as AccountStatus]

  // Status values are a fixed chrome vocabulary, not user data, so UPPER_SNAKE is correct here.
  const label = upperSnake(status)

  const chip = (
    <Chip tone={spec.tone} outline={spec.outline} className={className}>
      {label}
    </Chip>
  )

  if (!withTooltip) return chip

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="rounded-sm">
            {chip}
          </span>
        </TooltipTrigger>
        {/* Plain sentence, never `// snake_case` — guardrail 2. */}
        <TooltipContent className="max-w-[260px] font-prose text-prose">{spec.hint}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export const LISTING_STATUSES = Object.keys(LISTING) as ListingStatus[]
export const ACCOUNT_STATUSES = Object.keys(ACCOUNT) as AccountStatus[]
