import { Suspense } from 'react'

import { PageHeader } from '@/components/shell/PageHeader'
import { SkeletonTable } from '@/components/data/states'
import { AccountsScreen } from '@/components/accounts/AccountsScreen'

/**
 * `/accounts` — the anchor screen (§8.2).
 *
 * The page stays a server component so the header renders in the first paint; the
 * screen below it is a client tree because every filter reads `useSearchParams`,
 * which Next requires to sit under a Suspense boundary or the whole route opts out
 * of static rendering.
 */
export default function AccountsPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader title="Accounts" subtitle="keep_the_logins_working" />

      <Suspense
        fallback={
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <SkeletonTable rows={8} columns={8} />
          </div>
        }
      >
        <AccountsScreen />
      </Suspense>
    </div>
  )
}
