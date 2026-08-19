import { ClipboardCheck } from 'lucide-react'

import { PageHeader } from '@/components/shell/PageHeader'
import { ComingSoon } from '@/components/shell/ComingSoon'

export default function SalesTrackerPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader title="Sales Tracker" subtitle="market_demand_ranking" />
      <ComingSoon
        icon={ClipboardCheck}
        what="Live demand per fixture across the marketplaces, ranked, so a price is set against what the market is doing rather than against what it did when the listing went up."
        cta={{ href: '/mylistings', label: 'Go to my listings' }}
      />
    </div>
  )
}
