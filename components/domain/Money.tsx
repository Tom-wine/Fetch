'use client'

import { cn } from '@/lib/utils'
import { useLocale } from '@/lib/format/LocaleProvider'
import {
  formatMoney,
  formatNumber,
  formatPercent,
  normalise,
  type MoneyValue,
} from '@/lib/format/money'
import type { Currency } from '@/lib/format/locale'

/**
 * Every monetary value in the app renders through here (§7 #28).
 *
 * - Takes integer MINOR UNITS plus a currency, never a float (§6.2).
 * - Formats through the single locale setting — no component calls Intl itself.
 * - Carries `.money`, so the app-wide privacy blur catches it automatically.
 * - Applies the display-currency normaliser and marks a converted value `≈`, so a
 *   rate-derived figure is never mistaken for the real one (§9 rule 7).
 */
export function Money({
  amount,
  currency,
  /** Skip the display-currency normaliser and show the row's own currency. */
  original = false,
  compact = false,
  signed = false,
  className,
}: {
  amount: number
  currency: Currency
  original?: boolean
  compact?: boolean
  signed?: boolean
  className?: string
}) {
  const { settings } = useLocale()
  const raw: MoneyValue = { amount, currency }
  const { value, converted } = original
    ? { value: raw, converted: false }
    : normalise(raw, settings)

  const text = formatMoney(value, settings, {
    compact,
    signDisplay: signed ? 'exceptZero' : undefined,
  })

  return (
    <span
      className={cn('money tabular-nums', className)}
      title={converted ? `Converted from ${formatMoney(raw, settings)}` : undefined}
    >
      {converted ? '≈' : ''}
      {text}
    </span>
  )
}

/** Loyalty points, ticket counts, row totals — the number formatter, same seam. */
export function Num({
  value,
  className,
  ...options
}: { value: number; className?: string } & Intl.NumberFormatOptions) {
  const { settings } = useLocale()
  return (
    <span className={cn('tabular-nums', className)}>{formatNumber(value, settings, options)}</span>
  )
}

/** Delta chips on StatTile. Positive is success, negative is danger. */
export function Percent({ value, className }: { value: number; className?: string }) {
  const { settings } = useLocale()
  return <span className={cn('tabular-nums', className)}>{formatPercent(value, settings)}</span>
}
