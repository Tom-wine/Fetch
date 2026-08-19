import type { ClubId } from '@/lib/registries/clubs'
import type { AccountStatus } from '@/components/domain/StatusChip'

/**
 * Fixed demo rows for /kitchen-sink. Hand-written and deterministic — no
 * Math.random(), and no dates derived from the clock except the `lastCheckedAt`
 * offsets noted below — so the page is a stable visual regression check and two
 * screenshots of it differ only when a component changed.
 *
 * Real seeded data arrives in Part 3; this is display fodder only. Names, emails,
 * clubs and venues render verbatim, which is exactly the guardrail this page is
 * meant to demonstrate.
 */

export interface DemoAccount extends Record<string, unknown> {
  id: string
  email: string
  name: string
  club: ClubId
  membershipId: string
  membershipType: string
  loyaltyPoints: number
  ticketsPurchased: number
  status: AccountStatus
  proxy: string
  lastCheckedAt: string
  passwordMasked: string
}

/**
 * Kickoffs are absolute dates, so the seven-day countdown ramp is reproducible.
 *
 * `lastCheckedAt` cannot be: a "last checked" column that reads `in 3 wk` is simply
 * wrong, whatever the calendar says. Those are offsets from load time instead — the
 * one deliberately non-deterministic thing on this page, and only in that column.
 */
const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

function ago(ms: number): string {
  return new Date(Date.now() - ms).toISOString()
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: 'acc_01',
    email: 'j.moreau@mail.com',
    name: 'Julien Moreau',
    club: 'arsenal',
    membershipId: 'AFC-8842019',
    membershipType: 'season-ticket',
    loyaltyPoints: 2140,
    ticketsPurchased: 34,
    status: 'active',
    proxy: 'uk-res-04',
    lastCheckedAt: ago(4 * MINUTE),
    passwordMasked: '••••••••••',
  },
  {
    id: 'acc_02',
    email: 'k.dubois@mail.com',
    name: 'Kévin Dubois',
    club: 'man-city',
    membershipId: 'MCFC-551204',
    membershipType: 'official-member',
    loyaltyPoints: 980,
    ticketsPurchased: 12,
    status: 'needs_otp',
    proxy: 'uk-res-11',
    lastCheckedAt: ago(HOUR),
    passwordMasked: '••••••••',
  },
  {
    id: 'acc_03',
    email: 'a.laurent@mail.com',
    name: 'Amélie Laurent',
    club: 'liverpool',
    membershipId: 'LFC-2290471',
    membershipType: 'official-member',
    loyaltyPoints: 3725,
    ticketsPurchased: 51,
    status: 'locked',
    proxy: 'uk-res-02',
    lastCheckedAt: ago(27 * HOUR),
    passwordMasked: '••••••••••••',
  },
  {
    id: 'acc_04',
    email: 's.okafor@mail.com',
    name: 'Sam Okafor',
    club: 'tottenham',
    membershipId: 'THFC-119043',
    membershipType: 'digital-member',
    loyaltyPoints: 410,
    ticketsPurchased: 6,
    status: 'needs_login',
    proxy: 'uk-res-07',
    lastCheckedAt: ago(2 * DAY),
    passwordMasked: '••••••••',
  },
  {
    id: 'acc_05',
    email: 'r.novak@mail.com',
    name: 'Radek Novák',
    club: 'chelsea',
    membershipId: 'CFC-704228',
    membershipType: 'international-member',
    loyaltyPoints: 1560,
    ticketsPurchased: 19,
    status: 'expired',
    proxy: 'de-res-01',
    lastCheckedAt: ago(5 * DAY),
    passwordMasked: '••••••••••',
  },
  {
    id: 'acc_06',
    email: 'm.ferrari@mail.com',
    name: 'Marco Ferrari',
    club: 'man-utd',
    membershipId: 'MUFC-336712',
    membershipType: 'official-member',
    loyaltyPoints: 2890,
    ticketsPurchased: 27,
    status: 'active',
    proxy: 'uk-res-09',
    lastCheckedAt: ago(16 * MINUTE),
    passwordMasked: '••••••••••',
  },
  {
    id: 'acc_07',
    email: 'h.olsen@mail.com',
    name: 'Henrik Olsen',
    club: 'newcastle',
    membershipId: 'NUFC-882140',
    membershipType: 'general-sale',
    loyaltyPoints: 220,
    ticketsPurchased: 3,
    status: 'error',
    proxy: 'uk-res-15',
    lastCheckedAt: ago(6 * HOUR),
    passwordMasked: '••••••',
  },
]

export interface DemoFixture extends Record<string, unknown> {
  id: string
  homeClub: ClubId
  awayClub: ClubId
  competition: 'premier-league' | 'fa-cup' | 'ucl'
  matchweek: number
  kickoff: string
  venue: string
  city: string
  total: number
  listed: number
  sold: number
  valueAtRisk: number
  currency: 'GBP' | 'EUR'
}

export const DEMO_FIXTURES: DemoFixture[] = [
  {
    id: 'fx_01',
    homeClub: 'arsenal',
    awayClub: 'chelsea',
    competition: 'premier-league',
    matchweek: 5,
    kickoff: '2026-09-14T14:00:00.000Z',
    venue: 'Emirates Stadium',
    city: 'London',
    total: 18,
    listed: 11,
    sold: 5,
    valueAtRisk: 486000,
    currency: 'GBP',
  },
  {
    id: 'fx_02',
    homeClub: 'liverpool',
    awayClub: 'everton',
    competition: 'premier-league',
    matchweek: 5,
    kickoff: '2026-09-16T19:00:00.000Z',
    venue: 'Anfield',
    city: 'Liverpool',
    total: 12,
    listed: 9,
    sold: 2,
    valueAtRisk: 312500,
    currency: 'GBP',
  },
  {
    id: 'fx_03',
    homeClub: 'man-city',
    awayClub: 'brighton',
    competition: 'premier-league',
    matchweek: 6,
    kickoff: '2026-09-27T11:30:00.000Z',
    venue: 'Etihad Stadium',
    city: 'Manchester',
    total: 24,
    listed: 20,
    sold: 9,
    valueAtRisk: 178000,
    currency: 'GBP',
  },
  {
    id: 'fx_04',
    homeClub: 'tottenham',
    awayClub: 'wolves',
    competition: 'ucl',
    matchweek: 2,
    kickoff: '2026-10-21T19:00:00.000Z',
    venue: 'Tottenham Hotspur Stadium',
    city: 'London',
    total: 8,
    listed: 3,
    sold: 0,
    valueAtRisk: 96000,
    currency: 'EUR',
  },
]

export const DEMO_REVENUE = [
  { month: 'Apr', revenue: 1840000, listed: 96, sold: 62 },
  { month: 'May', revenue: 2210000, listed: 108, sold: 71 },
  { month: 'Jun', revenue: 1560000, listed: 74, sold: 48 },
  { month: 'Jul', revenue: 980000, listed: 52, sold: 31 },
  { month: 'Aug', revenue: 2640000, listed: 131, sold: 88 },
  { month: 'Sep', revenue: 4821000, listed: 176, sold: 124 },
]

export const DEMO_SPARK = [
  { value: 12 },
  { value: 18 },
  { value: 15 },
  { value: 24 },
  { value: 21 },
  { value: 32 },
  { value: 29 },
  { value: 41 },
]
