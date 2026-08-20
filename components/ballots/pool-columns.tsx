'use client'

import * as React from 'react'
import Link from 'next/link'

import { ClubBadge } from '@/components/domain/ClubBadge'
import { RelativeTime } from '@/components/domain/RelativeTime'
import { Chip, StatusChip } from '@/components/domain/StatusChip'
import { Hint } from '@/components/ui/tooltip'
import { BLOCKED_REASONS, type Readiness } from '@/lib/ballots/readiness'
import { AccountIdentity, ProxyCell } from '@/components/accounts/cells'
import type { FetchColumnDef } from '@/components/data/DataTable'
import type { AccountResult } from '@/lib/api/schemas'
import type { Account, Proxy } from '@/lib/types'
import { TaskStatusChip } from './vocabulary'

/**
 * §B5.1 — `ACCOUNT · READY · CLUB · STATUS · PROXY · LAST_RUN · LAST_RESULT · ACTIONS`.
 *
 * READY is the column this screen was missing. STATUS says whether the last check could
 * LOG IN, which is one of the five things a run needs; the operator was doing the other
 * four in their head — has it a proxy, is the membership live, does the profile want a
 * mailbox — and getting them wrong at 09:59 on an on-sale morning. One chip answers the
 * question the tab exists for, and names the fix when the answer is no.
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
  readinessFor,
  renderActions,
}: {
  proxyById: Map<string, Proxy>
  resultFor: (accountId: string) => AccountResult | undefined
  /** Derived in the browser against the profile a run would use — see readiness.ts. */
  readinessFor: (account: Account) => Readiness
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
      id: 'ready',
      accessorKey: 'id',
      header: 'ready',
      // The tour points at this header; see lib/tour/steps.ts.
      meta: { tour: 'pool-ready' },
      // Not sortable: the API cannot order 300 rows by a verdict computed here, and a
      // header that reordered only the visible page would be the usual lie.
      enableHiding: false,
      cell: ({ row }) => <ReadyCell readiness={readinessFor(row.original)} />,
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

/**
 * READY, or BLOCKED with the reason under it.
 *
 * The reason is in the row rather than behind a hover, for the same argument as
 * LAST_RESPONSE on the monitor (§B7 rule 3): this column exists to answer "why can this
 * account not go", and an answer you have to hover for is an answer for one account at
 * a time. The tooltip carries the sentence that says what to DO about it.
 */
function ReadyCell({ readiness }: { readiness: Readiness }) {
  if (readiness.ready) {
    return (
      <span className="flex min-w-0 flex-col items-start gap-1">
        <Chip tone="success">READY</Chip>
        {readiness.expiringSoon && (
          <Hint label="This account can enter tonight. Its membership lapses within the month, and after that the club refuses the entry whatever the login says.">
            <span className="cursor-help font-mono text-caption text-warning-ink">
              membership lapsing
            </span>
          </Hint>
        )}
      </span>
    )
  }

  const spec = readiness.reason ? BLOCKED_REASONS[readiness.reason] : null

  return (
    <Hint label={spec?.hint ?? 'This account cannot enter a ballot right now.'}>
      <span className="flex min-w-0 cursor-help flex-col items-start gap-1">
        <Chip tone="neutral">BLOCKED</Chip>
        {spec && (
          <span className="max-w-[130px] truncate font-mono text-caption text-muted">
            {spec.label}
          </span>
        )}
      </span>
    </Hint>
  )
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
