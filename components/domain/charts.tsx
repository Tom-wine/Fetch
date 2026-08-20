'use client'

import * as React from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart as RBarChart,
  CartesianGrid,
  Line,
  LineChart as RLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { cn } from '@/lib/utils'
import { useLocale } from '@/lib/format/LocaleProvider'
import { formatMoney, formatNumber } from '@/lib/format/money'
import type { Currency } from '@/lib/format/locale'
import { SectionLabel } from '@/components/ui/typography'

/**
 * Recharts wrappers (§7 #30) sharing one theme object.
 *
 * The theme reads the CSS custom properties at runtime rather than hard-coding
 * hexes, so a chart follows the theme switch with everything else — Recharts paints
 * to SVG attributes and cannot use Tailwind classes for series colour.
 *
 * The series ramp is `--chart-1…5`, which is theme-aware and validated for CVD
 * separation and contrast against both surfaces (see docs/DESIGN-TOKENS.md).
 */

const SERIES_SLOTS = 5

/**
 * `currentColor` rather than a hex literal.
 *
 * A missing token is a build problem, not a runtime state — globals.css defines every
 * name read below in both themes. Spelling the light-theme values out here as
 * fallbacks would put a second copy of six tokens in a file nobody would think to
 * update, and a copy that only renders when something is already broken is a copy
 * that drifts silently. Inheriting the text colour is visibly wrong, which is what a
 * missing token should look like.
 */
const TOKEN_MISSING = 'currentColor'

function readVar(name: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || TOKEN_MISSING
}

export interface ChartTheme {
  series: string[]
  grid: string
  axis: string
  surface: string
  border: string
  text: string
}

/**
 * Reads the token values off the document and re-reads them whenever the theme class
 * on <html> changes — a MutationObserver rather than a `useTheme()` dependency, so it
 * also survives a manual class change.
 *
 * Returns `null` until mounted. There are no CSS custom properties on the server, so
 * any colour derived here would differ between the server and client renders and
 * hydration would tear. Recharts needs a measured DOM node anyway, so every chart
 * below renders a reserved-height placeholder for the server pass.
 */
export function useChartTheme(): ChartTheme | null {
  const [theme, setTheme] = React.useState<ChartTheme | null>(null)

  React.useEffect(() => {
    const build = (): ChartTheme => ({
      series: Array.from({ length: SERIES_SLOTS }, (_, i) => readVar(`--chart-${i + 1}`)),
      grid: readVar('--border'),
      axis: readVar('--text-faint'),
      surface: readVar('--surface'),
      border: readVar('--border'),
      text: readVar('--text'),
    })

    setTheme(build())
    const observer = new MutationObserver(() => setTheme(build()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return theme
}

/** Reserves the plot's height on the server pass so nothing jumps on hydration. */
function ChartPlaceholder({ height }: { height: number }) {
  return <div style={{ height }} aria-hidden="true" />
}

/** Axis and tooltip type, matching the §3.3 caption spec. */
const TICK = { fontSize: 11, fontFamily: 'var(--font-mono)' }

/**
 * The bar chart's y scale, from the data rather than from recharts' default.
 *
 * Recharts rounds the top of the axis up to its own idea of a nice number, which on a
 * £62k month landed at £90k: the tallest bar filled two-thirds of the plot and the top
 * third of a very tall card was empty. This rounds up to the next multiple of a step
 * near an eighth of the maximum, so the tallest bar reaches ~90% of the plot AND every
 * tick is still a round number -- both, rather than one at the cost of the other.
 *
 * Returns `undefined` when there is nothing to scale, which leaves recharts' default in
 * place for an empty series rather than inventing an axis for no data.
 */
function barScale(
  data: Array<Record<string, unknown>>,
  keys: string[],
): { domain: [number, number]; ticks: number[] } | undefined {
  let max = 0
  for (const row of data) {
    for (const key of keys) {
      const value = row[key]
      if (typeof value === 'number' && Number.isFinite(value) && value > max) max = value
    }
  }
  if (max <= 0) return undefined

  // A step near an eighth of the maximum: fine enough that the tallest bar reaches
  // ~90% of the plot, coarse enough that the axis stays at six to nine round labels.
  const rough = max / 8
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const normalised = rough / magnitude
  const step = (normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10) * magnitude

  const top = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let tick = 0; tick <= top + step / 2; tick += step) ticks.push(tick)

  return { domain: [0, top], ticks }
}

export type ValueKind = 'money' | 'number'

function useValueFormatter(kind: ValueKind, currency: Currency) {
  const { settings } = useLocale()

  /** Full precision — tooltips, where the number is read to be acted on. */
  const full = React.useCallback(
    (v: number) =>
      kind === 'money'
        ? formatMoney({ amount: v, currency }, settings, { compact: true })
        : formatNumber(v, settings),
    [kind, currency, settings],
  )

  /** Abbreviated — axis ticks, where `£4,821,000` would eat the plot. */
  const axis = React.useCallback(
    (v: number) =>
      kind === 'money'
        ? formatMoney({ amount: v, currency }, settings, { notation: 'compact' })
        : formatNumber(v, settings, { notation: 'compact' }),
    [kind, currency, settings],
  )

  return { full, axis }
}

function ChartTooltip({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; color?: string }>
  label?: string | number
  format: (v: number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 shadow-sm">
      <div className="mb-1 text-caption text-muted">{label}</div>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-body">
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          {/* Text wears text tokens; the swatch carries the series identity. */}
          <span className="text-muted">{entry.name}</span>
          <span className="money ml-auto font-semibold text-text tabular-nums">
            {format(entry.value ?? 0)}
          </span>
        </div>
      ))}
    </div>
  )
}

export interface SeriesSpec {
  /** Key in each datum. */
  key: string
  /** Legend/tooltip name. Domain data — rendered verbatim. */
  name: string
}

interface BaseProps {
  data: Array<Record<string, string | number>>
  xKey: string
  series: SeriesSpec[]
  kind?: ValueKind
  currency?: Currency
  height?: number
  /** Chrome string; rendered as `// section_label` above the plot. */
  label?: string
  className?: string
}

function Frame({
  label,
  children,
  className,
  legend,
}: {
  label?: string
  children: React.ReactNode
  className?: string
  legend?: React.ReactNode
}) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {(label || legend) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {label && <SectionLabel>{label}</SectionLabel>}
          {legend}
        </div>
      )}
      {children}
    </div>
  )
}

/** A legend is always present for 2+ series, so identity is never colour alone. */
function Legend({ series, colors }: { series: SeriesSpec[]; colors: string[] }) {
  if (series.length < 2 || colors.length === 0) return null
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {series.map((s, i) => (
        <li key={s.key} className="flex items-center gap-1.5 text-caption text-muted">
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: colors[i % colors.length] }}
          />
          {s.name}
        </li>
      ))}
    </ul>
  )
}

export function LineChart({
  data,
  xKey,
  series,
  kind = 'number',
  currency = 'GBP',
  height = 240,
  label,
  className,
}: BaseProps) {
  const theme = useChartTheme()
  const { full: format, axis: axisFormat } = useValueFormatter(kind, currency)

  if (!theme) {
    return (
      <Frame label={label} className={className}>
        <ChartPlaceholder height={height} />
      </Frame>
    )
  }

  return (
    <Frame
      label={label}
      className={className}
      legend={<Legend series={series} colors={theme.series} />}
    >
      <ResponsiveContainer width="100%" height={height}>
        <RLineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={theme.grid} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ ...TICK, fill: theme.axis }}
            tickLine={false}
            axisLine={{ stroke: theme.grid }}
          />
          <YAxis
            tick={{ ...TICK, fill: theme.axis }}
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={axisFormat}
          />
          <Tooltip cursor={{ stroke: theme.grid }} content={<ChartTooltip format={format} />} />
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={theme.series[i % theme.series.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: theme.surface }}
            />
          ))}
        </RLineChart>
      </ResponsiveContainer>
    </Frame>
  )
}

export function BarChart({
  data,
  xKey,
  series,
  kind = 'number',
  currency = 'GBP',
  height = 240,
  label,
  className,
}: BaseProps) {
  const theme = useChartTheme()
  const { full: format, axis: axisFormat } = useValueFormatter(kind, currency)
  const scale = barScale(
    data,
    series.map((s) => s.key),
  )

  if (!theme) {
    return (
      <Frame label={label} className={className}>
        <ChartPlaceholder height={height} />
      </Frame>
    )
  }

  return (
    <Frame
      label={label}
      className={className}
      legend={<Legend series={series} colors={theme.series} />}
    >
      <ResponsiveContainer width="100%" height={height}>
        <RBarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barGap={2}>
          <CartesianGrid stroke={theme.grid} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ ...TICK, fill: theme.axis }}
            tickLine={false}
            axisLine={{ stroke: theme.grid }}
          />
          <YAxis
            tick={{ ...TICK, fill: theme.axis }}
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={axisFormat}
            domain={scale?.domain}
            ticks={scale?.ticks}
          />
          <Tooltip
            cursor={{ fill: theme.grid, fillOpacity: 0.25 }}
            content={<ChartTooltip format={format} />}
          />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.name}
              fill={theme.series[i % theme.series.length]}
              // 4px rounded data-end, square against the baseline.
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
          ))}
        </RBarChart>
      </ResponsiveContainer>
    </Frame>
  )
}

/**
 * A trend shape, not a readable plot: no axes, no grid, no tooltip. Belongs inside
 * a StatTile or a table cell, next to the number it describes.
 */
export function Sparkline({
  data,
  dataKey = 'value',
  height = 40,
  slot = 0,
  className,
}: {
  data: Array<Record<string, number>>
  dataKey?: string
  height?: number
  /** Which `--chart-N` slot to use, so a sparkline matches its series elsewhere. */
  slot?: number
  className?: string
}) {
  const theme = useChartTheme()
  const id = React.useId()

  if (!theme) return <ChartPlaceholder height={height} />
  const color = theme.series[slot % theme.series.length]

  return (
    <div className={cn('w-full', className)} aria-hidden="true">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#${id})`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
