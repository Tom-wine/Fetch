'use client'

import type { Fixture } from '@/lib/types'
import { getClub } from '@/lib/registries/clubs'
import { COMPETITION_LABEL, getProvider } from '@/lib/registries/providers'

/**
 * `Export` — the filtered inventory as a CSV a spreadsheet can open.
 *
 * Two deliberate choices:
 *  - money leaves as a decimal (`142.50`), not the minor units the API speaks. A CSV
 *    is read by Excel, not by the API, and 14250 in a price column is a support
 *    ticket waiting to happen. The currency travels in its own column, so nothing is
 *    lost.
 *  - the kickoff leaves as the raw ISO-8601 UTC string. It is the only unambiguous
 *    form; a localised `14/09/2026, 15:00` reimported elsewhere is a coin toss
 *    between September and February.
 */
const COLUMNS = [
  'fixture_id',
  'external_id',
  'fixture',
  'home_club',
  'away_club',
  'competition',
  'matchweek',
  'kickoff_utc',
  'venue',
  'city',
  'provider',
  'tickets_total',
  'tickets_listed',
  'tickets_sold',
  'tickets_transferred',
  'face_value_total',
  'value_at_risk',
  'currency',
] as const

export function fixturesToCsv(fixtures: Fixture[]): string {
  const rows = fixtures.map((f) => [
    f.id,
    f.externalId,
    `${getClub(f.homeClub).short} v ${getClub(f.awayClub).short}`,
    getClub(f.homeClub).name,
    getClub(f.awayClub).name,
    COMPETITION_LABEL[f.competition],
    f.matchweek ?? '',
    f.kickoff,
    f.venue.name,
    f.venue.city,
    getProvider(f.provider).name,
    f.counts.total,
    f.counts.listed,
    f.counts.sold,
    f.counts.transferred,
    decimal(f.faceValueTotal),
    decimal(f.valueAtRisk),
    f.currency,
  ])

  return [COLUMNS, ...rows].map((row) => row.map(cell).join(',')).join('\r\n')
}

/** Minor units to a plain decimal — no thousands separator, no symbol. */
function decimal(minor: number): string {
  return (minor / 100).toFixed(2)
}

function cell(value: string | number): string {
  const text = String(value)
  // A club name with a comma, or a venue with a quote, must not shear the row.
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Hands the file to the browser and cleans up after itself. */
export function downloadCsv(filename: string, csv: string): void {
  // The BOM is what makes Excel read UTF-8 rather than mangling a club name.
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function exportFilename(now: Date = new Date()): string {
  const stamp = now.toISOString().slice(0, 10)
  return `fetch-io-fixtures-${stamp}.csv`
}
