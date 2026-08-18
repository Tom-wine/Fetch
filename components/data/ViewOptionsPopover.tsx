'use client'

import * as React from 'react'
import { Check, LayoutGrid, Rows3, Settings2, Table2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { snake } from '@/lib/format/text'
import { SectionLabel } from '@/components/ui/typography'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

/**
 * §7 #10 — view mode, rows per page and density as segmented rows.
 *
 * §7 #7 and §9 rule 3 make the column-visibility picker load-bearing rather than a
 * nicety: mono runs ~12% wider than a proportional face, so a table that fits in
 * Inter at 1280px does not fit here. Hiding a column is the sanctioned fix; shrinking
 * type below 13px is not.
 */

export type Density = 'comfortable' | 'compact'
export type ViewMode = 'table' | 'grid'

export const PAGE_SIZES = [5, 10, 25, 50, 100, 200] as const
export type PageSize = (typeof PAGE_SIZES)[number]

export interface ColumnToggle {
  id: string
  /** Chrome string — the column header, snake_cased for the list. */
  label: string
  visible: boolean
  canHide: boolean
}

export function ViewOptionsPopover({
  density,
  onDensityChange,
  pageSize,
  onPageSizeChange,
  columns,
  onColumnToggle,
  viewMode,
  onViewModeChange,
  className,
}: {
  density: Density
  onDensityChange: (d: Density) => void
  pageSize: number
  onPageSizeChange: (n: number) => void
  columns: ColumnToggle[]
  onColumnToggle: (id: string, visible: boolean) => void
  viewMode?: ViewMode
  onViewModeChange?: (v: ViewMode) => void
  className?: string
}) {
  const hiddenCount = columns.filter((c) => !c.visible).length

  return (
    <Popover>
      <PopoverTrigger
        aria-label="View options"
        className={cn(
          'flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 font-mono text-btn font-semibold text-muted transition-colors duration-150 hover:text-text',
          className,
        )}
      >
        <Settings2 className="size-4" aria-hidden="true" />
        VIEW
        {hiddenCount > 0 && <span className="text-primary-ink">({hiddenCount} hidden)</span>}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[260px] border-border bg-surface p-0">
        {onViewModeChange && viewMode && (
          <Segment label="layout">
            <Row
              active={viewMode === 'table'}
              onClick={() => onViewModeChange('table')}
              icon={<Table2 className="size-4" aria-hidden="true" />}
            >
              table
            </Row>
            <Row
              active={viewMode === 'grid'}
              onClick={() => onViewModeChange('grid')}
              icon={<LayoutGrid className="size-4" aria-hidden="true" />}
            >
              grid
            </Row>
          </Segment>
        )}

        <Segment label="density">
          <Row
            active={density === 'comfortable'}
            onClick={() => onDensityChange('comfortable')}
            icon={<Rows3 className="size-4" aria-hidden="true" />}
          >
            comfortable
          </Row>
          <Row
            active={density === 'compact'}
            onClick={() => onDensityChange('compact')}
            icon={<Rows3 className="size-4" aria-hidden="true" />}
          >
            compact
          </Row>
        </Segment>

        <Segment label="rows per page">
          <div className="flex flex-wrap gap-1.5 px-3 pb-3">
            {PAGE_SIZES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onPageSizeChange(n)}
                aria-pressed={pageSize === n}
                className={cn(
                  'h-7 min-w-9 rounded-sm border px-2 text-caption tabular-nums transition-colors duration-150',
                  pageSize === n
                    ? 'border-primary/30 bg-primary/12 text-primary-ink'
                    : 'border-border text-muted hover:bg-surface-hover hover:text-text',
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </Segment>

        <Segment label="columns" last>
          <div className="max-h-56 overflow-y-auto pb-2">
            {columns.map((c) => (
              <Row
                key={c.id}
                active={c.visible}
                disabled={!c.canHide}
                onClick={() => onColumnToggle(c.id, !c.visible)}
              >
                {snake(c.label)}
              </Row>
            ))}
          </div>
        </Segment>
      </PopoverContent>
    </Popover>
  )
}

function Segment({
  label,
  children,
  last = false,
}: {
  label: string
  children: React.ReactNode
  last?: boolean
}) {
  return (
    <div className={cn(!last && 'border-b border-border')}>
      <div className="px-3 pt-3 pb-1.5">
        <SectionLabel>{label}</SectionLabel>
      </div>
      {children}
    </div>
  )
}

function Row({
  active,
  disabled,
  onClick,
  icon,
  children,
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-1.5 text-left text-body transition-colors duration-150',
        active ? 'text-text' : 'text-muted',
        disabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-surface-hover',
      )}
    >
      {icon}
      <span className="flex-1 truncate">{children}</span>
      {active && <Check className="size-3.5 shrink-0 text-primary" aria-hidden="true" />}
    </button>
  )
}
