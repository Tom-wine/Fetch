'use client'

import * as React from 'react'
import { Search, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

/**
 * §7 #8 / §9 rule 1: search + filters + right-aligned actions, and it **wraps**.
 *
 * The container is `flex-wrap` with `min-w-0` children and no `overflow-x`
 * anywhere, so at 1280px the actions drop to a second row rather than the bar
 * scrolling sideways. A control bar that scrolls hides controls, and hidden
 * controls on an on-sale morning cost money.
 */
export function Toolbar({
  search,
  filters,
  actions,
  className,
}: {
  search?: React.ReactNode
  filters?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      {search}
      {filters && <div className="flex min-w-0 flex-wrap items-center gap-2">{filters}</div>}
      {actions && (
        // ml-auto only once there is room for it; wrapping resets it to the row start.
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:ml-auto">{actions}</div>
      )}
    </div>
  )
}

export function ToolbarSearch({
  value,
  onChange,
  placeholder = 'Search',
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  const id = React.useId()
  return (
    <div className={cn('relative min-w-[200px] flex-1 sm:max-w-xs', className)}>
      <label htmlFor={id} className="sr-only">
        {placeholder}
      </label>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint"
        aria-hidden="true"
      />
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 border-border bg-surface pr-8 pl-9 text-body"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 items-center justify-center rounded-sm text-faint hover:text-text"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
