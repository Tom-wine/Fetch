'use client'

import * as React from 'react'
import { Check, RotateCw, Search, SlidersHorizontal } from 'lucide-react'

import { cn } from '@/lib/utils'
import { ALL } from '@/components/data/FilterSelect'
import { SectionLabel } from '@/components/ui/typography'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { PROVIDERS } from '@/lib/registries/providers'
import { useAccounts } from '@/lib/api/hooks/useAccounts'
import type { AccountFilters } from '@/lib/api/endpoints'
import { REGIONS, type FixtureFilterControls } from './filters'

/**
 * The long tail of the toolbar (§8.4): one search box over providers, regions and
 * accounts, plus the per-provider `Refresh all`.
 *
 * These three live in a popover rather than on the bar because they are the filters
 * an operator sets once a week, not once a minute — and because a toolbar that needs
 * three rows of selects at 1280px is the thing §9 rule 1 exists to prevent.
 *
 * `Refresh all` is honest about what it does: it re-asks the API for that provider's
 * fixtures. It does not claim to have re-scraped a club site, because nothing here
 * did.
 */
export function FixtureFiltersPopover({
  filters,
  onRefreshProvider,
  refreshing,
  className,
}: {
  filters: FixtureFilterControls
  onRefreshProvider: (label: string) => void
  refreshing: boolean
  className?: string
}) {
  const { state, set, clear, activeCount } = filters
  const [term, setTerm] = React.useState('')
  const needle = term.trim().toLowerCase()

  const providers = PROVIDERS.filter((p) => !needle || p.name.toLowerCase().includes(needle))
  const regions = REGIONS.filter((r) => !needle || r.label.toLowerCase().includes(needle))

  // Same key shape as AccountPicker, so the two share one cache entry.
  const accountFilters = React.useMemo<AccountFilters>(
    () => ({ pageSize: 50, sort: 'email', order: 'asc', q: needle || undefined }),
    [needle],
  )
  const accounts = useAccounts(accountFilters)
  const accountRows = (accounts.data?.data ?? []).slice(0, 6)

  return (
    <Popover>
      <PopoverTrigger
        aria-label="More filters"
        className={cn(
          'flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 font-mono text-btn font-semibold text-muted transition-colors duration-150 hover:text-text',
          activeCount > 0 && 'border-primary/30 bg-primary/8 text-primary-ink',
          className,
        )}
      >
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        FILTERS
        {activeCount > 0 && <span className="tabular-nums">({activeCount})</span>}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[340px] border-border bg-surface p-0">
        <div className="relative border-b border-border p-2">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-3.5 -translate-y-1/2 text-faint"
            aria-hidden="true"
          />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search providers, regions and accounts"
            aria-label="Search providers, regions and accounts"
            className="h-8 border-border bg-surface-raised pl-8 text-body"
          />
        </div>

        <div className="max-h-[380px] overflow-y-auto">
          <Section label="providers">
            {providers.length === 0 ? (
              <Nothing>No provider matches that search.</Nothing>
            ) : (
              providers.map((provider) => {
                const on = state.providers.includes(provider.id)
                return (
                  <div
                    key={provider.id}
                    className="flex items-center gap-1 pr-2 transition-colors duration-150 hover:bg-surface-hover"
                  >
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        set({
                          providers: on
                            ? state.providers.filter((p) => p !== provider.id)
                            : [...state.providers, provider.id],
                        })
                      }
                      className={cn(
                        'flex min-w-0 flex-1 items-center gap-2 px-3 py-1.5 text-left text-body',
                        on ? 'text-text' : 'text-muted',
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className="flex size-5 shrink-0 items-center justify-center rounded-sm text-chip font-semibold text-white"
                        style={{ backgroundColor: provider.color }}
                      >
                        {provider.mark}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{provider.name}</span>
                      {on && (
                        <Check className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={refreshing}
                      onClick={() => onRefreshProvider(provider.name)}
                      aria-label={`Refresh all ${provider.name} accounts`}
                      className="flex shrink-0 items-center gap-1.5 rounded-sm px-2 py-1 font-mono text-caption font-semibold tracking-[0.06em] text-faint transition-colors duration-150 hover:bg-surface-raised hover:text-primary-ink disabled:opacity-40"
                    >
                      <RotateCw
                        className={cn('size-3', refreshing && 'animate-spin')}
                        aria-hidden="true"
                      />
                      REFRESH_ALL
                    </button>
                  </div>
                )
              })
            )}
          </Section>

          <Section label="regions">
            <Row selected={state.region === ALL} onClick={() => set({ region: ALL })}>
              <span className="flex-1 truncate text-left">All regions</span>
            </Row>
            {regions.map((region) => (
              <Row
                key={region.id}
                selected={state.region === region.id}
                onClick={() => set({ region: state.region === region.id ? ALL : region.id })}
              >
                <span className="min-w-0 flex-1 truncate text-left">{region.label}</span>
                <span className="text-caption text-faint tabular-nums">
                  {region.clubs.length} {region.clubs.length === 1 ? 'club' : 'clubs'}
                </span>
              </Row>
            ))}
            {regions.length === 0 && <Nothing>No region matches that search.</Nothing>}
          </Section>

          <Section label="accounts" last>
            <Row selected={state.accountId === ALL} onClick={() => set({ accountId: ALL })}>
              <span className="flex-1 truncate text-left">All accounts</span>
            </Row>
            {accounts.isPending ? (
              <Nothing>Loading accounts…</Nothing>
            ) : accountRows.length === 0 ? (
              <Nothing>No account matches that search.</Nothing>
            ) : (
              accountRows.map((account) => (
                <Row
                  key={account.id}
                  selected={state.accountId === account.id}
                  onClick={() =>
                    set({ accountId: state.accountId === account.id ? ALL : account.id })
                  }
                >
                  <span className="min-w-0 flex-1 truncate text-left">{account.email}</span>
                </Row>
              ))
            )}
          </Section>
        </div>

        {activeCount > 0 && (
          <div className="border-t border-border p-2">
            <button
              type="button"
              onClick={clear}
              className="w-full rounded-sm px-3 py-1.5 text-center font-mono text-btn font-semibold text-muted transition-colors duration-150 hover:bg-surface-hover hover:text-text"
            >
              CLEAR_FILTERS ({activeCount})
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

function Section({
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
      <div className="pb-2">{children}</div>
    </div>
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

function Nothing({ children }: { children: React.ReactNode }) {
  return <p className="px-3 py-2 font-prose text-prose text-muted">{children}</p>
}
