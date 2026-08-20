'use client'

import * as React from 'react'

import { ErrorState } from '@/components/data/states'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart } from '@/components/domain/charts'
import { getClub } from '@/lib/registries/clubs'
import { useAccountResults } from '@/lib/api/hooks/useBallots'
import { usePoolAccounts } from '@/lib/api/hooks/useActiveRun'
import type { ClubId } from '@/lib/types'
import { Panel } from './Panel'

/**
 * Row 3 of /dashboard — how often entries are actually being confirmed, per club.
 *
 * The number an operator needs before the next on-sale is not "how many accounts do I
 * have", it is "is Arsenal still letting me in". A club that started refusing today
 * shows up here as a bar that has fallen, and nowhere else on the app: the run monitor
 * knows one run, and the runs table knows totals across clubs mixed together.
 *
 * Built from data the client already holds — `GET /ballots/accounts/results` is the
 * last outcome per account and the pool says which club each account belongs to, so
 * the join is a `for` loop rather than an endpoint. It reports the LAST result per
 * account rather than every attempt ever, which is the honest reading of "lately".
 */
interface ClubRate {
  club: ClubId
  name: string
  attempted: number
  confirmed: number
  rate: number
}

export function EntrySuccessByClub({ className }: { className?: string }) {
  const pool = usePoolAccounts()
  const results = useAccountResults()

  const rows = React.useMemo<ClubRate[]>(() => {
    const map = results.data
    if (!map || pool.accounts.length === 0) return []

    const tally = new Map<ClubId, { attempted: number; confirmed: number }>()

    for (const account of pool.accounts) {
      const result = map.get(account.id)
      // Never entered is not a zero — a club with no attempts has no rate, and
      // charting it as 0% would report a failure that never happened.
      if (!result || result.status === 'SKIPPED') continue

      const club = account.club as ClubId
      const entry = tally.get(club) ?? { attempted: 0, confirmed: 0 }
      entry.attempted++
      if (result.status === 'SUCCESS') entry.confirmed++
      tally.set(club, entry)
    }

    return [...tally.entries()]
      .map(([club, entry]) => ({
        club,
        name: getClub(club).short,
        attempted: entry.attempted,
        confirmed: entry.confirmed,
        rate: Math.round((entry.confirmed / entry.attempted) * 100),
      }))
      .sort((a, b) => a.rate - b.rate || b.attempted - a.attempted)
  }, [pool.accounts, results.data])

  const error = pool.error ?? (results.error ? results.error.message : null)
  const loading = pool.loading || results.isPending

  const worst = rows[0]

  return (
    <Panel
      title="Entry success by club"
      label="last result per account, worst first"
      className={className}
      bodyClassName="space-y-4"
    >
      {error ? (
        <ErrorState
          message={error}
          onRetry={() => (pool.error ? pool.onRetry() : void results.refetch())}
          className="min-h-[200px]"
        />
      ) : loading ? (
        <Skeleton className="h-[220px] w-full rounded-md" />
      ) : rows.length === 0 ? (
        <p className="py-10 text-center font-prose text-prose text-muted">
          No club has been entered yet. After the first run this chart says which ones are letting
          you in and which have started refusing.
        </p>
      ) : (
        <>
          <BarChart
            data={rows.map((row) => ({ club: row.name, rate: row.rate }))}
            xKey="club"
            series={[{ key: 'rate', name: 'Entries confirmed' }]}
            kind="number"
            height={220}
            label="entry_success"
          />

          {/* One plain line under the chart, because a bar chart states a shape and an
              operator needs the sentence: which club to look at, and how bad it is. */}
          <p className="font-prose text-prose text-muted">
            {worst && worst.rate < 100
              ? `${worst.name} is the one to watch — ${worst.confirmed} of ${worst.attempted} entries confirmed. A club that starts refusing usually does it to every account at once, so check the run log before loading more.`
              : 'Every club that has been entered confirmed every account. Nothing to chase.'}
          </p>
        </>
      )}
    </Panel>
  )
}
