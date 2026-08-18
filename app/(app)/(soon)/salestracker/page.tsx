import { PageHeader } from '@/components/shell/PageHeader'
import { ComingSoon } from '@/components/shell/ComingSoon'

export default function SalesTrackerPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader title="Sales Tracker" subtitle="market_demand_ranking" />
      <ComingSoon what="Market demand ranking. Not built yet — the five core screens ship first." />
    </div>
  )
}
