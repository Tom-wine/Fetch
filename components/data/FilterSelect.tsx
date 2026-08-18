'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/**
 * §7 #9 — outlined, chevron, and an "All X" default so the unfiltered state is a
 * visible choice rather than an empty box.
 */
export interface FilterOption {
  value: string
  /** May be domain data (a club name) — rendered verbatim. */
  label: string
  icon?: React.ReactNode
}

export const ALL = '__all__'

export function FilterSelect({
  value,
  onChange,
  options,
  /** Plural noun for the default row, e.g. `clubs` → "All clubs". */
  noun,
  ariaLabel,
  className,
}: {
  value: string
  onChange: (value: string) => void
  options: FilterOption[]
  noun: string
  ariaLabel?: string
  className?: string
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={ariaLabel ?? `Filter by ${noun}`}
        className={cn(
          // w-auto overrides shadcn's w-full: filters sit beside each other and wrap
          // as a group, rather than each claiming a row of its own.
          'h-9 w-auto min-w-[150px] gap-2 rounded-md border-border bg-surface text-body',
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="border-border bg-surface">
        <SelectItem value={ALL} className="text-body">
          All {noun}
        </SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-body">
            <span className="flex items-center gap-2">
              {o.icon}
              {o.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
