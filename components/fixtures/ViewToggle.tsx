'use client'

import { LayoutGrid, Table2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { FixtureView } from './filters'

/**
 * `⊞` — table or grid (§8.4). Two icons, one row, both labelled: §11 requires an
 * accessible name and a tooltip on every icon-only control, and a segmented pair is
 * the one place a screen may say the same thing twice.
 */
export function ViewToggle({
  value,
  onChange,
  className,
}: {
  value: FixtureView
  onChange: (view: FixtureView) => void
  className?: string
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <div
        role="group"
        aria-label="Layout"
        className={cn(
          'flex h-9 shrink-0 items-center gap-0.5 rounded-md border border-border bg-surface p-0.5',
          className,
        )}
      >
        <Item
          active={value === 'table'}
          onClick={() => onChange('table')}
          label="Table view"
          hint="One row per fixture, with every column."
        >
          <Table2 className="size-4" aria-hidden="true" />
        </Item>
        <Item
          active={value === 'grid'}
          onClick={() => onChange('grid')}
          label="Grid view"
          hint="The same fixtures as cards — crest, kickoff, counts and value at risk."
        >
          <LayoutGrid className="size-4" aria-hidden="true" />
        </Item>
      </div>
    </TooltipProvider>
  )
}

function Item({
  active,
  onClick,
  label,
  hint,
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-pressed={active}
          aria-label={label}
          className={cn(
            'flex size-7 items-center justify-center rounded-sm transition-colors duration-150',
            active
              ? 'bg-primary/12 text-primary-ink'
              : 'text-muted hover:bg-surface-hover hover:text-text',
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-[240px] font-prose text-prose">{hint}</TooltipContent>
    </Tooltip>
  )
}
