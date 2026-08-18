/**
 * lib/types.ts — the §5 data model, shared by mocks, API routes and UI.
 *
 * Single source of truth for the domain unions. The registries in lib/registries/
 * and the Currency in lib/format/locale.ts import from here rather than restating
 * them, so a club can never exist in one file and not the other.
 *
 * Money is an integer of MINOR UNITS (pence) plus a currency code — never a float
 * (§6.2). Dates are ISO-8601 UTC strings; the client formats, the server never does.
 */

export type ClubId =
  | 'arsenal'
  | 'aston-villa'
  | 'bournemouth'
  | 'brentford'
  | 'brighton'
  | 'chelsea'
  | 'crystal-palace'
  | 'everton'
  | 'fulham'
  | 'ipswich'
  | 'leicester'
  | 'liverpool'
  | 'man-city'
  | 'man-utd'
  | 'newcastle'
  | 'nottingham-forest'
  | 'southampton'
  | 'tottenham'
  | 'west-ham'
  | 'wolves'

export type ProviderId =
  'club-direct' | 'ticketmaster-uk' | 'eventim-uk' | 'seatgeek' | 'stubhub-exchange'

export type Platform = 'viagogo' | 'stubhub' | 'ticombo' | 'gigsberg' | 'fanpass'

export type Currency = 'GBP' | 'EUR' | 'USD'

export type Competition = 'premier-league' | 'fa-cup' | 'efl-cup' | 'ucl' | 'uel' | 'friendly'

export type MembershipType =
  | 'season-ticket'
  | 'official-member'
  | 'digital-member'
  | 'international-member'
  | 'ticket-exchange'
  | 'general-sale'
  | 'hospitality'

export type AccountStatus =
  | 'active' // logged in, session valid
  | 'needs_login' // session expired
  | 'needs_otp' // 2FA challenge pending
  | 'locked' // club locked the account
  | 'expired' // membership lapsed
  | 'error'

export type TicketStatus = 'ticket' | 'listed' | 'sold' | 'transferred'
export type TicketVisibility = 'visible' | 'hidden'
export type ListingStatus = 'ACTIVE' | 'INACTIVE' | 'SOLDOUT' | 'PAUSED' | 'UNDELIVERABLE'
export type ProxyStatus = 'ok' | 'dead' | 'untested'

export interface Account {
  id: string
  email: string
  /** The API NEVER returns plaintext; the UI reveals via POST /accounts/:id/reveal. */
  passwordMasked: string
  club: ClubId
  provider: ProviderId
  /** Client reference / supporter number. */
  membershipId: string
  membershipType: MembershipType
  memberSince?: string
  /** Drives the "expiring" warning chip. */
  membershipExpiresAt?: string
  loyaltyPoints?: number
  firstName?: string
  lastName?: string
  phone?: string
  dateOfBirth?: string
  status: AccountStatus
  proxyId?: string
  imapId?: string
  ticketsPurchased: number
  lastCheckedAt?: string
  tags: string[]
  notes?: string
  createdAt: string
}

export interface Venue {
  name: string
  city: string
  country: string
}

export interface FixtureCounts {
  total: number
  listed: number
  sold: number
  transferred: number
}

export interface Fixture {
  id: string
  externalId: string
  homeClub: ClubId
  awayClub: ClubId
  competition: Competition
  matchweek?: number
  kickoff: string
  venue: Venue
  artworkUrl: string
  provider: ProviderId
  counts: FixtureCounts
  /** Drives the "No Viagogo" chips. */
  blockedPlatforms: Platform[]
  /** Minor units. */
  faceValueTotal: number
  /** Unsold face value, in minor units — the anxiety column. */
  valueAtRisk: number
  currency: Currency
}

export interface Ticket {
  id: string
  fixtureId: string
  /** "North Bank Upper 21". */
  block: string
  levelName: string
  row: string
  seat: string
  /** Minor units. */
  price: number
  /** Minor units. */
  faceValue: number
  currency: Currency
  accountId: string
  visibility: TicketVisibility
  status: TicketStatus
  groupId?: string
  orderId: string
  purchasedAt: string
}

export interface Listing {
  id: string
  /** Marketplace-side id. */
  listingId: string
  platform: Platform
  accountId: string
  fixtureId: string
  fixtureName: string
  kickoff: string
  /** Minor units. */
  price: number
  currency: Currency
  block: string
  rank?: number
  quantity: number
  status: ListingStatus
  /** Minor units. */
  floorPrice?: number
  createdAt: string
}

export interface Proxy {
  id: string
  groupId: string
  label: string
  host: string
  port: number
  username: string
  passwordMasked: string
  country?: string
  status: ProxyStatus
  lastTestedAt?: string
  latencyMs?: number
}

export interface KpiSet {
  /** Minor units. */
  totalRevenue: number
  ticketsSold: number
  /** Minor units. */
  monthRevenue: number
  currency: Currency
  accountsTotal: number
  accountsHealthy: number
  accountsNeedAction: number
  /** Minor units. */
  valueAtRisk: number
}

/* --------------------------------------------------------------------------
   Supporting shapes the §6.3 endpoints need but §5 does not spell out.
   -------------------------------------------------------------------------- */

export interface AccountStats {
  total: number
  /**
   * Both maps are SPARSE: a status or club with no accounts is absent, not zero.
   * `Partial<>` is what makes a consumer write `?? 0` instead of trusting a key
   * that may never arrive.
   */
  byStatus: Partial<Record<AccountStatus, number>>
  byClub: Partial<Record<ClubId, number>>
}

export interface RevenuePoint {
  /** `2026-04` — a month bucket, not a formatted label. */
  period: string
  /** Minor units. */
  revenue: number
  ticketsSold: number
  currency: Currency
}

export type ActivityKind = 'sale' | 'listing' | 'account' | 'system' | 'marketplace'

export interface ActivityEntry {
  id: string
  kind: ActivityKind
  source: 'fetch' | Platform
  title: string
  body: string
  at: string
}

export type NotificationKind = 'success' | 'issue' | 'marketplace'

export interface AppNotification {
  id: string
  kind: NotificationKind
  title: string
  body: string
  at: string
  unread: boolean
}

export interface ClubRef {
  id: ClubId
  name: string
  short: string
  stadium: string
  city: string
  primaryColor: string
  crest: string
}

export type SearchResultType = 'account' | 'fixture' | 'listing' | 'navigation'

export interface SearchResult {
  id: string
  type: SearchResultType
  title: string
  subtitle?: string
  href: string
}

/** Result of POST /accounts/bulk. */
export interface BulkImportResult {
  created: number
  updated: number
  skipped: number
  errors: Array<{ row: number; email?: string; message: string }>
}

/** Per-row verdict from POST /accounts/import/validate. */
export interface ImportRowVerdict {
  row: number
  status: 'ok' | 'warning' | 'error'
  email?: string
  messages: string[]
}
