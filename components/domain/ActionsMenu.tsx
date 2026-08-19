'use client'

import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import { upperSnake, withCount } from '@/lib/format/text'
import { Prose } from '@/components/ui/typography'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/**
 * The selection-driven action surface (§7 #16). Each item is icon + label + a muted
 * description line, because a menu of fourteen verbs is unreadable without them.
 *
 * Destructive items live below a separated `Danger zone` heading (§9 rule 11); the
 * caller still wraps the actual action in a <ConfirmDialog>.
 */

export type ActionTone = 'default' | 'primary' | 'success' | 'warning' | 'violet' | 'danger'

const TONE: Record<ActionTone, string> = {
  default: 'text-text',
  primary: 'text-primary-ink',
  success: 'text-success-ink',
  warning: 'text-warning-ink',
  violet: 'text-violet-ink',
  danger: 'text-danger-ink',
}

export interface ActionItem {
  id: string
  icon: LucideIcon
  /** Chrome string, written normally. UPPER_SNAKE'd here. */
  label: string
  /** The description line. A plain sentence — never `// snake_case`. */
  description: string
  tone?: ActionTone
  /** Appended as ` (N)` outside the snake, e.g. `GROUP (4)`. */
  count?: number
  disabled?: boolean
  /**
   * Hover text. Written for the item that is DISABLED and stays that way — the
   * description says what the item does, and this says why it cannot. A disabled
   * `DropdownMenuItem` takes no pointer events, so the trigger is the wrapper around
   * it rather than the item itself.
   */
  tooltip?: string
  onSelect?: () => void
}

export function ActionsMenu({
  items,
  dangerItems = [],
  /** Menus that act on a selection stay disabled until there is one. */
  selectionCount,
  triggerLabel = 'Actions',
  align = 'end',
  className,
}: {
  items: ActionItem[]
  dangerItems?: ActionItem[]
  selectionCount?: number
  triggerLabel?: string
  align?: 'start' | 'end'
  className?: string
}) {
  const requiresSelection = selectionCount !== undefined
  const disabled = requiresSelection && selectionCount === 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        className={cn(
          'flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 font-mono text-btn font-semibold text-text transition-colors duration-150 hover:bg-surface-hover disabled:pointer-events-none disabled:opacity-50',
          className,
        )}
      >
        {requiresSelection ? withCount(triggerLabel, selectionCount) : upperSnake(triggerLabel)}
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align={align} className="w-[300px] border-border bg-surface">
        {items.map((item) => (
          <Item key={item.id} item={item} />
        ))}

        {dangerItems.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="font-mono text-label text-danger-ink">
              {'// danger_zone'}
            </DropdownMenuLabel>
            {dangerItems.map((item) => (
              <Item key={item.id} item={{ ...item, tone: item.tone ?? 'danger' }} />
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Item({ item }: { item: ActionItem }) {
  const row = <Row item={item} />
  if (!item.tooltip) return row

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="block">{row}</span>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-[260px] font-prose text-prose">
          {item.tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function Row({ item }: { item: ActionItem }) {
  const Icon = item.icon
  return (
    <DropdownMenuItem
      disabled={item.disabled}
      onSelect={item.onSelect}
      className="items-start gap-2.5 py-2"
    >
      <Icon
        className={cn('mt-0.5 size-4 shrink-0', TONE[item.tone ?? 'default'])}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1">
        <span className={cn('block text-body font-medium', TONE[item.tone ?? 'default'])}>
          {item.count === undefined ? upperSnake(item.label) : withCount(item.label, item.count)}
        </span>
        <Prose className="mt-0.5 block text-[12px] leading-snug text-muted">
          {item.description}
        </Prose>
      </span>
    </DropdownMenuItem>
  )
}
