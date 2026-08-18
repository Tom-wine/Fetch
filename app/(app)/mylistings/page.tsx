import { Suspense } from 'react'

import { SkeletonTable } from '@/components/data/states'
import { PageHeader } from '@/components/shell/PageHeader'
import { ListingsScreen } from '@/components/listings/ListingsScreen'

/**
 * `/mylistings` (§8.6). The route is a shell; the screen is a client component
 * because every filter, the sort, the page and the currency normaliser live in the
 * URL.
 *
 * The Suspense boundary is not decoration: `useSearchParams` suspends during
 * prerender, and without it the whole route would opt out of static rendering. The
 * fallback is the same skeleton the table shows, so a cold load never flashes an
 * empty page.
 */
export default function MyListingsPage() {
  return (
    <Suspense fallback={<MyListingsFallback />}>
      <ListingsScreen />
    </Suspense>
  )
}

function MyListingsFallback() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader title="My Listings" subtitle="live_across_marketplaces" />
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <SkeletonTable rows={8} columns={9} />
      </div>
    </div>
  )
}
