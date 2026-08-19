'use client'

import { IGNORE, type Mapped } from './fields'
import type { Mapping } from './automap'

/**
 * §8.3: "Mapping is remembered per session so re-imports are one click."
 *
 * SECURITY — read this before adding a field to what is stored. What goes in is a
 * map from CSV HEADER TEXT to Fetch.io field name, and nothing else. No cell values,
 * no emails, and above all no passwords: the non-negotiable in §8.3 is that a
 * password never reaches storage, and `sessionStorage` is storage.
 *
 * `sessionStorage`, not `localStorage`: a remembered mapping is a convenience for
 * the operator who is importing three club exports this morning, not a preference
 * that should outlive the tab.
 */

const KEY = 'fetch.import.column-mapping.v1'

/** Header text only. An identical set of headers is what makes a mapping reusable. */
function signatureOf(headers: string[]): string {
  return headers.map((h) => h.trim().toLowerCase()).join('')
}

type Store = Record<string, Record<string, Mapped>>

function read(): Store {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Store) : {}
  } catch {
    // A corrupt or blocked sessionStorage must not take the wizard down with it.
    return {}
  }
}

export function rememberMapping(headers: string[], mapping: Mapping): void {
  if (typeof window === 'undefined') return
  const byHeader: Record<string, Mapped> = {}
  for (const entry of mapping) byHeader[entry.header] = entry.field

  try {
    const store = read()
    store[signatureOf(headers)] = byHeader
    window.sessionStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    // Storage full or disabled. The mapping still works for this import.
  }
}

/**
 * The remembered mapping for these exact headers, already in `Mapping` shape.
 * `score: null` throughout — a remembered choice is a human's, so the dot is grey.
 */
export function recallMapping(headers: string[]): Mapping | null {
  const byHeader = read()[signatureOf(headers)]
  if (!byHeader) return null

  const recalled = headers.map((header, index) => ({
    index,
    header,
    field: byHeader[header] ?? IGNORE,
    score: null,
  }))

  // A stored mapping that maps nothing is worse than no stored mapping: it would
  // silently replace a perfectly good auto-match with a screen full of Ignore.
  return recalled.some((entry) => entry.field !== IGNORE) ? recalled : null
}
