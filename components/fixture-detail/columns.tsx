'use client'

import * as React from 'react'

import type { Account, Ticket } from '@/lib/types'
import type { FetchColumnDef } from '@/components/data/DataTable'
import { Money } from '@/components/domain/Money'
import { AccountCell, TicketStatusChip, VisibilityCell } from './cells'
import { SORTABLE_COLUMN_IDS } from './sorting'

/**
 * The §8.5 seat columns, in order: select (added by DataTable) then BLOCK, LEVEL,
 * ROW, SEAT, PRICE, FACE, ACCOUNT, VISIBILITY, STATUS.
 *
 * Built by a factory rather than declared at module scope, because two of the cells
 * need something the column list cannot reach on its own: the account book that turns
 * an `accountId` into an email, and the mutation behind the eye. The screen memoises
 * the result on those two inputs, so the table still sees a stable array.
 *
 * `meta.sortable` is stamped from the sort registry in one pass at the bottom, so a
 * header is clickable exactly when the API can order by that field honestly — see
 * `sorting.ts` for why ROW, SEAT and ACCOUNT are not in it.
 */
export function ticketColumns({
  accounts,
  onToggleVisibility,
  visibilityBusy,
}: {
  accounts: Map<string, Account>
  onToggleVisibility: (ticket: Ticket) => void
  visibilityBusy: boolean
}): FetchColumnDef<Ticket>[] {
  const columns: FetchColumnDef<Ticket>[] = [
    {
      id: 'block',
      accessorKey: 'block',
      header: 'block',
      // The frozen column: a seat is identified by its block before anything else, so
      // it is the one that must survive a horizontal scroll.
      enableHiding: false,
      cell: ({ row }) => (
        <span className="block max-w-[220px] truncate font-medium text-text">
          {row.original.block}
        </span>
      ),
    },
    {
      id: 'level',
      accessorKey: 'levelName',
      header: 'level',
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted">{row.original.levelName}</span>
      ),
    },
    {
      id: 'row',
      accessorKey: 'row',
      header: 'row',
      cell: ({ row }) => <span className="tabular-nums">{row.original.row}</span>,
    },
    {
      id: 'seat',
      accessorKey: 'seat',
      header: 'seat',
      cell: ({ row }) => <span className="tabular-nums">{row.original.seat}</span>,
    },
    {
      id: 'price',
      accessorKey: 'price',
      header: 'price',
      cell: ({ row }) => (
        <Money
          amount={row.original.price}
          currency={row.original.currency}
          className="font-semibold text-text"
        />
      ),
    },
    {
      id: 'face',
      accessorKey: 'faceValue',
      header: 'face',
      cell: ({ row }) => (
        <Money
          amount={row.original.faceValue}
          currency={row.original.currency}
          className="text-muted"
        />
      ),
    },
    {
      id: 'account',
      accessorKey: 'accountId',
      header: 'account',
      cell: ({ row }) => (
        <AccountCell id={row.original.accountId} account={accounts.get(row.original.accountId)} />
      ),
    },
    {
      id: 'visibility',
      accessorKey: 'visibility',
      header: 'visibility',
      cell: ({ row }) => (
        <VisibilityCell ticket={row.original} onToggle={onToggleVisibility} busy={visibilityBusy} />
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'status',
      cell: ({ row }) => <TicketStatusChip status={row.original.status} />,
    },
  ]

  return columns.map((column) => ({
    ...column,
    meta: { ...column.meta, sortable: SORTABLE_COLUMN_IDS.has(column.id ?? '') },
  }))
}

/**
 * What ships visible: `BLOCK`, `ROW`, `SEAT`, `PRICE`, `STATUS`. Where the seat is,
 * what it cost, and what state it is in.
 *
 * §9 rule 3 is not "hide the least useful column", it is "the DEFAULT SET FITS". At
 * 1280px this table shares the width with a 36% context panel and gets 604px; the nine
 * columns want 912px, and mono runs ~12% wider than a proportional face, so five of
 * them were being cut off the right edge — `VISIBILITY` rendered as `V…` and a status
 * chip was sectioned by the card border. That is the Tikey defect this rebuild set out
 * to fix, reproduced.
 *
 * So four are hidden by default, and none of them is a state or an identity:
 *
 *   · `LEVEL` — a block name already says which tier.
 *   · `FACE`  — reference, not the operative number; `PRICE` is.
 *   · `ACCOUNT` — the panel names the account for the selected seat, and the toolbar
 *      filters by it. It is the one real casualty of a 604px pane.
 *   · `VISIBILITY` — a state you set occasionally rather than read constantly, and
 *      still settable on a selection through `Actions`.
 *
 * Measured, not guessed: select 48 · BLOCK 178 · ROW 54 · SEAT 62 · PRICE 87 · STATUS
 * 95 = 524px, inside 604px at 1280 and 715px at 1440 with room for a longer block name
 * than any fixture in the seed. All four are one click away in `VIEW`, which is what
 * the control is for.
 */
export const INITIALLY_HIDDEN = ['level', 'face', 'account', 'visibility']
