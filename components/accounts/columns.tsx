'use client'

import * as React from 'react'

import { Num } from '@/components/domain/Money'
import { ClubBadge } from '@/components/domain/ClubBadge'
import { RelativeTime } from '@/components/domain/RelativeTime'
import { StatusChip } from '@/components/domain/StatusChip'
import type { FetchColumnDef } from '@/components/data/DataTable'
import type { Account, Proxy } from '@/lib/types'
import { AccountIdentity, AccountPasswordCell, LoyaltyCell, MembershipCell, ProxyCell } from './cells'

/**
 * The §8.2 column list, in order: select · ACCOUNT · CLUB · MEMBERSHIP · LOYALTY ·
 * TICKETS · STATUS · PROXY · LAST CHECK · PASSWORD · ACTIONS. The select column is
 * added by DataTable itself.
 *
 * Sorting is SERVER-side. A column opts in with `meta.sortable`, which is what makes
 * its header clickable; DataTable then emits the click upward instead of reordering
 * the 25 rows it happens to hold, and the API orders the whole 64-row set. The set of
 * sortable columns, and the API field each maps to, lives in ./sorting.ts so the
 * headers and the under-`md` Sort control cannot drift apart.
 *
 * PROXY is deliberately NOT sortable: the API can only order by `proxyId`, an opaque
 * string, while the cell shows a label resolved from a separate query — the rows would
 * reorder in a way the column does not explain. PASSWORD and ACTIONS hold no orderable
 * value at all.
 */
export function makeAccountColumns({
  proxyById,
  renderActions,
}: {
  proxyById: Map<string, Proxy>
  renderActions: (account: Account) => React.ReactNode
}): FetchColumnDef<Account>[] {
  return [
    {
      id: 'account',
      accessorKey: 'email',
      header: 'account',
      meta: { sortable: true },
      // The frozen first column. Hiding the identity of the row you are acting on
      // is never the right way to make a table fit.
      enableHiding: false,
      cell: ({ row }) => <AccountIdentity account={row.original} />,
    },
    {
      id: 'club',
      accessorKey: 'club',
      header: 'club',
      meta: { sortable: true },
      cell: ({ row }) => <ClubBadge club={row.original.club} />,
    },
    {
      id: 'membership',
      accessorKey: 'membershipId',
      header: 'membership',
      meta: { sortable: true },
      cell: ({ row }) => <MembershipCell account={row.original} />,
    },
    {
      id: 'loyalty',
      accessorKey: 'loyaltyPoints',
      header: 'loyalty',
      meta: { sortable: true },
      cell: ({ row }) => <LoyaltyCell account={row.original} />,
    },
    {
      id: 'tickets',
      accessorKey: 'ticketsPurchased',
      header: 'tickets',
      meta: { sortable: true },
      cell: ({ row }) => <Num value={row.original.ticketsPurchased} className="font-semibold" />,
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'status',
      meta: { sortable: true },
      cell: ({ row }) => <StatusChip status={row.original.status} kind="account" />,
    },
    {
      id: 'proxy',
      accessorKey: 'proxyId',
      header: 'proxy',
      cell: ({ row }) => (
        <ProxyCell proxy={row.original.proxyId ? proxyById.get(row.original.proxyId) : undefined} />
      ),
    },
    {
      id: 'lastCheck',
      accessorKey: 'lastCheckedAt',
      header: 'last check',
      meta: { sortable: true },
      cell: ({ row }) =>
        row.original.lastCheckedAt ? (
          <RelativeTime value={row.original.lastCheckedAt} />
        ) : (
          <span className="text-faint">never</span>
        ),
    },
    {
      id: 'password',
      accessorKey: 'passwordMasked',
      header: 'password',
      cell: ({ row }) => <AccountPasswordCell account={row.original} />,
    },
    {
      id: 'actions',
      accessorKey: 'id',
      header: 'actions',
      enableHiding: false,
      cell: ({ row }) => <div className="flex justify-end">{renderActions(row.original)}</div>,
    },
  ]
}
