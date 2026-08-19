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

/** Account statuses, from the §5 `AccountStatus` union. */
export type AccountStatus = 'active' | 'needs_login' | 'needs_otp' | 'locked' | 'expired' | 'error'

interface StatusSpec {
  tone: ChipTone
  outline?: boolean
  /** Plain English, for the tooltip §9 rule 10 requires on every domain flag. */
  hint: string
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
  withTooltip = true,
  className,
}: {
  status: AccountStatus
  /**
   * Kept, and kept required, even though it now has one value. The seat table has its
   * own status union and its own chip table, and an untyped `<StatusChip status=…>`
   * would invite a ticket status into the account chip by mistake.
   */
  kind: 'account'
  withTooltip?: boolean
  className?: string
}) {
  const spec = ACCOUNT[status]

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

export const ACCOUNT_STATUSES = Object.keys(ACCOUNT) as AccountStatus[]
