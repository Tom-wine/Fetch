'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'

import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { CommandPalette } from './CommandPalette'
import { SIDEBAR_COOKIE } from './constants'
import { SidebarNav } from './SidebarNav'
import { Topbar } from './Topbar'

/**
 * h-screen / overflow-hidden frame — the shell never scrolls, each page owns its
 * own scroll (§4). Below lg the rail becomes an overlay drawer over a scrim.
 */
export function AppShell({
  defaultCollapsed = false,
  children,
}: {
  defaultCollapsed?: boolean
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed)
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [searchOpen, setSearchOpen] = React.useState(false)
  const pathname = usePathname()

  // A drawer that survives navigation would cover the page the user just chose.
  React.useEffect(() => setMobileOpen(false), [pathname])

  /**
   * ⌘K / Ctrl+K, bound on the shell so it works from every screen.
   *
   * Bound on `document` in the capture phase so it fires before a focused input can
   * swallow it — the palette is most useful from the middle of a filter box, which is
   * exactly where a bubbling listener would never see the key. It toggles rather than
   * only opening, so the same chord that summoned it dismisses it.
   */
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) return
      event.preventDefault()
      setSearchOpen((open) => !open)
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [])

  const toggle = React.useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      // Persisted so the rail does not flash open on the next full page load.
      document.cookie = `${SIDEBAR_COOKIE}=${next ? 'collapsed' : 'expanded'}; path=/; max-age=31536000; samesite=lax`
      return next
    })
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-text">
      <SidebarNav collapsed={collapsed} onToggle={toggle} className="hidden shrink-0 lg:flex" />

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 border-0 bg-bg p-0 lg:hidden">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarNav collapsed={false} className="w-64" />
        </SheetContent>
      </Sheet>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <Topbar onOpenNav={() => setMobileOpen(true)} onOpenSearch={() => setSearchOpen(true)} />
        <main className="min-h-0 flex-1 overflow-y-auto px-4 pt-14 pb-10 sm:px-6">{children}</main>
      </div>

      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  )
}
