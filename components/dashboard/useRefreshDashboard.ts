'use client'

import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { qk } from '@/lib/api/hooks/keys'

/**
 * The header's REFRESH.
 *
 * It lives here rather than in `lib/api/hooks/useDashboard.ts` for one reason: that
 * file is imported by the topbar (notifications, ⌘K search) and by /accounts
 * (proxies), and Part 9 is being built in a parallel worktree alongside Part 7. This
 * hook wraps no endpoint — it invalidates and toasts, which is screen behaviour —
 * so keeping it in the screen's own folder leaves the shared API layer with a zero
 * diff. `useRefreshFixtures` in `useFixtures.ts` is the same shape; if the two ever
 * want to be one helper, this is the copy to move.
 *
 * Both key roots are invalidated because the strip's counts come from
 * `GET /accounts/stats`, which lives under the accounts root, not the dashboard one.
 */
export function useRefreshDashboard() {
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = React.useState(false)

  const refresh = React.useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.dashboard.all }),
        queryClient.invalidateQueries({ queryKey: qk.accounts.stats() }),
      ])
      toast.success('Dashboard refreshed.')
    } catch {
      toast.error('The dashboard could not be refreshed. Try again in a moment.')
    } finally {
      setRefreshing(false)
    }
  }, [queryClient])

  return { refresh, refreshing }
}
