'use client'

import { PageHeader } from '@/components/shell/PageHeader'
import { PrivacyToggle } from '@/components/domain/PrivacyToggle'
import { useRevenue } from '@/lib/api/hooks/useDashboard'
import { useFailParam } from './useFailParam'
import { RevenueCard } from './RevenueCard'

/**
 * `/insights` — the money questions, off the front page.
 *
 * The twelve-month revenue chart used to be the largest thing on /dashboard, which put
 * a question about the season above the question the operator actually opened the app
 * with. It is not deleted — tickets sell, and the trend is worth having — it is simply
 * somewhere a person goes deliberately.
 *
 * This screen was a "coming soon" placeholder whose copy promised exactly this chart's
 * successor: which clubs and blocks actually return, measured against what the seats
 * cost. It now carries the chart it was promising to improve on, so the promise is at
 * least standing on something.
 */
export function InsightsScreen() {
  const fail = useFailParam()
  const revenueQuery = useRevenue('month', fail)

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader title="Insights" subtitle="what_the_season_earned" actions={<PrivacyToggle />} />

      <RevenueCard
        revenue={revenueQuery.data?.data ?? []}
        loading={revenueQuery.isPending}
        error={revenueQuery.error ? revenueQuery.error.message : null}
        onRetry={() => void revenueQuery.refetch()}
      />
    </div>
  )
}
