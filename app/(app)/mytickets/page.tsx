import { Suspense } from 'react'

import { SkeletonTable } from '@/components/data/states'
import { PageHeader } from '@/components/shell/PageHeader'
import { MyTicketsScreen } from '@/components/fixtures/MyTicketsScreen'

/**
 * `/mytickets` (§8.4). The route is a shell; the screen is a client component because
 * every filter it carries lives in the URL.
 *
 * The Suspense boundary is not decoration: `useSearchParams` suspends during
 * prerender, and without it the whole route would opt out of static rendering. The
 * fallback is the same skeleton the table shows, so a cold load never flashes an
 * empty page.
 */
export default function MyTicketsPage() {
  return (
    <Suspense fallback={<MyTicketsFallback />}>
      <MyTicketsScreen />
    </Suspense>
  )
}

function MyTicketsFallback() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader title="My Tickets" subtitle="what_you_hold_and_what_is_at_risk" />
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <SkeletonTable rows={8} columns={8} />
      </div>
    </div>
  )
}
