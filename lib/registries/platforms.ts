import type { Platform } from '@/lib/types'

/** Where Fetch.io can offer a seat: the secondary marketplaces, and the club exchange. */

export type { Platform }

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
  /**
   * A `marketplace` is somewhere the operator CHOOSES to list, so it appears in the
   * List picker and gets a filter chip. `club-exchange` is the club's own resale
   * channel: it sells at face value, it is reached only through
   * `POST /tickets/resell-face-value`, and offering it as a picker tile would ask the
   * operator to pick a price they cannot set.
   */
  kind: 'marketplace' | 'club-exchange'
}

export const PLATFORMS: PlatformInfo[] = [
  {
    id: 'viagogo',
    name: 'Viagogo',
    color: '#1A8CF0',
    mark: 'VG',
    available: true,
    kind: 'marketplace',
  },
  {
    id: 'stubhub',
    name: 'StubHub',
    color: '#E8542F',
    mark: 'SH',
    available: true,
    kind: 'marketplace',
  },
  {
    id: 'ticombo',
    name: 'Ticombo',
    color: '#22D18A',
    mark: 'TC',
    available: true,
    kind: 'marketplace',
  },
  {
    id: 'gigsberg',
    name: 'GigsBerg',
    color: '#A78BFA',
    mark: 'GB',
    available: true,
    kind: 'marketplace',
  },
  {
    id: 'fanpass',
    name: 'Fanpass',
    color: '#F5A524',
    mark: 'FP',
    available: false,
    kind: 'marketplace',
  },
  {
    id: 'club-exchange',
    name: 'Club Exchange',
    color: '#7DD3FC',
    mark: 'CX',
    available: true,
    kind: 'club-exchange',
  },
]

/** The marketplaces only — what the List picker offers and what the seed invents. */
export const MARKETPLACES: PlatformInfo[] = PLATFORMS.filter((p) => p.kind === 'marketplace')

const BY_ID = new Map(PLATFORMS.map((p) => [p.id, p]))

export function getPlatform(id: Platform): PlatformInfo {
  const found = BY_ID.get(id)
  if (!found) throw new Error(`Unknown platform: ${id}`)
  return found
}
