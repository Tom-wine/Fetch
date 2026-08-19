'use client'

import { Check } from 'lucide-react'

import { useLocale } from '@/lib/format/LocaleProvider'
import { formatDate } from '@/lib/format/date'
import { formatMoney } from '@/lib/format/money'
import { Chip } from '@/components/domain/StatusChip'
import { Button } from '@/components/ui/button'
import { Prose } from '@/components/ui/typography'
import { SettingsCard, SettingRow } from './SettingsCard'

/**
 * Subscription — static, and says so out loud.
 *
 * There is no billing backend and no `GET /subscription`, so every figure here is a
 * fixed constant rather than a number pulled from somewhere. The banner at the top
 * exists because a plausible-looking invoice with no source behind it is the kind of
 * thing an operator screenshots and then acts on.
 *
 * The money and the dates still go through the real formatters, so this tab moves
 * when Preferences moves. A static tab that ignored the locale would be the one place
 * in the app where a date is written differently, which is a worse lie than the
 * numbers being made up.
 */

const PLAN = {
  name: 'Operator',
  priceMinorGbp: 14900,
  seats: 5,
  seatsUsed: 3,
  renewsOn: '2026-09-14T00:00:00.000Z',
  startedOn: '2025-09-14T00:00:00.000Z',
  features: [
    'Unlimited accounts and proxies',
    'Every marketplace Fetch.io integrates',
    'Bulk CSV import with column mapping',
    'Seat-level inventory and price automation',
  ],
}

const INVOICES = [
  { id: 'INV-2026-0912', on: '2025-09-14T00:00:00.000Z', amount: 14900 },
  { id: 'INV-2026-1014', on: '2025-10-14T00:00:00.000Z', amount: 14900 },
  { id: 'INV-2026-1114', on: '2025-11-14T00:00:00.000Z', amount: 14900 },
]

export function SubscriptionTab() {
  const { settings } = useLocale()
  const money = (amount: number) => formatMoney({ amount, currency: 'GBP' }, settings)

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-warning/30 bg-warning/12 px-4 py-3">
        <Prose className="text-[13px] leading-snug text-warning-ink">
          Illustrative only. There is no billing backend behind this tab — the plan, the seat count
          and the invoices below are fixed values in the source, not your account.
        </Prose>
      </div>

      <SettingsCard
        title="Current plan"
        label="what_this_workspace_is_on"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Prose className="text-[12px] leading-snug text-muted">
              Changing plan opens a checkout that does not exist yet.
            </Prose>
            <div className="flex gap-2">
              <Button variant="secondary" label="Change plan" disabled />
              <Button variant="ghost" label="Cancel subscription" disabled />
            </div>
          </div>
        }
      >
        <SettingRow
          label="Plan"
          description="Billed monthly. Every feature Fetch.io ships is included; the plan sets how many operators can sign in."
          control={
            <div className="flex items-center gap-3">
              <Chip tone="success">{PLAN.name}</Chip>
              <span className="font-mono text-body text-text tabular-nums">
                {money(PLAN.priceMinorGbp)}
                <span className="text-muted"> / month</span>
              </span>
            </div>
          }
        />

        <SettingRow
          label="Seats"
          description="One seat per operator signing in. Accounts you manage are unlimited and are not seats."
          control={
            <span className="font-mono text-body text-text tabular-nums">
              {PLAN.seatsUsed} of {PLAN.seats} used
            </span>
          }
        />

        <SettingRow
          label="Renews"
          description={`Started ${formatDate(PLAN.startedOn, settings)}. Renews automatically unless cancelled.`}
          control={
            <span className="font-mono text-body text-text tabular-nums">
              {formatDate(PLAN.renewsOn, settings)}
            </span>
          }
        />

        <SettingRow
          label="Included"
          stacked
          control={
            <ul className="grid gap-2 sm:grid-cols-2">
              {PLAN.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-success-ink" aria-hidden="true" />
                  <Prose className="text-[13px] leading-snug text-muted">{feature}</Prose>
                </li>
              ))}
            </ul>
          }
        />
      </SettingsCard>

      <SettingsCard title="Invoices" label="static_sample">
        {INVOICES.map((invoice) => (
          <SettingRow
            key={invoice.id}
            label={invoice.id}
            description={formatDate(invoice.on, settings)}
            control={
              <div className="flex items-center gap-4">
                <span className="font-mono text-body text-text tabular-nums">
                  {money(invoice.amount)}
                </span>
                <Button variant="ghost" size="sm" label="Download" disabled />
              </div>
            }
          />
        ))}
      </SettingsCard>
    </div>
  )
}
