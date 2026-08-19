import { Clock } from 'lucide-react'

import { PageHeader } from '@/components/shell/PageHeader'
import { ComingSoon } from '@/components/shell/ComingSoon'

export default function OnSalesPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader title="On-Sales" subtitle="ballot_and_on_sale_dates" />
      <ComingSoon
        icon={Clock}
        what="When each club opens its ballot and its general sale, counted down per fixture, so the accounts that need to be logged in are ready before the queue opens."
        cta={{ href: '/accounts', label: 'Check accounts' }}
      />
    </div>
  )
}
