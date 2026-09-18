'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import type { SeatmapSection, StandSide } from '@/lib/types'

/** Per-section seat tally, keyed by section id. */
export interface StandCounts {
  total: number
  selected: number
}

const VIEW_W = 320
const VIEW_H = 220

/** Where each side's stand sits in the view box, and how its label is turned. */
const BANDS: Record<StandSide, { x: number; y: number; w: number; h: number; vertical: boolean }> = {
  N: { x: 64, y: 16, w: 192, h: 38, vertical: false },
  S: { x: 64, y: 166, w: 192, h: 38, vertical: false },
  W: { x: 16, y: 60, w: 38, h: 100, vertical: true },
  E: { x: 266, y: 60, w: 38, h: 100, vertical: true },
}

/**
 * The per-stadium schematic: a pitch with the venue's four named stands around it,
 * each tinted by how many of the operator's seats sit in it. The geometry is not to
 * scale — the stand NAMES are what make one ground read as itself — so the tab labels
 * it a schematic.
 */
export function StadiumMap({
  sections,
  counts,
  venue,
  className,
}: {
  sections: SeatmapSection[]
  counts: Map<string, StandCounts>
  venue: string
  className?: string
}) {
  const bySide = React.useMemo(() => {
    const map = new Map<StandSide, SeatmapSection>()
    for (const s of sections) if (!map.has(s.side)) map.set(s.side, s)
    return map
  }, [sections])

  const owned = [...counts.values()].reduce((n, c) => n + c.total, 0)

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className={cn('h-auto w-full', className)}
      role="img"
      aria-label={`Schematic of ${venue}. ${owned} seats owned across ${counts.size} stands.`}
    >
      {/* Pitch */}
      <rect
        x={96}
        y={64}
        width={128}
        height={92}
        rx={6}
        style={{ fill: 'var(--success)', fillOpacity: 0.16, stroke: 'var(--success-ink)', strokeOpacity: 0.35 }}
      />
      <line x1={160} y1={64} x2={160} y2={156} style={{ stroke: 'var(--success-ink)', strokeOpacity: 0.28 }} />
      <circle
        cx={160}
        cy={110}
        r={13}
        style={{ fill: 'none', stroke: 'var(--success-ink)', strokeOpacity: 0.28 }}
      />

      {(Object.keys(BANDS) as StandSide[]).map((side) => {
        const section = bySide.get(side)
        if (!section) return null
        return (
          <Stand
            key={side}
            band={BANDS[side]}
            name={section.name}
            counts={counts.get(section.id)}
          />
        )
      })}
    </svg>
  )
}

function Stand({
  band,
  name,
  counts,
}: {
  band: { x: number; y: number; w: number; h: number; vertical: boolean }
  name: string
  counts?: StandCounts
}) {
  const total = counts?.total ?? 0
  const selected = counts?.selected ?? 0
  const owned = total > 0
  // A filled band, scaled by density but capped so the label stays legible.
  const tint = owned ? 0.28 + Math.min(total, 18) / 18 * 0.42 : 0
  const cx = band.x + band.w / 2
  const cy = band.y + band.h / 2
  const lines = wrapLabel(name, band.vertical ? 18 : 22)

  return (
    <g>
      <rect
        x={band.x}
        y={band.y}
        width={band.w}
        height={band.h}
        rx={5}
        style={{
          fill: owned ? 'var(--primary-solid)' : 'var(--surface-raised)',
          fillOpacity: owned ? tint : 1,
          stroke: owned ? 'var(--primary-solid)' : 'var(--border)',
          strokeWidth: 1,
        }}
      />
      {selected > 0 && (
        <rect
          x={band.x + 1.5}
          y={band.y + 1.5}
          width={band.w - 3}
          height={band.h - 3}
          rx={4}
          style={{ fill: 'none', stroke: 'var(--primary-ink)', strokeWidth: 1.5 }}
        />
      )}

      <g transform={band.vertical ? `rotate(-90 ${cx} ${cy})` : undefined}>
        <text
          x={cx}
          y={cy - (total > 0 ? 4 : lines.length > 1 ? 3 : -1)}
          textAnchor="middle"
          style={{ fill: 'var(--text)', fontSize: 7.5, fontWeight: 600 }}
        >
          {lines.map((line, i) => (
            <tspan key={i} x={cx} dy={i === 0 ? 0 : 8.5}>
              {line}
            </tspan>
          ))}
        </text>
        {total > 0 && (
          <text
            x={cx}
            y={cy + (lines.length > 1 ? 12 : 8)}
            textAnchor="middle"
            style={{ fill: 'var(--primary-ink)', fontSize: 6.5, fontWeight: 600 }}
          >
            {total} {total === 1 ? 'seat' : 'seats'}
            {selected > 0 ? ` · ${selected} sel` : ''}
          </text>
        )}
      </g>
    </g>
  )
}

/** Greedy word wrap into at most two lines near `perLine` characters each. */
function wrapLabel(name: string, perLine: number): string[] {
  const words = name.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > perLine && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
    if (lines.length === 1 && current.length > perLine) break
  }
  if (current) lines.push(current)
  return lines.slice(0, 2)
}
