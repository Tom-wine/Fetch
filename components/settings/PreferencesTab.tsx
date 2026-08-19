'use client'

import * as React from 'react'
import { toast } from 'sonner'

import { useLocale, type Density } from '@/lib/format/LocaleProvider'
import {
  CURRENCY_OPTIONS,
  LOCALE_OPTIONS,
  TIMEZONE_OPTIONS,
  type Currency,
} from '@/lib/format/locale'
import { formatDateTime } from '@/lib/format/date'
import { formatMoney } from '@/lib/format/money'
import { PAGE_SIZES } from '@/components/data/ViewOptionsPopover'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Prose } from '@/components/ui/typography'
import { SettingsCard, SettingRow } from './SettingsCard'

/**
 * Preferences — the one place the app's formatting and chrome defaults are set.
 *
 * Locale, timezone and display currency write straight to the LocaleProvider, which
 * is the single setting every date and every money figure in Fetch.io is rendered
 * from (§9 rule 6). There is no second store and no per-screen override: change the
 * currency here and /mylistings and /mytickets change with it, because they were
 * never formatting anything themselves.
 *
 * The preview row below the selects is not decoration. A timezone and a locale are
 * abstract until you see the date they produce, and the whole point of this card is
 * that one setting drives everything — so it shows the output rather than describing
 * it.
 */

/** `displayCurrency: null` means "leave every row in its own currency". */
const ORIGINAL = '__original__'

export function PreferencesTab() {
  const {
    settings,
    ui,
    setLocale,
    setTimeZone,
    setDisplayCurrency,
    setDensity,
    setPageSize,
    setReducedMotion,
    reset,
  } = useLocale()

  // A fixed instant and a fixed amount, so the preview only ever moves because a
  // setting moved.
  const sample = React.useMemo(() => new Date('2026-08-22T14:00:00Z'), [])

  return (
    <div className="space-y-6">
      <SettingsCard
        title="Formatting"
        label="one_setting_every_date_and_price_reads"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-caption text-muted">{'// preview'}</span>
            <span className="font-mono text-body text-text tabular-nums">
              {formatDateTime(sample, settings)}
              <span className="mx-2 text-faint">·</span>
              {formatMoney(
                { amount: 24550, currency: settings.displayCurrency ?? 'GBP' },
                settings,
              )}
            </span>
          </div>
        }
      >
        <SettingRow
          label="Language"
          description="Decides how dates, numbers and currency are written — 22/08/2026 or 8/22/2026. It does not translate the interface."
          control={
            <Select value={settings.locale} onValueChange={setLocale}>
              <SelectTrigger className="w-[220px]" aria-label="Language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCALE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        <SettingRow
          label="Timezone"
          description="Every kickoff and every timestamp is stored in UTC and shown in this zone. A fixture at 15:00 in London is 16:00 in Paris — same match."
          control={
            <Select value={settings.timeZone} onValueChange={setTimeZone}>
              <SelectTrigger className="w-[220px]" aria-label="Timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map((zone) => (
                  <SelectItem key={zone} value={zone}>
                    {zone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        <SettingRow
          label="Display currency"
          description={
            <>
              Converts every price into one currency so a mixed column can be read at a glance.
              Converted figures are marked <span className="font-mono">≈</span> and keep the
              original in a tooltip. Prices are still edited and sorted in the currency each listing
              was created in.
            </>
          }
          control={
            <Select
              value={settings.displayCurrency ?? ORIGINAL}
              onValueChange={(value) =>
                setDisplayCurrency(value === ORIGINAL ? null : (value as Currency))
              }
            >
              <SelectTrigger className="w-[220px]" aria-label="Display currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ORIGINAL}>Original — leave each as it is</SelectItem>
                {CURRENCY_OPTIONS.map((currency) => (
                  <SelectItem key={currency} value={currency}>
                    {currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
      </SettingsCard>

      <SettingsCard title="Tables and motion" label="defaults_every_screen_starts_from">
        <SettingRow
          label="Row density"
          description="Comfortable is easier to scan; compact fits about four more rows on a laptop screen. A table's own VIEW menu still overrides this for that screen."
          control={
            <Select value={ui.density} onValueChange={(value) => setDensity(value as Density)}>
              <SelectTrigger className="w-[220px]" aria-label="Row density">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comfortable">Comfortable</SelectItem>
                <SelectItem value="compact">Compact</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        <SettingRow
          label="Rows per page"
          description="Where every table starts. A link that already carries a page size wins, so a shared view still opens the way it was sent."
          control={
            <Select
              value={String(ui.pageSize)}
              onValueChange={(value) => setPageSize(Number(value))}
            >
              <SelectTrigger className="w-[220px]" aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        <SettingRow
          label="Reduced motion"
          description="Drops transitions and animations. If your system already asks for reduced motion, that is honoured whatever this says — this only ever adds."
          control={
            <Switch
              checked={ui.reducedMotion}
              onCheckedChange={setReducedMotion}
              aria-label="Reduced motion"
            />
          }
        />
      </SettingsCard>

      <SettingsCard title="Reset" label="back_to_defaults">
        <SettingRow
          label="Restore default preferences"
          description="Language, timezone, currency, density, rows per page, motion and your profile go back to how they shipped. Nothing on any screen is deleted."
          control={
            <Button
              variant="danger"
              label="Reset preferences"
              onClick={() => {
                reset()
                toast.success('Preferences restored to defaults.')
              }}
            />
          }
        />
      </SettingsCard>

      <Prose className="text-[12px] leading-snug text-muted">
        Preferences live in this browser. When accounts land they move to the profile behind them,
        and this screen keeps writing to exactly one place either way.
      </Prose>
    </div>
  )
}
