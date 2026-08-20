'use client'

import { RotateCw } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shell/PageHeader'
import { PrivacyToggle } from '@/components/domain/PrivacyToggle'
import { RelativeTime } from '@/components/domain/RelativeTime'
import { useAccountStats } from '@/lib/api/hooks/useAccounts'
import { useKpis } from '@/lib/api/hooks/useDashboard'
import { useFailParam } from './useFailParam'
import { ActiveRunCard } from './ActiveRunCard'
import { ActivityCard } from './ActivityCard'
import { BallotReadinessCard } from './BallotReadinessCard'
import { DashboardOnboarding } from './DashboardOnboarding'
import { EntrySuccessByClub } from './EntrySuccessByClub'
import { KpiTiles } from './KpiTiles'
import { useRefreshDashboard } from './useRefreshDashboard'

/**
 * `/dashboard` — the control room for RUNS.
 *
 * BALLOT ENTRIES ARE THE PRODUCT, and this screen used to open with total revenue, a
 * tickets-sold count and a twelve-month bar chart. That was the old product's front
 * page: it answered "how did the season go" for someone who had come to ask "is my run
 * working, and are my accounts ready for the next one".
 *
 * So the order says what matters, top to bottom:
 *
 *   1. ACTIVE_RUN, full width — the run in flight, or the last one plus START_RUN.
 *   2. BALLOT_READINESS — how many accounts can enter right now, and why the rest cannot.
 *   3. ENTRY_SUCCESS_BY_CLUB — which clubs are still letting entries through.
 *   4. Revenue and tickets sold, as two ordinary tiles, beside the activity feed.
 *
 * Tickets still sell, so row 4 stays; it is just no longer the headline. The revenue
 * CHART moved to /insights, where a question about margins belongs.
 *
 * The two remaining page-level queries are owned here rather than inside each card, so
 * the header can report one "updated" for the screen and REFRESH moves them together.
 * The three ballot cards own their own reads: the run card polls on the run's cadence
 * and the other two share a cache entry with the pool.
 */
export function DashboardScreen() {
  // §6.2 failure injection, read from the screen's own URL and forwarded onto every
  // read below. `?__fail=500` therefore fails the panels at once, which is the point:
  // each has to show its own error and its own retry, not one shared banner.
  const fail = useFailParam()

  const kpisQuery = useKpis(fail)
  const statsQuery = useAccountStats(fail)
  const { refresh, refreshing } = useRefreshDashboard()

  const kpis = kpisQuery.data?.data ?? null
  const stats = statsQuery.data?.data ?? null

  // The fresher of the two reads. Zero before the first response lands — and on the
  // server pass, where there is no data at all — so the timestamp is simply absent
  // rather than rendering the epoch.
  const updatedAt = Math.max(kpisQuery.dataUpdatedAt, statsQuery.dataUpdatedAt)

  /**
   * §8.1: no accounts means the whole page is replaced. The gate reads
   * `GET /accounts/stats` rather than `kpis.accountsTotal` because every write that
   * can end this state — an import, a manual add, a delete — already invalidates the
   * accounts root, so the page leaves first-run the moment the account exists.
   */
  const firstRun = stats !== null && stats.total === 0

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="is_the_run_working_and_who_is_ready_next"
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
          <ActiveRunCard className="lg:col-span-3" />

          <BallotReadinessCard className="lg:col-span-3" />

          {/* self-start so the chart card ends where its content ends: stretched to match
              the taller right-hand column it grew a slab of empty card underneath. */}
          <EntrySuccessByClub className="lg:col-span-2 lg:self-start" />

          <div className="flex flex-col gap-4">
            {/* Demoted, not deleted: two tiles rather than three, stacked in the
                narrow column beside the feed instead of opening the screen. */}
            <KpiTiles
              kpis={kpis}
              loading={kpisQuery.isPending}
              error={kpisQuery.error ? kpisQuery.error.message : null}
              onRetry={() => void kpisQuery.refetch()}
            />

            <ActivityCard className="flex-1" />
          </div>
        </div>
      )}
    </div>
  )
}
