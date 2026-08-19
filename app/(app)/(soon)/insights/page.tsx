import { BarChart3 } from 'lucide-react'

import { PageHeader } from '@/components/shell/PageHeader'
import { ComingSoon } from '@/components/shell/ComingSoon'

export default function InsightsPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader title="Insights" subtitle="roi_and_best_sellers" />
      <ComingSoon
        icon={BarChart3}
        what="Which clubs, blocks and marketplaces actually return, measured against what the seats cost — the question the revenue chart on the dashboard raises but cannot answer."
        cta={{ href: '/dashboard', label: 'Go to dashboard' }}
      />
    </div>
  )
}
