import { CLUBS, getClub } from '@/lib/registries/clubs'
import { PROVIDERS } from '@/lib/registries/providers'
import type {
  Account,
  BallotClubId,
  BallotProfile,
  BallotRun,
  AccountStatus,
  ActivityEntry,
  AppNotification,
  ClubId,
  ClubRef,
  Competition,
  Currency,
  Fixture,
  ImapAccount,
  MembershipType,
  Proxy,
  ProviderId,
  RevenuePoint,
  Ticket,
} from '@/lib/types'
import { DAY, HOUR, MINUTE, SEED_NOW, ago, ahead, rngFor } from './rng'

/**
 * The seeded dataset (§5 volumes), built once at module load from a fixed seed.
 *
 * The registries in lib/registries/ are the reference data — clubs and providers are
 * read from there, never restated here, so a club exists in exactly one place.
 *
 * All money is integer MINOR UNITS.
 */

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
  // The seven ballot clubs carry more accounts than the rest: they are the ones a run
  // draws from, and a pool of two makes every run look like a rounding error.
  leeds: 7,
  'nottingham-forest': 6,
  everton: 5,
  'aston-villa': 3,
  brighton: 2,
  'west-ham': 2,
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
  const r = rngFor('accounts')
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
  const r = rngFor('fixtures')
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
  const r = rngFor('tickets')
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
        // A sale asks a premium over face; a transferred seat keeps face value.
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

/* ----------------------------------------------------------------- proxies */

const PROXY_COUNTRIES = ['GB', 'GB', 'GB', 'IE', 'DE', 'NL', 'FR']

const proxyRng = rngFor('proxies')

export const proxies: Proxy[] = Array.from({ length: 18 }, (_, i) => {
  const country = proxyRng.pick(PROXY_COUNTRIES)
  const status: Proxy['status'] = proxyRng.chance(0.72) ? 'ok' : proxyRng.chance(0.5) ? 'untested' : 'dead'
  return {
    id: `prx_${String(i + 1).padStart(2, '0')}`,
    groupId: `grp_${proxyRng.int(1, 3)}`,
    label: `${country.toLowerCase()}-res-${String(i + 1).padStart(2, '0')}`,
    host: `${proxyRng.int(10, 250)}.${proxyRng.int(10, 250)}.${proxyRng.int(10, 250)}.${proxyRng.int(10, 250)}`,
    port: proxyRng.pick([8080, 3128, 9000, 10000, 31280]),
    username: `fetch${proxyRng.int(1000, 9999)}`,
    passwordMasked: '•'.repeat(proxyRng.int(8, 12)),
    country,
    status,
    lastTestedAt: status === 'untested' ? undefined : ago(proxyRng.int(5, 4000) * MINUTE),
    latencyMs: status === 'ok' ? proxyRng.int(38, 480) : undefined,
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
const revenueRng = rngFor('revenue')

export const revenue: RevenuePoint[] = Array.from({ length: 12 }, (_, i) => {
  // Stepped by calendar month, not by a fixed 30-day block. A fixed stride drifts
  // about five days a year, so depending on the date it can land twice inside one
  // month and skip the next — which would leave `/kpis` picking a "current month"
  // bucket that is not this month.
  const now = new Date(SEED_NOW)
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (11 - i), 1))
  const period = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  const ticketsSold = revenueRng.int(24, 140)
  return {
    period,
    // £180–£520 average per seat, in minor units.
    revenue: ticketsSold * revenueRng.int(18000, 52000),
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
    source: 'club-direct',
    title: 'Seats sold',
    body: 'Two seats in North Bank Upper 21 sold at £245 each.',
  },
  {
    kind: 'account',
    source: 'ticketmaster-uk',
    title: 'Membership renewed',
    body: 'An official membership renewed for another season.',
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
    kind: 'system',
    source: 'fetch',
    title: 'Import finished',
    body: 'A CSV of 48 accounts imported with 3 warnings.',
  },
  {
    kind: 'sale',
    source: 'club-direct',
    title: 'Seats sold',
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
    kind: 'system',
    source: 'fetch',
    title: 'Delivery reminder',
    body: 'One sold pair still needs its tickets transferring.',
  },
  {
    kind: 'account',
    source: 'eventim-uk',
    title: 'Eligibility window open',
    body: 'Six accounts became eligible for the weekend fixtures.',
  },
  {
    kind: 'sale',
    source: 'club-direct',
    title: 'Seats sold',
    body: 'A pair in the Clock End sold within an hour.',
  },
  {
    kind: 'system',
    source: 'fetch',
    title: 'Membership expiring',
    body: 'One membership lapses inside 30 days.',
  },
]

const activityRng = rngFor('activity')

export const activity: ActivityEntry[] = ACTIVITY_TEMPLATES.map((t, i) => ({
  id: `act_${String(i + 1).padStart(3, '0')}`,
  ...t,
  at: ago(activityRng.int(5, 20000) * MINUTE),
})).sort((a, b) => b.at.localeCompare(a.at))

/* ----------------------------------------------------------- notifications */

const NOTIFICATION_TEMPLATES: Array<Pick<AppNotification, 'kind' | 'title' | 'body'>> = [
  {
    kind: 'success',
    title: 'Seats sold',
    body: 'Arsenal v Chelsea — North Bank Upper 21, Row 14, 2 seats sold.',
  },
  {
    kind: 'issue',
    title: 'Account needs OTP',
    body: 'An account hit a 2FA challenge on Man City and is waiting on a code.',
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
  { kind: 'success', title: 'Payout cleared', body: 'Last week’s payout has landed.' },
  {
    kind: 'issue',
    title: 'Membership expiring',
    body: 'One membership lapses inside 30 days and needs renewing today.',
  },
]

const notificationRng = rngFor('notifications')

export const notifications: AppNotification[] = NOTIFICATION_TEMPLATES.map((t, i) => ({
  id: `ntf_${String(i + 1).padStart(3, '0')}`,
  ...t,
  at: ago(notificationRng.int(3, 6000) * MINUTE),
  unread: i < 3,
})).sort((a, b) => b.at.localeCompare(a.at))

/* ------------------------------------------------------------------ ballots */

/**
 * The mailboxes a profile can read two-factor codes from. Two: one working, one that
 * stopped answering, because a profile pointed at a broken mailbox is a real state and
 * the launcher has to be able to warn about it.
 */
export const imapAccounts: ImapAccount[] = [
  {
    id: 'acc_imap_1',
    email: 'ballots@fetch.io',
    host: 'imap.fastmail.com',
    status: 'ok',
    lastCheckedAt: ago(2 * HOUR),
  },
  {
    id: 'acc_imap_2',
    email: 'codes@fetch.io',
    host: 'imap.gmail.com',
    status: 'error',
    lastCheckedAt: ago(6 * DAY),
  },
]

/**
 * One `default` profile ships and cannot be deleted (§B5.2), plus two the operator
 * would plausibly have made: a cautious one for clubs that rate-limit hard, and a fast
 * one for a pool that has already been warmed up.
 */
export const ballotProfiles: BallotProfile[] = [
  {
    id: 'bpf_default',
    name: 'Default',
    delayMinMs: 2000,
    delayMaxMs: 5000,
    concurrency: 8,
    maxRetries: 2,
    timeoutMs: 30000,
    proxyGroupId: 'grp_1',
    otpSource: 'none',
    stopOnRateLimit: true,
    notes: 'The shipped defaults. Safe for a first run against any club.',
    createdAt: ago(60 * DAY),
    updatedAt: ago(60 * DAY),
  },
  {
    id: 'bpf_slow',
    name: 'Slow and quiet',
    delayMinMs: 6000,
    delayMaxMs: 14000,
    concurrency: 3,
    maxRetries: 3,
    timeoutMs: 45000,
    proxyGroupId: 'grp_2',
    otpSource: 'imap',
    imapId: 'acc_imap_1',
    stopOnRateLimit: true,
    notes: 'For clubs that start refusing above three at a time.',
    createdAt: ago(21 * DAY),
    updatedAt: ago(9 * DAY),
  },
  {
    id: 'bpf_overnight',
    name: 'Overnight',
    delayMinMs: 20000,
    delayMaxMs: 40000,
    concurrency: 2,
    maxRetries: 2,
    timeoutMs: 60000,
    proxyGroupId: 'grp_1',
    otpSource: 'manual',
    // Deliberately false: an overnight run should carry on past a single refusal
    // rather than stopping at 3am with nobody watching.
    stopOnRateLimit: false,
    notes: 'Two at a time, long gaps. For leaving running while you sleep.',
    createdAt: ago(30 * DAY),
    updatedAt: ago(4 * DAY),
  },
  {
    id: 'bpf_fast',
    name: 'Fast pool',
    delayMinMs: 800,
    delayMaxMs: 2000,
    concurrency: 20,
    maxRetries: 1,
    timeoutMs: 20000,
    proxyGroupId: 'grp_3',
    otpSource: 'manual',
    stopOnRateLimit: false,
    notes: 'Only for accounts already signed in. Expect refusals otherwise.',
    createdAt: ago(11 * DAY),
    updatedAt: ago(2 * DAY),
  },
]

/**
 * Two finished runs and one in flight (§B6), so the history has something to show and
 * the monitor has something to watch on first load.
 *
 * The in-flight run is started far enough in the past that it is genuinely mid-way when
 * the server boots, and it keeps advancing from there on wall-clock time alone.
 */
export interface SeededRun {
  run: BallotRun
  accountIds: string[]
  pausedMs: number
  startedAt: number
}

const runRng = rngFor('runs')

function ballotAccountsFor(clubIds: BallotClubId[], limit: number): Account[] {
  const pool = accounts.filter((a) => (clubIds as string[]).includes(a.club))
  return runRng.shuffle(pool).slice(0, limit)
}

function seededRun(
  id: string,
  label: string,
  clubIds: BallotClubId[],
  profile: BallotProfile,
  size: number,
  startedMsAgo: number,
): SeededRun {
  const picked = ballotAccountsFor(clubIds, size)
  return {
    run: {
      id,
      label,
      clubIds,
      profileId: profile.id,
      profileName: profile.name,
      status: 'QUEUED',
      counts: {
        total: picked.length,
        queued: picked.length,
        running: 0,
        success: 0,
        failed: 0,
        needsOtp: 0,
        skipped: 0,
      },
      startedAt: ago(startedMsAgo),
      ratePerMin: 0,
      lastEventSeq: 0,
    },
    accountIds: picked.map((a) => a.id),
    pausedMs: 0,
    startedAt: SEED_NOW - startedMsAgo,
  }
}

export const ballotRuns: SeededRun[] = [
  // Long finished — the engine settles every task on the first request.
  seededRun('run_a1f3c2', 'Arsenal · Chelsea — members sale', ['arsenal', 'chelsea'], ballotProfiles[0]!, 42, 3 * DAY),
  seededRun('run_b7e214', 'Liverpool — Anfield ballot', ['liverpool'], ballotProfiles[1]!, 18, 26 * HOUR),
  // In flight: started recently enough that most tasks are still ahead of the clock.
  // In flight on purpose: the slow profile (concurrency 3, 6–14s between tasks) over the
  // whole pool, started seconds before boot. It arrives part-way through and keeps
  // moving on wall-clock time alone, which is what gives the monitor something to watch.
  seededRun(
    'run_c92d55',
    'Newcastle · Leeds · Forest — away scheme',
    ['newcastle', 'leeds', 'nottingham-forest', 'everton'],
    ballotProfiles.find((p) => p.id === 'bpf_overnight')!,
    64,
    25 * 1000,
  ),
]

/* --------------------------------------------------------------- passwords */

/**
 * Plaintext passwords, kept in a side table that is NEVER serialised into an Account.
 * Only POST /accounts/:id/reveal reads it. A real backend would hold these encrypted
 * at rest and audit every read — see docs/BACKEND-HANDOFF.md.
 */
const passwordRng = rngFor('passwords')

export const passwords = new Map<string, string>(
  accounts.map((a) => [a.id, `Fetch-${a.membershipId}-${passwordRng.int(1000, 9999)}`]),
)

export { HOUR, MINUTE, DAY }
