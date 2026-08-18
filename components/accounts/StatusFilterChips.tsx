'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { Chip, StatusChip } from '@/components/domain/StatusChip'
import type { AccountStatus } from '@/lib/types'

/**
 * `All · Active 51 · Needs login 6 · Needs OTP 3 · Locked 3 · Expired 1` (§8.2).
 *
 * Each chip is the real <StatusChip>, so the filter row and the STATUS column are
 * the same colour for the same word — the operator learns one vocabulary, not two.
 * The tooltip is turned off here on purpose: a focusable tooltip trigger nested
 * inside a button is a keyboard trap. The tooltips live on the column chips, where
 * §9 rule 10 wants them.
 *
 * `error` is not in the §8.2 chip row but does occur in the data, so it stays
 * reachable through the toolbar's Status ▾ — a status you cannot filter to is a
 * status you cannot clear.
 */
export const STATUS_CHIP_ORDER: AccountStatus[] = [
  'active',
  'needs_login',
  'needs_otp',
  'locked',
  'expired',
]

const READABLE: Record<AccountStatus, string> = {
  active: 'active',
  needs_login: 'needs login',
  needs_otp: 'needs OTP',
  locked: 'locked',
  expired: 'expired',
  error: 'errored',
}

export function StatusFilterChips({
  counts,
  total,
  value,
  onChange,
  className,
}: {
  counts: Partial<Record<AccountStatus, number>>
  total: number
  value: AccountStatus | null
  onChange: (status: AccountStatus | null) => void
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <FilterChip
        active={value === null}
        count={total}
        label={`Show all ${total} accounts`}
        onClick={() => onChange(null)}
      >
        <Chip tone="neutral">ALL</Chip>
      </FilterChip>

      {STATUS_CHIP_ORDER.map((status) => (
        <FilterChip
          key={status}
          active={value === status}
          count={counts[status] ?? 0}
          label={`Show only ${READABLE[status]} accounts`}
          onClick={() => onChange(value === status ? null : status)}
        >
          <StatusChip status={status} kind="account" withTooltip={false} />
        </FilterChip>
      ))}
    </div>
  )
}

function FilterChip({
  active,
  count,
  label,
  onClick,
  children,
}: {
  active: boolean
  count: number
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      onClick={onClick}
      className={cn(
        'flex h-9 items-center gap-2 rounded-md border px-2.5 transition-colors duration-150',
        active
          ? 'border-primary/40 bg-primary/8'
          : 'border-border bg-surface hover:bg-surface-hover',
        // A zero-count filter still works, it just has nothing behind it today.
        count === 0 && !active && 'opacity-55',
      )}
    >
      {children}
      <span className={cn('text-caption tabular-nums', active ? 'text-primary-ink' : 'text-faint')}>
        {count}
      </span>
    </button>
  )
}
