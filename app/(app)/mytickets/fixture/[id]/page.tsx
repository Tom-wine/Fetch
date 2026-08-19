import { Suspense } from 'react'

import { SkeletonTable } from '@/components/data/states'
import { FixtureDetailScreen } from '@/components/fixture-detail/FixtureDetailScreen'
import { FixtureHeaderSkeleton } from '@/components/fixture-detail/FixtureHeader'

/**
 * `/mytickets/fixture/[id]` (§8.5). The route is a shell; the screen is a client
 * component because every filter, sort and tab it carries lives in the URL.
 *
 * The Suspense boundary is not decoration: `useSearchParams` suspends during
 * prerender, and without it the whole route would opt out of static rendering. The
 * fallback is the same header skeleton and the same table skeleton the screen shows,
 * so a cold load never flashes an empty page.
 */
export default async function FixtureDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <Suspense fallback={<FixtureDetailFallback />}>
      <FixtureDetailScreen fixtureId={id} />
    </Suspense>
  )
}

function FixtureDetailFallback() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <FixtureHeaderSkeleton />
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,64fr)_minmax(0,36fr)]">
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <SkeletonTable rows={8} columns={8} />
        </div>
        <div className="min-h-[420px] rounded-lg border border-border bg-surface" />
      </div>
    </div>
  )
}
