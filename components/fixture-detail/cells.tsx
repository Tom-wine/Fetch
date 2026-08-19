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
 * `Ticket.status` is its own union (§5) — `StatusChip` covers the account union and
 * deliberately does not guess between them, so the seat states get their own table
 * here, with the plain-English tooltip §9 rule 10 requires.
 */
const TICKET_STATUS: Record<TicketStatus, { tone: ChipTone; hint: string }> = {
  ticket: {
    tone: 'neutral',
    hint: 'Held in the account and not offered anywhere. This is stock you can still act on.',
  },
  listed: {
    tone: 'success',
    hint: 'Offered for sale right now. A buyer can take it at any moment.',
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
 * The VISIBILITY eye — a two-way toggle.
 *
 * It was one-way for a while, and honestly so: `POST /tickets/share` was the only
 * write that touched `visibility` and it only ever set `visible`, so a revealed seat
 * could not be hidden again and this rendered that state as an indicator rather than
 * as a button that would flip a value the server put straight back. `PATCH
 * /tickets/:id` exists now, so both directions are real and both are a button.
 *
 * The two states keep their own colours — hidden is the warning amber it always was,
 * because a seat buyers cannot see is a seat that will not sell — and the tooltip
 * names the click's outcome rather than the current state, which is the one thing the
 * icon cannot say on its own.
 */
export function VisibilityCell({
  ticket,
  onToggle,
  busy = false,
}: {
  ticket: Ticket
  onToggle: (ticket: Ticket) => void
  busy?: boolean
}) {
  const hidden = ticket.visibility === 'hidden'

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            disabled={busy}
            // The checkbox column stops propagation for the same reason: acting on a
            // row must not also change which row the panel is describing.
            onClick={(event) => {
              event.stopPropagation()
              onToggle(ticket)
            }}
            aria-label={
              hidden
                ? `Make seat ${ticket.seat} visible to buyers`
                : `Hide seat ${ticket.seat} from buyers`
            }
            aria-pressed={!hidden}
            className={cn(
              'flex size-8 items-center justify-center rounded-md border transition-colors duration-150',
              hidden
                ? 'border-warning/30 bg-warning/12 text-warning-ink'
                : 'border-transparent text-faint',
              busy
                ? 'opacity-50'
                : hidden
                  ? 'hover:bg-warning/20'
                  : 'hover:bg-surface-hover hover:text-text',
            )}
          >
            {hidden ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[260px] font-prose text-prose">
          {hidden
            ? 'Hidden from buyers. Click to make this seat visible.'
            : 'Visible to buyers. Click to hide it again.'}
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
