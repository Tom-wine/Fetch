import { PageHeader } from '@/components/shell/PageHeader'
import { ComingSoon } from '@/components/shell/ComingSoon'

export default function OnSalesPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader title="On-Sales" subtitle="ballot_and_on_sale_dates" />
      <ComingSoon what="On-sale and ballot dates per club. Not built yet — the five core screens ship first." />
    </div>
  )
}
