import { CLUBS, getClub } from '@/lib/registries/clubs'
import { MARKETPLACES } from '@/lib/registries/platforms'
import { PROVIDERS } from '@/lib/registries/providers'
import type {
  Account,
  AccountStatus,
  ActivityEntry,
  AppNotification,
  ClubId,
  ClubRef,
  Competition,
  Currency,
  Fixture,
  Listing,
  MembershipType,
  Platform,
  Proxy,
  ProviderId,
  RevenuePoint,
  Ticket,
} from '@/lib/types'
import { DAY, HOUR, MINUTE, SEED_NOW, ago, ahead, rng } from './rng'

/**
 * The seeded dataset (§5 volumes), built once at module load from a fixed seed.
 *
 * The registries in lib/registries/ are the reference data — clubs, marketplaces and
 * providers are read from there, never restated here, so a club exists in exactly
 * one place.
 *
 * All money is integer MINOR UNITS.
 */

const r = rng(0x5e7c4)

// Marketplaces only. `club-exchange` is a real platform, but a seat only reaches it
// by being resold at face value through the Actions menu — seeding listings there
// would put inventory on a channel nobody chose.
const PLATFORM_IDS = MARKETPLACES.map((p) => p.id)
const PROVIDER_IDS = PROVIDERS.map((p) => p.id)

export const clubs: ClubRef[] = CLUBS.map((c) => ({
  id: c.id,
  name: c.name,
  short: c.short,
  stadium: c.stadium,
  city: c.city,
  primaryColor: c.primaryColor,
  crest: c.crest,
}))

/* ---------------------------------------------------------------- accounts */

/**
 * 64 accounts spread unevenly — a real operator concentrates on the clubs whose
 * allocations they can actually win, so Arsenal has twelve and Ipswich has one.
 */
const ACCOUNTS_PER_CLUB: Partial<Record<ClubId, number>> = {
  arsenal: 12,
  'man-city': 8,
  liverpool: 9,
  tottenham: 7,
  'man-utd': 6,
  chelsea: 5,
  newcastle: 4,
  'aston-villa': 3,
  brighton: 2,
  'west-ham': 2,
  everton: 2,
  fulham: 1,
  brentford: 1,
  wolves: 1,
  ipswich: 1,
}

/** Every AccountStatus appears; `active` dominates because most accounts are fine. */
const STATUS_POOL: AccountStatus[] = [
  ...Array<AccountStatus>(46).fill('active'),
  ...Array<AccountStatus>(6).fill('needs_login'),
  ...Array<AccountStatus>(4).fill('needs_otp'),
  ...Array<AccountStatus>(4).fill('locked'),
  ...Array<AccountStatus>(2).fill('expired'),
  ...Array<AccountStatus>(2).fill('error'),
]

const MEMBERSHIP_TYPES: MembershipType[] = [
  'season-ticket',
  'official-member',
  'digital-member',
  'international-member',
  'ticket-exchange',
  'general-sale',
  'hospitality',
]

const FIRST_NAMES = [
  'Julien',
  'Kévin',
  'Amélie',
  'Sam',
  'Radek',
  'Marco',
  'Henrik',
  'Priya',
  'Tomás',
  'Ines',
  'Owen',
  'Lars',
  'Nadia',
  'Felix',
  'Ana',
  'Dmitri',
  'Chloe',
  'Mateo',
  'Sofia',
  'Ewan',
  'Hana',
  'Bruno',
  'Lena',
  'Yusuf',
]

const LAST_NAMES = [
  'Moreau',
  'Dubois',
  'Laurent',
  'Okafor',
  'Novák',
  'Ferrari',
  'Olsen',
  'Sharma',
  'Silva',
  'Costa',
  'Griffiths',
  'Andersen',
  'Haddad',
  'Weber',
  'Ruiz',
  'Volkov',
  'Bennett',
  'Alvarez',
  'Rossi',
  'MacLeod',
  'Tanaka',
  'Almeida',
  'Fischer',
  'Demir',
]

const TAG_POOL = ['priority', 'aged', 'high-loyalty', 'away-eligible', 'backup', 'hospitality']

function membershipPrefix(club: ClubId): string {
  const c = getClub(club)
  return c.short
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .padEnd(2, 'C')
}

function buildAccounts(): Account[] {
  const statuses = r.shuffle(STATUS_POOL)
  const out: Account[] = []
  let i = 0

  for (const [clubId, count] of Object.entries(ACCOUNTS_PER_CLUB) as Array<[ClubId, number]>) {
    for (let n = 0; n < count; n++) {
      const first = r.pick(FIRST_NAMES)
      const last = r.pick(LAST_NAMES)
      const status = statuses[i % statuses.length]!
      const hasMembership = status !== 'expired' || r.chance(0.5)

      out.push({
        id: `acc_${String(i + 1).padStart(3, '0')}`,
        email: `${first[0]!.toLowerCase()}.${last.toLowerCase().replace(/[^a-z]/g, '')}${i}@mail.com`,
        // The API never returns plaintext — only the mask (§6.2).
        passwordMasked: '•'.repeat(r.int(8, 14)),
        club: clubId,
        provider: r.pick(PROVIDER_IDS) as ProviderId,
        membershipId: `${membershipPrefix(clubId)}-${r.int(100000, 9999999)}`,
        membershipType: r.pick(MEMBERSHIP_TYPES),
        memberSince: ago(r.int(200, 3000) * DAY),
        membershipExpiresAt: hasMembership
          ? ahead(r.int(-40, 400) * DAY)
          : ago(r.int(10, 120) * DAY),
        loyaltyPoints: r.int(0, 4200),
        firstName: first,
        lastName: last,
        phone: `+44 7${r.int(100, 999)} ${r.int(100000, 999999)}`,
        status,
        proxyId: r.chance(0.75) ? `prx_${String(r.int(1, 18)).padStart(2, '0')}` : undefined,
        ticketsPurchased: r.int(0, 58),
        // Always in the past — a "last checked" in the future is a bug.
        lastCheckedAt: ago(r.int(2, 7200) * MINUTE),
        tags: r.chance(0.45) ? r.shuffle(TAG_POOL).slice(0, r.int(1, 2)) : [],
        notes: r.chance(0.15) ? 'Renewal handled by the club directly.' : undefined,
        createdAt: ago(r.int(30, 900) * DAY),
      })
      i++
    }
  }

  return out
}

export const accounts: Account[] = buildAccounts()

/* ---------------------------------------------------------------- fixtures */

interface FixtureSpec {
  home: ClubId
  away: ClubId
  competition: Competition
  matchweek?: number
  /** Days from now. Two are inside 7 (§5). */
  inDays: number
  hourUtc: number
  currency?: Currency
}

const FIXTURE_SPECS: FixtureSpec[] = [
  {
    home: 'arsenal',
    away: 'chelsea',
    competition: 'premier-league',
    matchweek: 5,
    inDays: 3,
    hourUtc: 14,
  },
  {
    home: 'liverpool',
    away: 'everton',
    competition: 'premier-league',
    matchweek: 5,
    inDays: 6,
    hourUtc: 19,
  },
  {
    home: 'man-city',
    away: 'brighton',
    competition: 'premier-league',
    matchweek: 6,
    inDays: 12,
    hourUtc: 11,
  },
  {
    home: 'man-utd',
    away: 'newcastle',
    competition: 'premier-league',
    matchweek: 6,
    inDays: 13,
    hourUtc: 16,
  },
  {
    home: 'tottenham',
    away: 'wolves',
    competition: 'ucl',
    matchweek: 2,
    inDays: 19,
    hourUtc: 19,
    currency: 'EUR',
  },
  {
    home: 'west-ham',
    away: 'fulham',
    competition: 'premier-league',
    matchweek: 7,
    inDays: 21,
    hourUtc: 14,
  },
  {
    home: 'aston-villa',
    away: 'crystal-palace',
    competition: 'premier-league',
    matchweek: 7,
    inDays: 22,
    hourUtc: 14,
  },
  { home: 'chelsea', away: 'liverpool', competition: 'efl-cup', inDays: 27, hourUtc: 19 },
  {
    home: 'brighton',
    away: 'arsenal',
    competition: 'premier-league',
    matchweek: 8,
    inDays: 33,
    hourUtc: 12,
  },
  {
    home: 'newcastle',
    away: 'man-city',
    competition: 'premier-league',
    matchweek: 8,
    inDays: 34,
    hourUtc: 16,
  },
  {
    home: 'everton',
    away: 'nottingham-forest',
    competition: 'premier-league',
    matchweek: 9,
    inDays: 40,
    hourUtc: 14,
  },
  {
    home: 'arsenal',
    away: 'bournemouth',
    competition: 'uel',
    matchweek: 3,
    inDays: 47,
    hourUtc: 17,
    currency: 'EUR',
  },
  { home: 'leicester', away: 'southampton', competition: 'fa-cup', inDays: 54, hourUtc: 15 },
  {
    home: 'man-utd',
    away: 'ipswich',
    competition: 'premier-league',
    matchweek: 11,
    inDays: 61,
    hourUtc: 14,
  },
]

function buildFixtures(): Fixture[] {
  return FIXTURE_SPECS.map((spec, i) => {
    const home = getClub(spec.home)
    const total = r.int(4, 26)
    const listed = r.int(0, total)
    const sold = r.int(0, Math.max(0, total - listed))
    const transferred = r.int(0, Math.max(0, total - listed - sold))
    const currency = spec.currency ?? 'GBP'

    // Face value per seat, minor units: £45–£185.
    const perSeat = r.int(4500, 18500)
    const faceValueTotal = perSeat * total
    const unsold = total - sold - transferred

    return {
      id: `fx_${String(i + 1).padStart(3, '0')}`,
      externalId: `EXT-${r.int(1000000, 9999999)}`,
      homeClub: spec.home,
      awayClub: spec.away,
      competition: spec.competition,
      matchweek: spec.matchweek,
      kickoff: kickoffAt(spec.inDays, spec.hourUtc),
      venue: { name: home.stadium, city: home.city, country: 'England' },
      artworkUrl: home.crest,
      provider: r.pick(PROVIDER_IDS) as ProviderId,
      counts: { total, listed, sold, transferred },
      // Some clubs block resale on some marketplaces — the "No Viagogo" chips.
      blockedPlatforms: r.chance(0.3) ? [r.pick(PLATFORM_IDS) as Platform] : [],
      faceValueTotal,
      valueAtRisk: perSeat * unsold,
      currency,
    }
  })
}

/** Midnight-anchored so a kickoff reads as a plausible clock time, not "in 3.7 days". */
function kickoffAt(inDays: number, hourUtc: number): string {
  const d = new Date(Date.parse(ahead(inDays * DAY)))
  d.setUTCHours(hourUtc, 0, 0, 0)
  return d.toISOString()
}

export const fixtures: Fixture[] = buildFixtures()

/* ----------------------------------------------------------------- tickets */

const BLOCKS: Record<string, string[]> = {
  arsenal: ['North Bank Upper 21', 'Clock End 5', 'East Stand 108'],
  liverpool: ['Kop 306', 'Main Stand M3', 'Anfield Road 122'],
  'man-city': ['South Stand 108', 'Colin Bell 232', 'East Stand 314'],
  'man-utd': ['Stretford End W2408', 'North Stand N3', 'East Lower E122'],
  tottenham: ['South Stand 112', 'North Lower 041', 'East Lower 112'],
  chelsea: ['Matthew Harding Upper', 'Shed End Lower 4', 'East Stand 3'],
  'west-ham': ['Bobby Moore Lower 112', 'Trevor Brooking 214'],
  'aston-villa': ['Holte End L4', 'Trinity Road Upper'],
  brighton: ['North Stand N2', 'East Upper 3'],
  newcastle: ['Gallowgate 24', 'Leazes Upper 44'],
  everton: ['Gwladys Street 5', 'Park End 2'],
  leicester: ['Kop Block M', 'East Stand 4'],
}

const LEVELS = ['Lower Tier', 'Upper Tier', 'Executive', 'Family Stand']

function buildTickets(): Ticket[] {
  const out: Ticket[] = []
  const accountsByClub = new Map<ClubId, Account[]>()
  for (const a of accounts) {
    const list = accountsByClub.get(a.club) ?? []
    list.push(a)
    accountsByClub.set(a.club, list)
  }

  // 90 tickets, distributed across fixtures in proportion to their seat counts.
  const weights = fixtures.map((f) => f.counts.total)
  const totalWeight = weights.reduce((s, w) => s + w, 0)
  let made = 0

  for (const [fi, fixture] of fixtures.entries()) {
    const share = Math.round((weights[fi]! / totalWeight) * 90)
    const blocks = BLOCKS[fixture.homeClub] ?? ['Main Stand A', 'Upper Tier B']
    // Buyers are usually accounts at the home club; fall back to anyone.
    const pool = accountsByClub.get(fixture.homeClub) ?? accounts

    for (let n = 0; n < share && made < 90; n++) {
      const account = pool[r.int(0, pool.length - 1)] ?? accounts[0]!
      const faceValue = r.int(4500, 18500)
      const status: Ticket['status'] =
        n < fixture.counts.sold
          ? 'sold'
          : n < fixture.counts.sold + fixture.counts.transferred
            ? 'transferred'
            : n < fixture.counts.sold + fixture.counts.transferred + fixture.counts.listed
              ? 'listed'
              : 'ticket'

      out.push({
        id: `tkt_${String(made + 1).padStart(3, '0')}`,
        fixtureId: fixture.id,
        block: r.pick(blocks),
        levelName: r.pick(LEVELS),
        row: String(r.int(1, 44)),
        seat: String(r.int(1, 220)),
        // Resale asks a premium over face; a transferred seat keeps face value.
        price: status === 'transferred' ? faceValue : Math.round(faceValue * (1 + r.next() * 1.4)),
        faceValue,
        currency: fixture.currency,
        accountId: account.id,
        visibility: r.chance(0.9) ? 'visible' : 'hidden',
        status,
        groupId: r.chance(0.4) ? `grp_${fixture.id}_${r.int(1, 3)}` : undefined,
        orderId: `ORD-${r.int(1000000, 9999999)}`,
        purchasedAt: ago(r.int(1, 240) * DAY),
      })
      made++
    }
  }

  // Top up to exactly 90 if rounding left us short.
  while (made < 90) {
    const fixture = r.pick(fixtures)
    const faceValue = r.int(4500, 18500)
    out.push({
      id: `tkt_${String(made + 1).padStart(3, '0')}`,
      fixtureId: fixture.id,
      block: r.pick(BLOCKS[fixture.homeClub] ?? ['Main Stand A']),
      levelName: r.pick(LEVELS),
      row: String(r.int(1, 44)),
      seat: String(r.int(1, 220)),
      price: Math.round(faceValue * (1 + r.next() * 1.4)),
      faceValue,
      currency: fixture.currency,
      accountId: r.pick(accounts).id,
      visibility: 'visible',
      status: 'ticket',
      orderId: `ORD-${r.int(1000000, 9999999)}`,
      purchasedAt: ago(r.int(1, 240) * DAY),
    })
    made++
  }

  return out
}

export const tickets: Ticket[] = buildTickets()

/* ---------------------------------------------------------------- listings */

function buildListings(): Listing[] {
  const listedTickets = tickets.filter((t) => t.status === 'listed' || t.status === 'sold')
  const source = listedTickets.length >= 26 ? listedTickets : tickets
  const chosen = r.shuffle(source).slice(0, 26)

  return chosen.map((t, i) => {
    const fixture = fixtures.find((f) => f.id === t.fixtureId)!
    const home = getClub(fixture.homeClub)
    const away = getClub(fixture.awayClub)
    const platform = r.pick(PLATFORM_IDS) as Platform
    const status: Listing['status'] =
      t.status === 'sold'
        ? 'SOLDOUT'
        : r.chance(0.62)
          ? 'ACTIVE'
          : r.chance(0.5)
            ? 'PAUSED'
            : r.chance(0.5)
              ? 'INACTIVE'
              : 'UNDELIVERABLE'

    return {
      id: `lst_${String(i + 1).padStart(3, '0')}`,
      listingId: `${platform.slice(0, 2).toUpperCase()}-${r.int(10000000, 99999999)}`,
      platform,
      accountId: t.accountId,
      fixtureId: fixture.id,
      // Rendered verbatim — a fixture name is domain data, never snake_cased.
      fixtureName: `${home.short} v ${away.short}`,
      kickoff: fixture.kickoff,
      price: t.price,
      currency: t.currency,
      block: t.block,
      rank: r.chance(0.6) ? r.int(1, 40) : undefined,
      quantity: r.int(1, 4),
      status,
      floorPrice: r.chance(0.5) ? Math.round(t.faceValue * 0.9) : undefined,
      createdAt: ago(r.int(1, 90) * DAY),
    }
  })
}

export const listings: Listing[] = buildListings()

/* ----------------------------------------------------------------- proxies */

const PROXY_COUNTRIES = ['GB', 'GB', 'GB', 'IE', 'DE', 'NL', 'FR']

export const proxies: Proxy[] = Array.from({ length: 18 }, (_, i) => {
  const country = r.pick(PROXY_COUNTRIES)
  const status: Proxy['status'] = r.chance(0.72) ? 'ok' : r.chance(0.5) ? 'untested' : 'dead'
  return {
    id: `prx_${String(i + 1).padStart(2, '0')}`,
    groupId: `grp_${r.int(1, 3)}`,
    label: `${country.toLowerCase()}-res-${String(i + 1).padStart(2, '0')}`,
    host: `${r.int(10, 250)}.${r.int(10, 250)}.${r.int(10, 250)}.${r.int(10, 250)}`,
    port: r.pick([8080, 3128, 9000, 10000, 31280]),
    username: `fetch${r.int(1000, 9999)}`,
    passwordMasked: '•'.repeat(r.int(8, 12)),
    country,
    status,
    lastTestedAt: status === 'untested' ? undefined : ago(r.int(5, 4000) * MINUTE),
    latencyMs: status === 'ok' ? r.int(38, 480) : undefined,
  }
})

/* ----------------------------------------------------------------- revenue */

/**
 * Twelve month buckets ending with the current month — and the ONLY ledger of money
 * earned. Everything `/kpis` reports about money is summed from here.
 *
 * WHY NOT THE TICKET STORE
 *
 * `tickets` above is CURRENT INVENTORY: the seats held right now, for fixtures that
 * have not been played yet. It is not a historical ledger. A seat sold eight months
 * ago left that array long ago, and nothing in it remembers the sale — so summing its
 * `sold` rows answers "what have I sold out of what I am holding today", not "what
 * have I earned". The two are different questions with different answers.
 *
 * `/kpis` used to mix them: an all-time total summed from the ticket store, and a
 * month taken from this series. Two seeds, two stories, and the dashboard's own
 * first row said "this month" was nine times "all time". If you are here to make
 * the totals match the ticket table, they are not supposed to — change the tile's
 * label, not its source.
 */
export const revenue: RevenuePoint[] = Array.from({ length: 12 }, (_, i) => {
  // Stepped by calendar month, not by a fixed 30-day block. A fixed stride drifts
  // about five days a year, so depending on the date it can land twice inside one
  // month and skip the next — which would leave `/kpis` picking a "current month"
  // bucket that is not this month.
  const now = new Date(SEED_NOW)
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (11 - i), 1))
  const period = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  const ticketsSold = r.int(24, 140)
  return {
    period,
    // £180–£520 average per seat, in minor units.
    revenue: ticketsSold * r.int(18000, 52000),
    ticketsSold,
    currency: 'GBP' as Currency,
  }
})

/** The whole series, folded once. `/kpis` reads these rather than re-summing. */
export const revenueTotals = {
  revenue: revenue.reduce((sum, p) => sum + p.revenue, 0),
  ticketsSold: revenue.reduce((sum, p) => sum + p.ticketsSold, 0),
  /** The last bucket is the current month — see the stride note above. */
  currentMonth: revenue.at(-1) ?? null,
}

/* ---------------------------------------------------------------- activity */

const ACTIVITY_TEMPLATES: Array<Pick<ActivityEntry, 'kind' | 'source' | 'title' | 'body'>> = [
  {
    kind: 'sale',
    source: 'stubhub',
    title: 'Listing sold',
    body: 'Two seats in North Bank Upper 21 sold at £245 each.',
  },
  {
    kind: 'sale',
    source: 'viagogo',
    title: 'Listing sold',
    body: 'One seat in Kop 306 sold above your floor price.',
  },
  {
    kind: 'account',
    source: 'fetch',
    title: 'Account needs OTP',
    body: 'A two-factor challenge is waiting on a code from the club.',
  },
  {
    kind: 'account',
    source: 'fetch',
    title: 'Session refreshed',
    body: 'Twelve accounts were re-authenticated successfully.',
  },
  {
    kind: 'listing',
    source: 'ticombo',
    title: 'Price undercut',
    body: 'Three comparable listings now sit below yours.',
  },
  {
    kind: 'marketplace',
    source: 'gigsberg',
    title: 'Payout released',
    body: 'Funds from last week’s sales have cleared.',
  },
  {
    kind: 'system',
    source: 'fetch',
    title: 'Import finished',
    body: 'A CSV of 48 accounts imported with 3 warnings.',
  },
  {
    kind: 'listing',
    source: 'viagogo',
    title: 'Listing paused',
    body: 'Resale is blocked on this fixture by the club.',
  },
  {
    kind: 'sale',
    source: 'ticombo',
    title: 'Listing sold',
    body: 'Four seats sold as a single lot.',
  },
  {
    kind: 'account',
    source: 'fetch',
    title: 'Account locked',
    body: 'The club locked an account after repeated sign-ins.',
  },
  {
    kind: 'system',
    source: 'fetch',
    title: 'Proxy check complete',
    body: 'Two proxies stopped responding and were marked dead.',
  },
  {
    kind: 'marketplace',
    source: 'stubhub',
    title: 'Delivery reminder',
    body: 'One sold listing still needs its tickets transferring.',
  },
  {
    kind: 'listing',
    source: 'gigsberg',
    title: 'Listing activated',
    body: 'Six listings went live for the weekend fixtures.',
  },
  {
    kind: 'sale',
    source: 'viagogo',
    title: 'Listing sold',
    body: 'A pair in the Clock End sold within an hour.',
  },
  {
    kind: 'system',
    source: 'fetch',
    title: 'Membership expiring',
    body: 'One membership lapses inside 30 days.',
  },
]

export const activity: ActivityEntry[] = ACTIVITY_TEMPLATES.map((t, i) => ({
  id: `act_${String(i + 1).padStart(3, '0')}`,
  ...t,
  at: ago(r.int(5, 20000) * MINUTE),
})).sort((a, b) => b.at.localeCompare(a.at))

/* ----------------------------------------------------------- notifications */

const NOTIFICATION_TEMPLATES: Array<Pick<AppNotification, 'kind' | 'title' | 'body'>> = [
  {
    kind: 'success',
    title: 'Listing sold',
    body: 'Arsenal v Chelsea — North Bank Upper 21, Row 14, 2 seats sold on StubHub.',
  },
  {
    kind: 'issue',
    title: 'Account needs OTP',
    body: 'An account hit a 2FA challenge on Man City and is waiting on a code.',
  },
  {
    kind: 'marketplace',
    title: 'Viagogo price drop',
    body: 'Three comparable listings undercut yours for Liverpool v Everton.',
  },
  {
    kind: 'success',
    title: 'Import finished',
    body: '48 accounts imported, 3 skipped as duplicates.',
  },
  {
    kind: 'issue',
    title: 'Account locked',
    body: 'The club locked an account after repeated sign-in attempts.',
  },
  { kind: 'success', title: 'Payout cleared', body: 'Last week’s marketplace payout has landed.' },
  {
    kind: 'marketplace',
    title: 'New comparable sale',
    body: 'A similar lot sold £40 above your current ask.',
  },
  {
    kind: 'issue',
    title: 'Undeliverable listing',
    body: 'A sold listing could not be delivered and needs attention today.',
  },
]

export const notifications: AppNotification[] = NOTIFICATION_TEMPLATES.map((t, i) => ({
  id: `ntf_${String(i + 1).padStart(3, '0')}`,
  ...t,
  at: ago(r.int(3, 6000) * MINUTE),
  unread: i < 3,
})).sort((a, b) => b.at.localeCompare(a.at))

/* --------------------------------------------------------------- passwords */

/**
 * Plaintext passwords, kept in a side table that is NEVER serialised into an Account.
 * Only POST /accounts/:id/reveal reads it. A real backend would hold these encrypted
 * at rest and audit every read — see docs/BACKEND-HANDOFF.md.
 */
export const passwords = new Map<string, string>(
  accounts.map((a) => [a.id, `Fetch-${a.membershipId}-${r.int(1000, 9999)}`]),
)

export { HOUR, MINUTE, DAY }
