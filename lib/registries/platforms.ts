/** The secondary marketplaces Fetch.io lists on. */

export type Platform = 'viagogo' | 'stubhub' | 'ticombo' | 'gigsberg' | 'fanpass'

export interface PlatformInfo {
  id: Platform
  /** Rendered verbatim — a brand name is user-facing data, not a chrome string. */
  name: string
  /** Brand dot in the toggle-chip row on /mylistings. */
  color: string
  /** Two-letter mark for the badge. */
  mark: string
  /** Shown in the MarketplacePickerModal; disabled tiles say so honestly. */
  available: boolean
}

export const PLATFORMS: PlatformInfo[] = [
  { id: 'viagogo', name: 'Viagogo', color: '#1A8CF0', mark: 'VG', available: true },
  { id: 'stubhub', name: 'StubHub', color: '#E8542F', mark: 'SH', available: true },
  { id: 'ticombo', name: 'Ticombo', color: '#22D18A', mark: 'TC', available: true },
  { id: 'gigsberg', name: 'GigsBerg', color: '#A78BFA', mark: 'GB', available: true },
  { id: 'fanpass', name: 'Fanpass', color: '#F5A524', mark: 'FP', available: false },
]

const BY_ID = new Map(PLATFORMS.map((p) => [p.id, p]))

export function getPlatform(id: Platform): PlatformInfo {
  const found = BY_ID.get(id)
  if (!found) throw new Error(`Unknown platform: ${id}`)
  return found
}
