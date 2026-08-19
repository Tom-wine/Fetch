'use client'

import * as React from 'react'
import { Search, TrendingUp } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useLocale } from '@/lib/format/LocaleProvider'
import { formatRelative } from '@/lib/format/date'
import { convertMinor, CURRENCY_OPTIONS, type Currency } from '@/lib/format/locale'
import { formatMoney } from '@/lib/format/money'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Prose, SectionLabel } from '@/components/ui/typography'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PlatformBadge } from '@/components/domain/PlatformBadge'
import { StatusChip } from '@/components/domain/StatusChip'
import { ErrorState } from '@/components/data/states'
import { useComparables, type ComparablesQuery } from '@/lib/api/hooks/useFixtureDetail'
import type { Fixture, Listing } from '@/lib/types'

/**
 * The `Fixture Info` tab — §8.5's comparable-sales lookup.
 *
 * There is no comparables endpoint, and inventing one would mean inventing the prices
 * with it. So `Live prices` and `Recent sales` are the REAL listings on this fixture,
 * read through `GET /listings`: what is buyable right now, and what has already gone.
 * Every figure on this tab is one the operator can go and check.
 *
 * The lookup does not run itself. It opens on an empty state and fetches when the
 * search button is pressed, because a panel that quietly re-queries every time the
 * block dropdown moves is a panel whose numbers nobody trusts.
 */

const ANY_BLOCK = '__any__'
const ORIGINAL = '__original__'

type DisplayCurrency = Currency | typeof ORIGINAL

export function FixtureInfoTab({ fixture, blocks }: { fixture: Fixture; blocks: string[] }) {
  const { settings } = useLocale()

  const [block, setBlock] = React.useState<string>(ANY_BLOCK)
  const [currency, setCurrency] = React.useState<DisplayCurrency>(
    settings.displayCurrency ?? ORIGINAL,
  )
  const [qty, setQty] = React.useState('1')

  const [query, setQuery] = React.useState<ComparablesQuery | null>(null)
  const comparables = useComparables(query)

  const quantity = Math.max(1, Math.floor(Number(qty) || 1))

  const search = React.useCallback(() => {
    setQuery({
      fixtureId: fixture.id,
      block: block === ANY_BLOCK ? null : block,
      qty: quantity,
    })
  }, [block, fixture.id, quantity])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* -------- the lookup form ---------------------------------------- */}
      <form
        className="shrink-0 space-y-3 border-b border-border px-4 py-4"
        onSubmit={(event) => {
          event.preventDefault()
          search()
        }}
      >
        {/* A real two-column grid: label above field, both columns the same width, so
            the three controls line up instead of drifting as their values change. */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Block" htmlFor="cmp-block">
            <Select value={block} onValueChange={setBlock}>
              <SelectTrigger
                id="cmp-block"
                className="h-9 w-full rounded-md border-border bg-surface text-body"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border bg-surface">
                <SelectItem value={ANY_BLOCK} className="text-body">
                  All blocks
                </SelectItem>
                {blocks.map((name) => (
                  <SelectItem key={name} value={name} className="text-body">
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Currency" htmlFor="cmp-currency">
            <Select
              value={currency}
              onValueChange={(value) => setCurrency(value as DisplayCurrency)}
            >
              <SelectTrigger
                id="cmp-currency"
                className="h-9 w-full rounded-md border-border bg-surface text-body"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border bg-surface">
                <SelectItem value={ORIGINAL} className="text-body">
                  Original
                </SelectItem>
                {CURRENCY_OPTIONS.map((code) => (
                  <SelectItem key={code} value={code} className="text-body">
                    {code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Qty" htmlFor="cmp-qty">
            <Input
              id="cmp-qty"
              value={qty}
              inputMode="numeric"
              onChange={(event) => setQty(event.target.value)}
              className="h-9 border-border bg-surface text-body tabular-nums"
            />
          </Field>

          <div className="flex items-end">
            <Button type="submit" label="Search" className="w-full" disabled={comparables.loading}>
              <Search className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </form>

      {/* -------- the results ------------------------------------------- */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {!query ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 px-6 py-10 text-center">
            <span className="flex size-10 items-center justify-center rounded-md border border-border bg-surface-raised text-faint">
              <TrendingUp className="size-4" aria-hidden="true" />
            </span>
            <Prose className="max-w-[260px] text-muted">
              Pick a block and a quantity, then search to see what the same seats are going for.
            </Prose>
          </div>
        ) : comparables.error ? (
          <ErrorState message={comparables.error} onRetry={comparables.onRetry} />
        ) : comparables.loading ? (
          <div className="space-y-2 px-4 py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-border">
            <ResultList
              title="Live prices"
              empty="Nothing is on sale for this block and quantity right now."
              listings={comparables.live}
              currency={currency}
              settings={settings}
            />
            <ResultList
              title="Recent sales"
              empty="Nothing matching has sold yet."
              listings={comparables.sold}
              currency={currency}
              settings={settings}
              relative
            />
          </div>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={htmlFor} className="font-mono text-label text-muted uppercase">
        {label}
      </Label>
      {children}
    </div>
  )
}

function ResultList({
  title,
  empty,
  listings,
  currency,
  settings,
  relative = false,
}: {
  title: string
  empty: string
  listings: Listing[]
  currency: DisplayCurrency
  settings: ReturnType<typeof useLocale>['settings']
  relative?: boolean
}) {
  return (
    <section className="px-4 py-3">
      <div className="flex items-center justify-between">
        <SectionLabel>{title}</SectionLabel>
        <span className="text-caption text-faint tabular-nums">{listings.length}</span>
      </div>

      {listings.length === 0 ? (
        <Prose className="mt-2 text-muted">{empty}</Prose>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {listings.map((listing) => (
            <li
              key={listing.id}
              className="flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-2"
            >
              <PlatformBadge platform={listing.platform} showName={false} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body text-text">{listing.block}</span>
                <span className="block truncate text-caption text-faint">
                  {listing.quantity} {listing.quantity === 1 ? 'seat' : 'seats'}
                  {relative && ` · ${formatRelative(listing.createdAt, settings).text}`}
                </span>
              </span>
              {relative ? (
                <StatusChip status={listing.status} kind="listing" withTooltip={false} />
              ) : (
                <StatusChip status={listing.status} kind="listing" />
              )}
              <Price listing={listing} display={currency} settings={settings} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/**
 * The tab's own money renderer, because the `Currency` control is local to the lookup
 * rather than the app-wide normaliser `Money` reads. It keeps the two things that
 * matter: the `.money` class, so the privacy blur still catches it, and the `≈` on a
 * converted figure, so a rate-derived price is never mistaken for the real one.
 */
function Price({
  listing,
  display,
  settings,
}: {
  listing: Listing
  display: DisplayCurrency
  settings: ReturnType<typeof useLocale>['settings']
}) {
  const converted = display !== ORIGINAL && display !== listing.currency
  const value = converted
    ? { amount: convertMinor(listing.price, listing.currency, display), currency: display }
    : { amount: listing.price, currency: listing.currency }

  return (
    <span
      className={cn('money shrink-0 text-body font-semibold text-text tabular-nums')}
      title={
        converted
          ? `Converted from ${formatMoney({ amount: listing.price, currency: listing.currency }, settings)}`
          : undefined
      }
    >
      {converted ? '≈' : ''}
      {formatMoney(value, settings)}
    </span>
  )
}
