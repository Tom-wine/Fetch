'use client'

import * as React from 'react'
import { Sparkles, Ban } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Prose } from '@/components/ui/typography'
import { getPlatform } from '@/lib/registries/platforms'
import { getProvider } from '@/lib/registries/providers'
import type { Platform } from '@/lib/types'

/**
 * `Actions -> List` opens this (§8.5): pick where the seats go, then confirm.
 *
 * The grid is two columns of tiles rather than a select, because the choice is a
 * BRAND — an operator recognises the StubHub orange before they read the word, and a
 * dropdown throws that away. Every tile that cannot be chosen says why on its own
 * face: a marketplace the club blocks on this fixture, and the two Fetch.io has not
 * integrated yet, are visibly present and visibly unavailable. A marketplace that is
 * simply missing from the list is a marketplace the operator goes looking for.
 */

/** `Auto Listing` / `Auto Delisting` are modes, not marketplaces — hence their own ids. */
export type MarketplaceChoice = Platform | 'auto-list' | 'auto-delist'

const MARKETPLACES: Platform[] = ['viagogo', 'stubhub', 'ticombo', 'gigsberg']

/**
 * The two tiles that are present but not yet wired. `fanpass` carries
 * `available: false` in the platform registry and `seatgeek` is a real provider
 * Fetch.io already knows about — neither is an invented brand, and neither is a
 * placeholder string (§9 rule 5).
 */
const COMING_SOON = [
  { key: 'fanpass', ...pick(getPlatform('fanpass')) },
  { key: 'seatgeek', ...pick(getProvider('seatgeek')) },
]

function pick(info: { name: string; mark: string; color: string }) {
  return { name: info.name, mark: info.mark, color: info.color }
}

export function MarketplacePickerModal({
  open,
  onOpenChange,
  count,
  /** Marketplaces the club blocks on this fixture — the header's `No Viagogo` chips. */
  blockedPlatforms,
  onConfirm,
  busy = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  count: number
  blockedPlatforms: Platform[]
  /** Called with the marketplace the seats should be listed on. */
  onConfirm: (platform: Platform) => void
  busy?: boolean
}) {
  const [choice, setChoice] = React.useState<MarketplaceChoice | null>(null)

  // Reopening on a different selection should not inherit the last answer.
  React.useEffect(() => {
    if (!open) setChoice(null)
  }, [open])

  const blocked = React.useMemo(() => new Set(blockedPlatforms), [blockedPlatforms])
  const firstAllowed = MARKETPLACES.find((id) => !blocked.has(id)) ?? null

  /** What `Confirm` would actually send. `Auto Listing` resolves to a real marketplace. */
  const resolved: Platform | null =
    choice === 'auto-list'
      ? firstAllowed
      : choice && choice !== 'auto-delist'
        ? (choice as Platform)
        : null

  const noun = count === 1 ? 'ticket' : 'tickets'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader className="flex-col items-start gap-1">
          <DialogTitle>Select a marketplace</DialogTitle>
          <DialogDescription>
            {`${count} ${noun} will be listed at the price already on the seat. Nothing is sent until you confirm.`}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {MARKETPLACES.map((id) => {
              const platform = getPlatform(id)
              const isBlocked = blocked.has(id)
              return (
                <Tile
                  key={id}
                  name={platform.name}
                  mark={platform.mark}
                  color={platform.color}
                  caption={isBlocked ? 'Blocked on this fixture' : 'Resale marketplace'}
                  tone={isBlocked ? 'blocked' : 'normal'}
                  selected={choice === id}
                  disabled={isBlocked}
                  onSelect={() => setChoice(id)}
                />
              )
            })}

            <Tile
              name="Auto Listing"
              icon={<Sparkles className="size-4" aria-hidden="true" />}
              caption={
                firstAllowed
                  ? `Fetch.io picks — ${getPlatform(firstAllowed).name}`
                  : 'No marketplace is open on this fixture'
              }
              tone="mode"
              selected={choice === 'auto-list'}
              disabled={!firstAllowed}
              onSelect={() => setChoice('auto-list')}
            />

            <Tile
              name="Auto Delisting"
              icon={<Ban className="size-4" aria-hidden="true" />}
              caption="Pull the seats back off sale"
              tone="mode"
              selected={choice === 'auto-delist'}
              onSelect={() => setChoice('auto-delist')}
            />

            {COMING_SOON.map((tile) => (
              <Tile
                key={tile.key}
                name={tile.name}
                mark={tile.mark}
                color={tile.color}
                caption="Coming soon"
                tone="normal"
                selected={false}
                disabled
                onSelect={() => {}}
              />
            ))}
          </div>

          {choice === 'auto-delist' && (
            <Prose className="mt-3 rounded-md border border-warning/30 bg-warning/12 px-3 py-2 text-warning-ink">
              Fetch.io cannot delist yet. The API can create a listing but has no way to remove one,
              so confirming this would leave the seats exactly where they are.
            </Prose>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" label="Cancel" onClick={() => onOpenChange(false)} />
          <Button
            label="Confirm"
            count={count}
            forward
            disabled={!resolved || busy}
            onClick={() => resolved && onConfirm(resolved)}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Tile({
  name,
  mark,
  color,
  icon,
  caption,
  tone,
  selected,
  disabled = false,
  onSelect,
}: {
  /** A brand or mode name — rendered verbatim (§3.3b guardrail 1). */
  name: string
  mark?: string
  color?: string
  icon?: React.ReactNode
  caption: string
  tone: 'normal' | 'blocked' | 'mode'
  selected: boolean
  disabled?: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'flex items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors duration-150',
        selected
          ? 'border-primary/40 bg-primary/12'
          : 'border-border bg-surface hover:bg-surface-hover',
        disabled && 'cursor-not-allowed opacity-50 hover:bg-surface',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-sm text-caption font-semibold',
          !color && 'border border-border bg-surface-raised text-muted',
        )}
        // The brand colour comes from the registry, so it cannot live in globals.css
        // with the design tokens. Same sanctioned exception as PlatformBadge.
        style={
          color
            ? { backgroundColor: `${color}22`, color, border: `1px solid ${color}44` }
            : undefined
        }
      >
        {icon ?? mark}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-medium text-text">{name}</span>
        <span
          className={cn(
            'block truncate text-caption',
            tone === 'blocked' ? 'text-danger-ink' : 'text-faint',
          )}
        >
          {caption}
        </span>
      </span>
    </button>
  )
}
