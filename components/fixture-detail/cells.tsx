'use client'

import * as React from 'react'
import { Eye, EyeOff } from 'lucide-react'

import { cn } from '@/lib/utils'
import { upperSnake } from '@/lib/format/text'
import { Chip, type ChipTone } from '@/components/domain/StatusChip'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { Account, Ticket, TicketStatus } from '@/lib/types'

/**
 * The cells that only the seat table has. Anything a second screen would want lives
 * in components/domain instead.
 */

/* ---------------------------------------------------------------- status */

/**
 * `Ticket.status` is its own union (§5) — `StatusChip` covers the listing and account
 * unions and deliberately does not guess between them, so the seat states get their
 * own table here, with the plain-English tooltip §9 rule 10 requires.
 */
const TICKET_STATUS: Record<TicketStatus, { tone: ChipTone; hint: string }> = {
  ticket: {
    tone: 'neutral',
    hint: 'Held in the account and not offered anywhere. This is stock you can still act on.',
  },
  listed: {
    tone: 'success',
    hint: 'Offered on a marketplace right now. A buyer can take it at any moment.',
  },
  sold: {
    tone: 'violet',
    hint: 'Sold. The money is in, and the seat has to reach the buyer.',
  },
  transferred: {
    tone: 'warning',
    hint: 'Handed over to someone else. It has left your inventory and cannot be listed again.',
  },
}

export function TicketStatusChip({ status }: { status: TicketStatus }) {
  const spec = TICKET_STATUS[status]
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="rounded-sm">
            <Chip tone={spec.tone}>{upperSnake(status)}</Chip>
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-[260px] font-prose text-prose">{spec.hint}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/* ------------------------------------------------------------ visibility */

/**
 * The VISIBILITY eye.
 *
 * A hidden seat is a live button: one click makes it visible to buyers through
 * `POST /tickets/share`, optimistically, with a toast and a rollback if the write
 * fails. A visible seat is an INDICATOR, not a button — the API has no way to hide a
 * seat again (ASK 1 in fetch-sync.md), and a control that flips a value the server
 * will put straight back is worse than one that says so.
 *
 * Both states carry the same tooltip grammar, so the difference reads as a fact about
 * the seat rather than as a disabled control the operator has to work out.
 */
export function VisibilityCell({
  ticket,
  onReveal,
  busy = false,
}: {
  ticket: Ticket
  onReveal: (ticket: Ticket) => void
  busy?: boolean
}) {
  const hidden = ticket.visibility === 'hidden'

  const icon = hidden ? (
    <EyeOff className="size-4" aria-hidden="true" />
  ) : (
    <Eye className="size-4" aria-hidden="true" />
  )

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {hidden ? (
            <button
              type="button"
              disabled={busy}
              // The checkbox column stops propagation for the same reason: acting on a
              // row must not also change which row the panel is describing.
              onClick={(event) => {
                event.stopPropagation()
                onReveal(ticket)
              }}
              aria-label={`Make seat ${ticket.seat} visible to buyers`}
              className={cn(
                'flex size-8 items-center justify-center rounded-md border border-warning/30 bg-warning/12 text-warning-ink transition-colors duration-150',
                busy ? 'opacity-50' : 'hover:bg-warning/20',
              )}
            >
              {icon}
            </button>
          ) : (
            <span
              tabIndex={0}
              role="img"
              aria-label="Visible to buyers"
              className="flex size-8 items-center justify-center rounded-md text-faint"
            >
              {icon}
            </span>
          )}
        </TooltipTrigger>
        <TooltipContent className="max-w-[260px] font-prose text-prose">
          {hidden
            ? 'Hidden from buyers. Click to make this seat visible.'
            : 'Visible to buyers. Fetch.io cannot hide a seat again yet.'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/* --------------------------------------------------------------- account */

/**
 * A ticket carries an `accountId`; the operator thinks in email addresses. The book
 * is fetched once for the screen, so a miss here means the account list is still in
 * flight rather than that the account is gone — which is why the id is shown instead
 * of an em dash.
 */
export function AccountCell({ id, account }: { id: string; account?: Account }) {
  return (
    <span className="block max-w-[220px] truncate text-muted" title={account?.email ?? id}>
      {account?.email ?? id}
    </span>
  )
}
