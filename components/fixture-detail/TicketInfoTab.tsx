/* eslint-disable @next/next/no-img-element */
'use client'

import * as React from 'react'
import { MousePointerClick } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useLocale } from '@/lib/format/LocaleProvider'
import { formatDateLong } from '@/lib/format/date'
import { Prose, SectionLabel } from '@/components/ui/typography'
import { Chip } from '@/components/domain/StatusChip'
import { Money } from '@/components/domain/Money'
import type { Fixture, Ticket } from '@/lib/types'
import { groupCount, purchaseWindow, seatRange, toLots, totalsByCurrency } from './lots'

/**
 * The `Ticket Info` tab — the panel that made §9's "Keep" list: a persistent context
 * pane instead of a modal, updating live as the selection changes.
 *
 * It is built bottom-up from the SELECTION, never from a row that was clicked once.
 * That is the whole difference between a panel and a modal: shift-select four more
 * seats and every figure here moves, without anything being opened or dismissed.
 */
export function TicketInfoTab({
  fixture,
  tickets,
}: {
  fixture: Fixture
  /** The current selection. */
  tickets: Ticket[]
}) {
  const { settings } = useLocale()

  const lots = React.useMemo(() => toLots(tickets), [tickets])
  const totals = React.useMemo(() => totalsByCurrency(tickets), [tickets])

  if (tickets.length === 0) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 px-6 py-12 text-center">
        <span className="flex size-10 items-center justify-center rounded-md border border-border bg-surface-raised text-faint">
          <MousePointerClick className="size-4" aria-hidden="true" />
        </span>
        <Prose className="max-w-[240px] text-muted">Select a ticket in the table</Prose>
      </div>
    )
  }

  const groups = groupCount(tickets)
  const window = purchaseWindow(tickets)
  const orderIds = [...new Set(tickets.map((t) => t.orderId))]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {/* -------- summary --------------------------------------------- */}
        <div className="rounded-lg border border-border bg-surface-raised p-3">
          <div className="flex items-start gap-3">
            <img
              src={fixture.artworkUrl}
              alt=""
              width={40}
              height={40}
              className="shrink-0 rounded-sm"
              style={{ width: 40, height: 40 }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-body font-semibold text-text">
                {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'} selected
              </p>
              <p className="mt-0.5 text-caption text-muted">
                {groups === 0 ? 'no group' : `${groups} ${groups === 1 ? 'group' : 'groups'}`}
                {window && ` • purchased ${purchasedLabel(window, settings)}`}
              </p>
            </div>
            {totals.map((total) => (
              <Chip key={total.currency} tone="success">
                <Money amount={total.price} currency={total.currency} compact />
              </Chip>
            ))}
          </div>

          <p
            className="mt-3 truncate font-mono text-caption text-faint"
            title={orderIds.join(', ')}
          >
            {orderIds.length === 1
              ? orderIds[0]
              : `${orderIds.length} orders · ${orderIds.slice(0, 2).join(', ')}…`}
          </p>
        </div>

        {/* -------- one card per lot ------------------------------------ */}
        <SectionLabel>{lots.length === 1 ? 'lot' : 'lots'}</SectionLabel>

        {lots.map((lot) => (
          <div key={lot.key} className="rounded-lg border border-border bg-surface p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {/* Domain data — the block is written the way the club writes it. */}
                <p className="truncate text-body font-medium text-text">
                  {lot.block} <span className="text-faint">•</span> Row {lot.row}
                </p>
                <p className="mt-0.5 truncate text-caption text-muted">{lot.levelName}</p>
              </div>
              <Chip tone="primary">
                {lot.tickets.length} {lot.tickets.length === 1 ? 'ticket' : 'tickets'}
              </Chip>
            </div>

            <p className="mt-2 font-mono text-body text-text tabular-nums">
              {seatRange(lot.tickets)}
            </p>

            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="truncate font-mono text-caption text-faint">{lot.orderId}</span>
              <Money
                amount={lot.price}
                currency={lot.currency}
                className="shrink-0 text-body font-semibold text-text"
              />
            </div>
          </div>
        ))}
      </div>

      {/* -------- footer ------------------------------------------------ */}
      <div className="shrink-0 border-t border-border px-4 py-3">
        {totals.map((total) => (
          <div key={total.currency} className="flex items-center justify-between gap-3">
            <div>
              <SectionLabel>total value</SectionLabel>
              <Money
                amount={total.price}
                currency={total.currency}
                className="mt-1 block text-title font-semibold text-success-ink"
              />
            </div>
            <div className="text-right">
              <SectionLabel>average price</SectionLabel>
              <Money
                amount={Math.round(total.price / total.count)}
                currency={total.currency}
                className="mt-1 block text-title font-semibold text-text"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * `12 Mar 2026`, or a span when the seats did not arrive on one day. Both dates go
 * through the app's single formatter (§9 rule 6).
 */
function purchasedLabel(
  window: { first: string; last: string },
  settings: Parameters<typeof formatDateLong>[1],
): string {
  const first = formatDateLong(window.first, settings)
  const last = formatDateLong(window.last, settings)
  return first === last ? first : `${first} – ${last}`
}

/** Kept beside the tab so a loading panel has the same silhouette as a filled one. */
export function TicketInfoSkeletonRow({ className }: { className?: string }) {
  return <div className={cn('h-16 animate-pulse rounded-lg bg-surface-raised', className)} />
}
