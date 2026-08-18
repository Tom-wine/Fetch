import { PageHeader } from '@/components/shell/PageHeader'
import { ComingSoon } from '@/components/shell/ComingSoon'

export default function MyListingsPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader title="My Listings" subtitle="live_across_marketplaces" />
      <ComingSoon what="Every active listing, with inline price editing and the currency normaliser, lands in Part 8." />
    </div>
  )
}
