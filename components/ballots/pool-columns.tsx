'use client'

import * as React from 'react'
import Link from 'next/link'

import { ClubBadge } from '@/components/domain/ClubBadge'
import { RelativeTime } from '@/components/domain/RelativeTime'
import { StatusChip } from '@/components/domain/StatusChip'
import { AccountIdentity, ProxyCell } from '@/components/accounts/cells'
import type { FetchColumnDef } from '@/components/data/DataTable'
import type { AccountResult } from '@/lib/api/schemas'
import type { Account, Proxy } from '@/lib/types'
import { TaskStatusChip } from './vocabulary'

/**
 * §B5.1 — `ACCOUNT · CLUB · STATUS · PROXY · LAST_RUN · LAST_RESULT · ACTIONS`.
 *
 * The first four are the /accounts columns, imported rather than reimplemented: a
 * ballot account IS an ordinary Account, so its identity, club, status and proxy have
 * to render identically on both screens or the operator has to learn the table twice.
 *
 * The last two are what this screen adds, and both come from the same join
 * (`GET /ballots/accounts/results`) keyed by account id.
 *
 * LAST_RUN and LAST_RESULT are NOT sortable. The API orders accounts, and neither
 * column is a field it holds — a header that reordered the page by something the
 * server cannot order the other 300 rows by would be a lie in the same way sorting
 * one page ever is.
 */
export function makePoolColumns({
  proxyById,
  resultFor,
  renderActions,
}: {
  proxyById: Map<string, Proxy>
  resultFor: (accountId: string) => AccountResult | undefined
  renderActions: (account: Account) => React.ReactNode
}): FetchColumnDef<Account>[] {
  return [
    {
      id: 'account',
      accessorKey: 'email',
      header: 'account',
      meta: { sortable: true },
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
      id: 'lastRun',
      accessorKey: 'id',
      header: 'last run',
      cell: ({ row }) => <LastRunCell result={resultFor(row.original.id)} />,
    },
    {
      id: 'lastResult',
      accessorKey: 'id',
      header: 'last result',
      cell: ({ row }) => <LastResultCell result={resultFor(row.original.id)} />,
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

/** The run label is domain data and renders verbatim; the link goes to the monitor. */
function LastRunCell({ result }: { result: AccountResult | undefined }) {
  if (!result) return <span className="text-faint">never</span>

  return (
    <div className="flex max-w-[180px] min-w-0 flex-col gap-0.5">
      <Link
        href={`/ballots/run/${result.runId}`}
        className="truncate text-body text-text transition-colors hover:text-primary-ink"
      >
        {result.runLabel}
      </Link>
      <RelativeTime value={result.at} className="text-caption text-faint" />
    </div>
  )
}

/**
 * The chip plus the club's own sentence underneath.
 *
 * §B7 rule 3: `RATE_LIMITED` on its own is a code. The engine attaches a readable
 * message to every failure and it is shown here rather than hidden behind a hover,
 * because this column exists to answer "why did this account not get in".
 */
function LastResultCell({ result }: { result: AccountResult | undefined }) {
  if (!result) return <span className="text-faint">—</span>

  return (
    <div className="flex max-w-[260px] min-w-0 flex-col items-start gap-1">
      <TaskStatusChip status={result.status} />
      {result.entryRef && (
        <span className="truncate font-mono text-caption text-muted">{result.entryRef}</span>
      )}
      {!result.entryRef && result.message && (
        <span className="line-clamp-2 font-prose text-caption text-muted">{result.message}</span>
      )}
    </div>
  )
}
