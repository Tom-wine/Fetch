'use client'

import * as React from 'react'
import { Check, ChevronDown, Store } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SectionLabel } from '@/components/ui/typography'
import { PLATFORMS } from '@/lib/registries/platforms'
import type { Platform } from '@/lib/types'

/**
 * §8.6 puts TWO platform controls in the toolbar: `Platform ▾` and a row of toggle
 * chips. They are one piece of state with two surfaces, not two filters — the chips
 * are the fast path an operator hits during an on-sale, the ▾ is the same set in a
 * form that survives a narrow viewport. Both write the same repeated `platform` key,
 * which the API reads as OR (§6.2), so they can never disagree about what is on
 * screen.
 *
 * §8.6 names four chips — the marketplaces Fetch.io lists on. `fanpass` is in the
 * registry as `available: false`, so it gets no chip, but it DOES occur in the data
 * (listings created before it was switched off), and a platform you cannot filter to
 * is a platform you cannot clear. So the ▾ carries every platform and says which one
 * is no longer available; the chip row carries the four the spec asks for.
 */
const CHIP_PLATFORMS = PLATFORMS.filter((p) => p.available)

export function PlatformFilter({
  value,
  onChange,
  className,
}: {
  value: Platform[]
  onChange: (next: Platform[]) => void
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const active = value.length > 0

  const label = !active
    ? 'All platforms'
    : value.length === 1
      ? (PLATFORMS.find((p) => p.id === value[0])?.name ?? 'Platform')
      : `${value.length} platforms`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="Filter by platform"
        className={cn(
          'flex h-9 w-auto max-w-[220px] min-w-[150px] items-center gap-2 rounded-md border border-border bg-surface px-3 text-body text-text transition-colors duration-150 hover:bg-surface-hover',
          active && 'border-primary/30 bg-primary/8 text-primary-ink',
          className,
        )}
      >
        <Store className="size-4 shrink-0 text-faint" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden="true" />
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[240px] border-border bg-surface p-0">
        <div className="px-3 pt-3 pb-1.5">
          <SectionLabel>platforms</SectionLabel>
        </div>
        <div className="pb-2">
          <Row selected={!active} onClick={() => select([])}>
            <span className="flex-1 truncate text-left">All platforms</span>
          </Row>
          {PLATFORMS.map((platform) => {
            const selected = value.includes(platform.id)
            return (
              <Row
                key={platform.id}
                selected={selected}
                onClick={() =>
                  select(
                    selected ? value.filter((id) => id !== platform.id) : [...value, platform.id],
                  )
                }
              >
                <BrandDot color={platform.color} />
                {/* Brand names render verbatim — `StubHub`, never `stubhub`. */}
                <span className="min-w-0 flex-1 truncate text-left">{platform.name}</span>
                {!platform.available && (
                  <span className="shrink-0 text-caption text-faint">not available</span>
                )}
              </Row>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )

  function select(next: Platform[]) {
    // The popover stays open: picking three marketplaces should not cost three clicks
    // on the trigger.
    onChange(next)
  }
}

/**
 * The toggle-chip row. Each chip carries the marketplace's own brand dot, so the row
 * is scannable by colour before it is read — the same colour the PLATFORM column
 * uses for that marketplace.
 */
export function PlatformChips({
  value,
  onChange,
  className,
}: {
  value: Platform[]
  onChange: (next: Platform[]) => void
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {CHIP_PLATFORMS.map((platform) => {
        const active = value.includes(platform.id)
        return (
          <button
            key={platform.id}
            type="button"
            aria-pressed={active}
            aria-label={
              active
                ? `Stop showing only ${platform.name} listings`
                : `Show ${platform.name} listings`
            }
            onClick={() =>
              onChange(active ? value.filter((id) => id !== platform.id) : [...value, platform.id])
            }
            className={cn(
              'flex h-8 items-center gap-2 rounded-md border px-2.5 text-body transition-colors duration-150',
              active
                ? 'border-primary/40 bg-primary/8 text-primary-ink'
                : 'border-border bg-surface text-muted hover:bg-surface-hover hover:text-text',
            )}
          >
            <BrandDot color={platform.color} />
            {platform.name}
          </button>
        )
      })}
    </div>
  )
}

/** The registry owns the brand colour, so it cannot live in globals.css. */
function BrandDot({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      className="size-2 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  )
}

function Row({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-1.5 text-body transition-colors duration-150 hover:bg-surface-hover',
        selected ? 'text-text' : 'text-muted',
      )}
    >
      {children}
      {selected && <Check className="size-3.5 shrink-0 text-primary" aria-hidden="true" />}
    </button>
  )
}
