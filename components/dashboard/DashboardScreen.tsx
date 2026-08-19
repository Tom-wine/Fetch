'use client'

import { RotateCw } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shell/PageHeader'
import { PrivacyToggle } from '@/components/domain/PrivacyToggle'
import { RelativeTime } from '@/components/domain/RelativeTime'
import { useAccountStats } from '@/lib/api/hooks/useAccounts'
import { useKpis, useRevenue } from '@/lib/api/hooks/useDashboard'
import { AccountHealthStrip } from './AccountHealthStrip'
import { ActivityCard } from './ActivityCard'
import { DashboardOnboarding } from './DashboardOnboarding'
import { KpiTiles } from './KpiTiles'
import { PromoCard } from './PromoCard'
import { RevenueCard } from './RevenueCard'
import { useRefreshDashboard } from './useRefreshDashboard'

/**
 * `/dashboard` — §8.1.
 *
 * One `lg:grid-cols-3` grid holds every region, so the three KPI tiles, the health
 * strip's four counters and the chart all sit on the same column tracks instead of
 * three nested grids that agree by coincidence.
 *
 * The three queries are owned here rather than inside each card, because the header
 * has to report one "last updated" for the page and REFRESH has to move all of them
 * together. `ActivityCard` is the exception: its query is keyed by a tab only it
 * knows about, and it is a feed rather than a number, so it refetches on its own.
 */
export function DashboardScreen() {
  const kpisQuery = useKpis()
  const revenueQuery = useRevenue()
  const statsQuery = useAccountStats()
  const { refresh, refreshing } = useRefreshDashboard()

  const kpis = kpisQuery.data?.data ?? null
  const revenue = revenueQuery.data?.data ?? []
  const stats = statsQuery.data?.data ?? null

  // The freshest of the three reads. Zero before the first response lands — and on
  // the server pass, where there is no data at all — so the timestamp is simply
  // absent rather than rendering the epoch.
  const updatedAt = Math.max(
    kpisQuery.dataUpdatedAt,
    revenueQuery.dataUpdatedAt,
    statsQuery.dataUpdatedAt,
  )

  /**
   * §8.1: no accounts means the whole page is replaced. The gate reads
   * `GET /accounts/stats` rather than `kpis.accountsTotal` because every write that
   * can end this state — an import, a manual add, a delete — already invalidates
   * the accounts root, so the page leaves first-run the moment the account exists.
   *
   * `stats === null` while the query is pending, so the skeletons show and the
   * onboarding card only appears once the count is actually known to be zero.
   */
  const firstRun = stats !== null && stats.total === 0

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="account_health"
        caret
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {!firstRun && updatedAt > 0 && (
              <span className="hidden items-center gap-1 text-caption text-faint sm:inline-flex">
                updated <RelativeTime value={new Date(updatedAt)} />
              </span>
            )}

            <Button
              variant="secondary"
              label="Refresh"
              onClick={() => void refresh()}
              disabled={refreshing}
            >
              <RotateCw
                className={cn('size-3.5', refreshing && 'animate-spin')}
                aria-hidden="true"
              />
            </Button>

            {/* Nothing monetary is on screen during first run, so the eye would
                toggle a blur over nothing. */}
            {!firstRun && <PrivacyToggle />}
          </div>
        }
      />

      {firstRun ? (
        <DashboardOnboarding />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <KpiTiles
            kpis={kpis}
            revenue={revenue}
            loading={kpisQuery.isPending}
            error={kpisQuery.error ? kpisQuery.error.message : null}
            onRetry={() => void kpisQuery.refetch()}
          />

          <AccountHealthStrip
            stats={stats}
            loading={statsQuery.isPending}
            error={statsQuery.error ? statsQuery.error.message : null}
            onRetry={() => void statsQuery.refetch()}
            className="lg:col-span-3"
          />

          <RevenueCard
            revenue={revenue}
            loading={revenueQuery.isPending}
            error={revenueQuery.error ? revenueQuery.error.message : null}
            onRetry={() => void revenueQuery.refetch()}
            className="lg:col-span-2"
          />

          <div className="flex flex-col gap-4">
            <PromoCard />
            <ActivityCard className="flex-1" />
          </div>
        </div>
      )}
    </div>
  )
}
