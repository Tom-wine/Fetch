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
 *
 * The page does NOT read `params`. It used to `await` them, and that one await was
 * the whole shell's hydration mismatch: awaiting a promise here suspends the SERVER
 * render at this point, the client's hydration render does not suspend in the same
 * place, and React's `useId` tree context differs between the two — which silently
 * renumbered every `useId` in the layout above, sidebar and topbar included. The id
 * is read from `useParams()` inside the screen instead, which is a plain synchronous
 * value on both renders. This Suspense boundary does not help with that, because the
 * suspension happened ABOVE it.
 */
export default function FixtureDetailPage() {
  return (
    <Suspense fallback={<FixtureDetailFallback />}>
      <FixtureDetailScreen />
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
