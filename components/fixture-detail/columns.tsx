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
 * `LEVEL` ships hidden. Mono runs ~12% wider than a proportional face, and this table
 * has to share 1280px with a 36% context panel, so nine columns plus a checkbox do
 * not fit (§9 rule 3). The level is the least load-bearing of them — a block name
 * already tells an operator which tier they are looking at — and it is one click away
 * in the view options.
 */
export const INITIALLY_HIDDEN = ['level']
