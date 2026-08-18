'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

import { cn } from '@/lib/utils'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

/**
 * A two-segment sun|moon pill with the active segment filled — deliberately not a
 * single toggle, so the current theme is readable at a glance rather than inferred
 * from an icon that means "the other one".
 */
export function ThemeSegment() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  // Until mounted, `theme` is unknown on the client and rendering it would
  // hydrate-mismatch. Empty string rather than undefined, so the group is controlled
  // for its whole lifetime — no segment is filled, but React never sees it switch.
  const value = mounted ? (theme === 'light' ? 'light' : 'dark') : ''

  const segment =
    'data-[state=on]:bg-primary/15 data-[state=on]:text-primary-ink text-faint hover:text-text size-7 rounded-sm p-0 transition-colors duration-150'

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => next && setTheme(next)}
      aria-label="Theme"
      className="flex h-9 items-center gap-0.5 rounded-md border border-border bg-surface px-1"
    >
      <ToggleGroupItem value="light" aria-label="Light theme" className={cn(segment)}>
        <Sun className="size-4" aria-hidden="true" />
      </ToggleGroupItem>
      <ToggleGroupItem value="dark" aria-label="Dark theme" className={cn(segment)}>
        <Moon className="size-4" aria-hidden="true" />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
