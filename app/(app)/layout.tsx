import { cookies } from 'next/headers'

import { AppShell } from '@/components/shell/AppShell'
import { SIDEBAR_COOKIE } from '@/components/shell/constants'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Read on the server so the rail renders at its persisted width on first paint
  // instead of snapping after hydration.
  const store = await cookies()
  const collapsed = store.get(SIDEBAR_COOKIE)?.value === 'collapsed'

  return <AppShell defaultCollapsed={collapsed}>{children}</AppShell>
}
