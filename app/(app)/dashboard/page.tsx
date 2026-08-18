import { PageHeader } from '@/components/shell/PageHeader'
import { ComingSoon } from '@/components/shell/ComingSoon'

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader title="Dashboard" subtitle="account_health" caret />
      <ComingSoon what="KPI tiles, the account-health strip, the revenue chart and the activity feed land in Part 9." />
    </div>
  )
}
