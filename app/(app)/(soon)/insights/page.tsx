import { PageHeader } from '@/components/shell/PageHeader'
import { ComingSoon } from '@/components/shell/ComingSoon'

export default function InsightsPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader title="Insights" subtitle="roi_and_best_sellers" />
      <ComingSoon what="Data insights, ROI and best sellers. Not built yet — the five core screens ship first." />
    </div>
  )
}
