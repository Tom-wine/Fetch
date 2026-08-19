import { DashboardScreen } from '@/components/dashboard/DashboardScreen'

/**
 * `/dashboard` — §8.1.
 *
 * A thin server wrapper, as on every other screen: the data comes from TanStack
 * Query in the client tree, so there is nothing for the server component to do
 * beyond mounting it.
 */
export default function DashboardPage() {
  return <DashboardScreen />
}
