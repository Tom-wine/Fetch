'use client'

import * as React from 'react'

import { Money } from '@/components/domain/Money'
import type { Account, Ticket } from '@/lib/types'
import { TicketStatusChip, VisibilityCell } from './cells'

/**
 * One seat as a card, for below `md` where a nine-column table cannot fit (§9 rule 3,
 * and rule 17 — the "did anything sell" check has to work at 375px).
 *
 * The block and seat lead, because that is how an operator names a ticket out loud;
 * the money and the state follow. `DataTable`'s default stacked layout would list all
 * nine fields as label/value pairs, which is accurate and unreadable.
 */
export function TicketCard({
  ticket,
  account,
  onToggleVisibility,
  visibilityBusy,
}: {
  ticket: Ticket
  account?: Account
  onToggleVisibility: (ticket: Ticket) => void
  visibilityBusy: boolean
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-body font-medium text-text">{ticket.block}</p>
          <p className="mt-0.5 text-caption text-muted tabular-nums">
            Row {ticket.row} <span className="text-faint">•</span> Seat {ticket.seat}
            <span className="text-faint"> • </span>
            {ticket.levelName}
          </p>
        </div>
        <TicketStatusChip status={ticket.status} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-caption text-muted">
          {account?.email ?? ticket.accountId}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <VisibilityCell ticket={ticket} onToggle={onToggleVisibility} busy={visibilityBusy} />
          <span className="text-right">
            <Money
              amount={ticket.price}
              currency={ticket.currency}
              className="block text-body font-semibold text-text"
            />
            <Money
              amount={ticket.faceValue}
              currency={ticket.currency}
              className="block text-caption text-faint"
            />
          </span>
        </div>
      </div>
    </div>
  )
}
