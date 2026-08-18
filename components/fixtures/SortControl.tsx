'use client'

import { ArrowDownWideNarrow, ArrowUpNarrowWide } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * `Sort ▾` plus an asc/desc toggle, both backed by the `sort` / `order` query params
 * and sent to the API.
 *
 * The table's own column headers are deliberately inert here (`enableSorting: false`
 * on every column): DataTable sorts only the rows it has been handed, and under
 * server paging that would sort page 1 of 14 fixtures and present it as if it had
 * sorted all of them. Same pattern session-a settled on for /accounts (fetch-sync.md,
 * 21:52) — one product, one sorting model. When DataTable grows `sorting` /
 * `onSortingChange`, this control comes out and the headers go live.
 */
export interface SortOption {
  /** A field path the API can sort by — dotted paths allowed (`counts.total`). */
  value: string
  /** Chrome label, written normally. */
  label: string
}

export const FIXTURE_SORTS: SortOption[] = [
  { value: 'kickoff', label: 'Kickoff' },
  { value: 'valueAtRisk', label: 'Value at risk' },
  { value: 'counts.total', label: 'Tickets' },
  { value: 'counts.listed', label: 'Listed' },
  { value: 'counts.sold', label: 'Sold' },
  { value: 'counts.transferred', label: 'Transferred' },
  { value: 'venue.name', label: 'Venue' },
]

export function SortControl({
  sort,
  order,
  onSortChange,
  onOrderChange,
  className,
}: {
  sort: string
  order: 'asc' | 'desc'
  onSortChange: (sort: string) => void
  onOrderChange: (order: 'asc' | 'desc') => void
  className?: string
}) {
  const Icon = order === 'asc' ? ArrowUpNarrowWide : ArrowDownWideNarrow
  const next = order === 'asc' ? 'desc' : 'asc'

  return (
    <div className={cn('flex shrink-0 items-center gap-1', className)}>
      <Select value={sort} onValueChange={onSortChange}>
        <SelectTrigger
          aria-label="Sort by"
          className="h-9 w-auto min-w-[150px] gap-2 rounded-md border-border bg-surface text-body"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-border bg-surface">
          {FIXTURE_SORTS.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-body">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => onOrderChange(next)}
              aria-label={order === 'asc' ? 'Sorted ascending' : 'Sorted descending'}
              className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-muted transition-colors duration-150 hover:bg-surface-hover hover:text-text"
            >
              <Icon className="size-4" aria-hidden="true" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-[240px] font-prose text-prose">
            {order === 'asc'
              ? 'Smallest first — the soonest kickoff at the top. Click for the reverse.'
              : 'Largest first — the furthest kickoff at the top. Click for the reverse.'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
