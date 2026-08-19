'use client'

import * as React from 'react'
import { Coins } from 'lucide-react'

import { cn } from '@/lib/utils'
import { withCount } from '@/lib/format/text'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Prose, SectionLabel } from '@/components/ui/typography'
import { Money, Num, Percent } from '@/components/domain/Money'
import type { Ticket, TicketStatus } from '@/lib/types'
import { totalsByCurrency } from './lots'

/**
 * `Finance (N)` — the first thing in the §8.5 toolbar, and the only place on the
 * screen that answers "am I up or down on this fixture".
 *
 * With a selection it describes the selection; with none it describes every seat on
 * the fixture, because an empty popover would be a control that punishes the operator
 * for not having clicked yet. The heading says which of the two it is, every time —
 * a money figure whose scope is ambiguous is worse than no figure.
 */
const STATUS_ORDER: TicketStatus[] = ['ticket', 'listed', 'sold', 'transferred']

const STATUS_TONE: Record<TicketStatus, string> = {
  ticket: 'text-muted',
  listed: 'text-success-ink',
  sold: 'text-violet-ink',
  transferred: 'text-warning-ink',
}

export function FinancePopover({
  tickets,
  selectionCount,
  scoped,
}: {
  /** The seats being summarised — the selection, or the whole fixture. */
  tickets: Ticket[]
  /** Drives the label's `(N)`, which always counts the SELECTION (§8.5). */
  selectionCount: number
  /** True when `tickets` is the selection rather than the fixture. */
  scoped: boolean
}) {
  const totals = React.useMemo(() => totalsByCurrency(tickets), [tickets])

  const byStatus = React.useMemo(() => {
    const map = new Map<TicketStatus, number>()
    for (const ticket of tickets) map.set(ticket.status, (map.get(ticket.status) ?? 0) + 1)
    return map
  }, [tickets])

  return (
    <Popover>
      <PopoverTrigger
        aria-label="Finance summary"
        className={cn(
          'flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 font-mono text-btn font-semibold text-text transition-colors duration-150 hover:bg-surface-hover',
        )}
      >
        <Coins className="size-4 text-success-ink" aria-hidden="true" />
        {withCount('Finance', selectionCount)}
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[320px] border-border bg-surface p-0">
        <div className="border-b border-border px-3 pt-3 pb-2">
          <SectionLabel>{scoped ? 'selected seats' : 'every seat on this fixture'}</SectionLabel>
        </div>

        {tickets.length === 0 ? (
          <Prose className="px-3 py-4 text-muted">
            There are no seats to add up yet. They arrive with the fixture&rsquo;s inventory.
          </Prose>
        ) : (
          <>
            {totals.map((total) => {
              const uplift = total.price - total.faceValue
              const ratio = total.faceValue === 0 ? 0 : uplift / total.faceValue
              return (
                <div key={total.currency} className="space-y-2 border-b border-border px-3 py-3">
                  <Line label="Asking">
                    <Money
                      amount={total.price}
                      currency={total.currency}
                      className="font-semibold text-success-ink"
                    />
                  </Line>
                  <Line label="Face value">
                    <Money
                      amount={total.faceValue}
                      currency={total.currency}
                      className="text-muted"
                    />
                  </Line>
                  <Line label={uplift < 0 ? 'Below face' : 'Above face'}>
                    <span className="flex items-center gap-1.5">
                      <Money
                        amount={uplift}
                        currency={total.currency}
                        signed
                        className={cn(
                          'font-semibold',
                          uplift < 0 ? 'text-danger-ink' : 'text-success-ink',
                        )}
                      />
                      <Percent
                        value={ratio}
                        className={cn(
                          'text-caption',
                          uplift < 0 ? 'text-danger-ink' : 'text-success-ink',
                        )}
                      />
                    </span>
                  </Line>
                  <Line label="Average per seat">
                    <Money
                      amount={Math.round(total.price / total.count)}
                      currency={total.currency}
                      className="text-text"
                    />
                  </Line>
                </div>
              )
            })}

            <div className="px-3 py-3">
              <SectionLabel className="mb-2">by status</SectionLabel>
              <div className="space-y-1.5">
                {STATUS_ORDER.filter((status) => byStatus.has(status)).map((status) => (
                  <Line key={status} label={status.replace(/_/g, ' ')}>
                    <Num
                      value={byStatus.get(status) ?? 0}
                      className={cn('font-semibold', STATUS_TONE[status])}
                    />
                  </Line>
                ))}
              </div>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-caption text-muted uppercase">{label}</span>
      {children}
    </div>
  )
}
