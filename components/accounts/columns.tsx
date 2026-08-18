'use client'

import * as React from 'react'

import { Num } from '@/components/domain/Money'
import { ClubBadge } from '@/components/domain/ClubBadge'
import { RelativeTime } from '@/components/domain/RelativeTime'
import { StatusChip } from '@/components/domain/StatusChip'
import type { FetchColumnDef } from '@/components/data/DataTable'
import type { Account, Proxy } from '@/lib/types'
import { AccountIdentity, AccountPasswordCell, MembershipCell, ProxyCell } from './cells'

/**
 * The §8.2 column list, in order: select · ACCOUNT · CLUB · MEMBERSHIP · LOYALTY ·
 * TICKETS · STATUS · PROXY · LAST CHECK · PASSWORD · ACTIONS. The select column is
 * added by DataTable itself.
 *
 * SORTING IS OFF ON EVERY COLUMN, deliberately. DataTable sorts client-side, and
 * this table is server-paged, so a header click would sort the 25 rows on screen and
 * present it as a sort of all 64. Sorting is driven from the toolbar instead, through
 * the `sort` / `order` query params, and happens on the server across the whole match
 * set. See the ASK in fetch-sync.md — when DataTable gains a `manualSorting`
 * passthrough this flag comes off and the toolbar control goes away.
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
      enableSorting: false,
      // The frozen first column. Hiding the identity of the row you are acting on
      // is never the right way to make a table fit.
      enableHiding: false,
      cell: ({ row }) => <AccountIdentity account={row.original} />,
    },
    {
      id: 'club',
      accessorKey: 'club',
      header: 'club',
      enableSorting: false,
      cell: ({ row }) => <ClubBadge club={row.original.club} />,
    },
    {
      id: 'membership',
      accessorKey: 'membershipId',
      header: 'membership',
      enableSorting: false,
      cell: ({ row }) => <MembershipCell account={row.original} />,
    },
    {
      id: 'loyalty',
      accessorKey: 'loyaltyPoints',
      header: 'loyalty',
      enableSorting: false,
      cell: ({ row }) => <Num value={row.original.loyaltyPoints ?? 0} className="font-semibold" />,
    },
    {
      id: 'tickets',
      accessorKey: 'ticketsPurchased',
      header: 'tickets',
      enableSorting: false,
      cell: ({ row }) => <Num value={row.original.ticketsPurchased} className="font-semibold" />,
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'status',
      enableSorting: false,
      cell: ({ row }) => <StatusChip status={row.original.status} kind="account" />,
    },
    {
      id: 'proxy',
      accessorKey: 'proxyId',
      header: 'proxy',
      enableSorting: false,
      cell: ({ row }) => (
        <ProxyCell proxy={row.original.proxyId ? proxyById.get(row.original.proxyId) : undefined} />
      ),
    },
    {
      id: 'lastCheck',
      accessorKey: 'lastCheckedAt',
      header: 'last check',
      enableSorting: false,
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
      enableSorting: false,
      cell: ({ row }) => <AccountPasswordCell account={row.original} />,
    },
    {
      id: 'actions',
      accessorKey: 'id',
      header: 'actions',
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => <div className="flex justify-end">{renderActions(row.original)}</div>,
    },
  ]
}

/** The columns the toolbar's Sort ▾ offers, matched to the API's sortable fields. */
export const SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'email', label: 'Account' },
  { value: 'club', label: 'Club' },
  { value: 'membershipType', label: 'Membership' },
  { value: 'loyaltyPoints', label: 'Loyalty' },
  { value: 'ticketsPurchased', label: 'Tickets' },
  { value: 'status', label: 'Status' },
  { value: 'lastCheckedAt', label: 'Last check' },
  { value: 'createdAt', label: 'Added' },
]
