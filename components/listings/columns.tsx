'use client'

import * as React from 'react'

import { Num } from '@/components/domain/Money'
import { PlatformBadge } from '@/components/domain/PlatformBadge'
import { StatusChip } from '@/components/domain/StatusChip'
import { KickoffCell } from '@/components/fixtures/KickoffCell'
import { DateTime } from '@/components/domain/RelativeTime'
import type { FetchColumnDef } from '@/components/data/DataTable'
import type { Account, Listing } from '@/lib/types'
import { PriceCell } from './PriceCell'
import { SORTABLE_COLUMN_IDS } from './sorting'
import type { DisplayCurrency } from './currency'

/**
 * The §8.6 column list, in order: select · PLATFORM · ACCOUNT · FIXTURE · KICKOFF ·
 * LISTING ID · PRICE · BLOCK · RANK · QTY · STATUS · ⋮. The select column is added by
 * DataTable itself; the other eleven are what the `VIEW` picker lists.
 *
 * Sorting is SERVER-side. A column opts in through `meta.sortable`, stamped from the
 * one registry in ./sorting.ts, so a header is clickable exactly when `GET /listings`
 * can order by that field — a header that reordered only the 25 rows the browser
 * happens to hold would be a lie, because the row that should be first is usually not
 * on the page.
 */
export function makeListingColumns({
  accountById,
  show,
  onCommitPrice,
  renderActions,
}: {
  accountById: Map<string, Account>
  show: DisplayCurrency
  onCommitPrice: (listing: Listing, price: number) => void
  renderActions: (listing: Listing) => React.ReactNode
}): FetchColumnDef<Listing>[] {
  const columns: FetchColumnDef<Listing>[] = [
    {
      id: 'platform',
      accessorKey: 'platform',
      header: 'platform',
      cell: ({ row }) => <PlatformBadge platform={row.original.platform} />,
    },
    {
      id: 'account',
      accessorKey: 'accountId',
      header: 'account',
      cell: ({ row }) => <AccountCell account={accountById.get(row.original.accountId)} />,
    },
    {
      id: 'fixture',
      accessorKey: 'fixtureName',
      header: 'fixture',
      // The identity of the row you are repricing. Hiding it is never the right way
      // to make a table fit.
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex max-w-[220px] min-w-0 flex-col gap-0.5">
          {/* Fixture names are domain data — verbatim, never snake_cased. */}
          <span className="truncate text-body text-text">{row.original.fixtureName}</span>
          <DateTime value={row.original.kickoff} className="truncate text-caption text-faint" />
        </div>
      ),
    },
    {
      id: 'kickoff',
      accessorKey: 'kickoff',
      header: 'kickoff',
      cell: ({ row }) => <KickoffCell value={row.original.kickoff} />,
    },
    {
      id: 'listingId',
      accessorKey: 'listingId',
      header: 'listing id',
      cell: ({ row }) => (
        <span className="font-mono text-caption text-muted">{row.original.listingId}</span>
      ),
    },
    {
      id: 'price',
      accessorKey: 'price',
      header: 'price',
      cell: ({ row }) => (
        <PriceCell
          listing={row.original}
          show={show}
          onCommit={(price) => onCommitPrice(row.original, price)}
        />
      ),
    },
    {
      id: 'block',
      accessorKey: 'block',
      header: 'block',
      cell: ({ row }) => (
        // Block names are domain data — "North Bank Upper 21", verbatim.
        <span className="block max-w-[180px] truncate text-body text-muted">
          {row.original.block}
        </span>
      ),
    },
    {
      id: 'rank',
      accessorKey: 'rank',
      header: 'rank',
      cell: ({ row }) =>
        row.original.rank === undefined ? (
          <span className="text-faint">—</span>
        ) : (
          // Rank is position among comparable listings: 1 is the cheapest on sale.
          <span className="text-body text-muted tabular-nums" title="Position among comparable listings">
            #{row.original.rank}
          </span>
        ),
    },
    {
      id: 'qty',
      accessorKey: 'quantity',
      header: 'qty',
      cell: ({ row }) => <Num value={row.original.quantity} className="font-semibold" />,
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'status',
      cell: ({ row }) => <StatusChip status={row.original.status} kind="listing" />,
    },
    {
      id: 'actions',
      accessorKey: 'id',
      header: 'actions',
      enableHiding: false,
      cell: ({ row }) => <div className="flex justify-end">{renderActions(row.original)}</div>,
    },
  ]

  // One stamp from one registry, rather than a `meta` hand-written per column that
  // can drift from what the endpoint actually supports.
  return columns.map((column) =>
    column.id && SORTABLE_COLUMN_IDS.has(column.id) ? { ...column, meta: { sortable: true } } : column,
  )
}

/**
 * ACCOUNT resolves an opaque `accountId` to the email through a separate query, which
 * is also why the column is not sortable: the API can only order by the id.
 */
function AccountCell({ account }: { account: Account | undefined }) {
  if (!account) return <span className="text-faint">—</span>
  return (
    <span className="block max-w-[200px] truncate text-body text-muted" title={account.email}>
      {account.email}
    </span>
  )
}
