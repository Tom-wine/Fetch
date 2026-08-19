'use client'

import * as React from 'react'
import { Check, ChevronDown, Coins } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SectionLabel } from '@/components/ui/typography'
import { DISPLAY_OPTIONS, ORIGINAL, type DisplayCurrency } from './currency'

/**
 * `Show in: GBP ▾` (§8.6, §9 rule 7).
 *
 * A popover rather than a <Select> for one reason: the footer. Conversion is the one
 * place this screen shows a number nobody entered, and the operator has to be told —
 * once, where the choice is made — that it is for reading only. Everything the screen
 * writes (an inline edit, a reprice) is committed in the listing's own currency, and
 * `?sort=price` orders by that same figure, not by the converted one.
 */
export function CurrencySelect({
  value,
  onChange,
  className,
}: {
  value: DisplayCurrency
  onChange: (next: DisplayCurrency) => void
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const current = DISPLAY_OPTIONS.find((o) => o.value === value) ?? DISPLAY_OPTIONS[0]!

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="Show prices in"
        className={cn(
          'flex h-9 w-auto items-center gap-2 rounded-md border border-border bg-surface px-3 text-body text-text transition-colors duration-150 hover:bg-surface-hover',
          value !== ORIGINAL && 'border-primary/30 bg-primary/8 text-primary-ink',
          className,
        )}
      >
        <Coins className="size-4 shrink-0 text-faint" aria-hidden="true" />
        <span className="text-muted">Show in:</span>
        <span className="font-semibold">{current.label}</span>
        <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden="true" />
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[260px] border-border bg-surface p-0">
        <div className="px-3 pt-3 pb-1.5">
          <SectionLabel>show prices in</SectionLabel>
        </div>
        <div className="pb-2">
          {DISPLAY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={option.value === value}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-1.5 text-body transition-colors duration-150 hover:bg-surface-hover',
                option.value === value ? 'text-text' : 'text-muted',
              )}
            >
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate">{option.label}</span>
                <span className="block truncate text-caption text-faint">{option.hint}</span>
              </span>
              {option.value === value && (
                <Check className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
        <p className="border-t border-border px-3 py-2.5 font-prose text-prose text-muted">
          Converted figures are marked <span className="text-text">≈</span> and carry the original
          in a tooltip. Prices are edited, saved and sorted in the currency the listing was created
          in.
        </p>
      </PopoverContent>
    </Popover>
  )
}
