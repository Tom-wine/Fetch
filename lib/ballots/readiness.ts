import type { Account, AccountStatus } from '@/lib/types'

/**
 * Can this account enter a ballot tonight?
 *
 * The pool table has always shown STATUS, which is the account's SESSION state —
 * whether the last check could log in. That is one of five things a run needs, and the
 * operator was left to do the other four in their head. An account with a perfect
 * `active` status still cannot enter if it has no proxy and the profile routes through
 * a proxy group, or if its membership lapsed last week.
 *
 * So the rule lives here, once, and both the dashboard's BALLOT_READINESS card and the
 * pool's READY column read it. Two screens answering the same question differently is
 * how an operator learns to trust neither.
 *
 * Everything is derived from data the client already holds — the account, the proxy it
 * points at, and the profile the run will use. There is no readiness endpoint, and
 * there should not be: readiness is a question about a PLANNED RUN, and the server does
 * not know which profile the operator is about to pick.
 */

export type BlockedReason =
  | 'locked'
  | 'needs_login'
  | 'needs_otp'
  | 'membership_expired'
  | 'check_failed'
  | 'no_proxy'
  | 'no_otp_mailbox'

/** What the run itself demands, read off the profile that will be used. */
export interface RunRequirements {
  /** The profile routes through a proxy group, so an account without one cannot go. */
  requiresProxy: boolean
  /** The profile reads its codes from IMAP. */
  requiresOtpMailbox: boolean
  /** ...and at least one mailbox is actually configured. */
  hasOtpMailbox: boolean
}

export interface Readiness {
  ready: boolean
  /** Why not. Null when ready. */
  reason: BlockedReason | null
  /**
   * Ready today, and not for much longer. NOT a blocker: an account whose membership
   * lapses in nine days can still enter tonight's ballot, and calling it blocked would
   * be the same lie in the other direction.
   */
  expiringSoon: boolean
}

/** How far ahead a lapsing membership is worth mentioning. */
export const EXPIRING_SOON_DAYS = 30

const DAY_MS = 86_400_000

interface ReasonSpec {
  /** Chip text — chrome, so it is UPPER_SNAKE'd where it renders. */
  label: string
  /** One plain sentence: what it means and what fixes it (§B7 rule 3). */
  hint: string
  /**
   * Where the operator goes to fix it. The status-derived reasons use the pool's own
   * server-side status filter; the two that come from the profile use `ready`, which
   * the pool resolves in the browser.
   */
  href: string
}

export const BLOCKED_REASONS: Record<BlockedReason, ReasonSpec> = {
  locked: {
    label: 'locked',
    hint: 'The club locked this account. It has to be unlocked on the club site before it can enter anything.',
    href: '/ballots?tab=pool&status=locked',
  },
  needs_login: {
    label: 'needs login',
    hint: 'The stored session expired. Re-log this account and it is ready again.',
    href: '/ballots?tab=pool&status=needs_login',
  },
  needs_otp: {
    label: 'needs OTP',
    hint: 'A two-factor challenge is waiting on a code. Clear it once and the session holds.',
    href: '/ballots?tab=pool&status=needs_otp',
  },
  membership_expired: {
    label: 'membership expired',
    hint: 'The membership behind this account has lapsed, so the club refuses the entry whatever the login says.',
    href: '/ballots?tab=pool&status=expired',
  },
  check_failed: {
    label: 'last check failed',
    hint: 'The last check errored rather than answering. Check it again to find out which of the two this is.',
    href: '/ballots?tab=pool&status=error',
  },
  no_proxy: {
    label: 'no proxy',
    hint: 'This profile routes through a proxy group and this account has none, so its entry would leave from your own address.',
    href: '/ballots?tab=pool&ready=no_proxy',
  },
  no_otp_mailbox: {
    label: 'no OTP mailbox',
    hint: 'This profile reads codes from IMAP and no mailbox is configured, so a code would have nowhere to land.',
    href: '/ballots?tab=pool&ready=no_otp_mailbox',
  },
}

/**
 * The order counters are shown in, and the order a blocked account is explained in: the
 * thing that makes the account useless first, the cheapest thing to fix last. An account
 * that is both locked and proxyless is reported as locked, because giving it a proxy
 * would not move it.
 */
export const REASON_ORDER: BlockedReason[] = [
  'locked',
  'membership_expired',
  'needs_login',
  'needs_otp',
  'check_failed',
  'no_proxy',
  'no_otp_mailbox',
]

const STATUS_REASON: Partial<Record<AccountStatus, BlockedReason>> = {
  locked: 'locked',
  expired: 'membership_expired',
  needs_login: 'needs_login',
  needs_otp: 'needs_otp',
  error: 'check_failed',
}

/**
 * `membershipExpiresAt` is authoritative even when the status says `active`: the status
 * is what the last CHECK saw, and a membership can lapse between two checks.
 */
function expiryOf(account: Account): number | null {
  const parsed = Date.parse(account.membershipExpiresAt ?? '')
  return Number.isFinite(parsed) ? parsed : null
}

export function readinessOf(
  account: Account,
  requirements: RunRequirements,
  now = Date.now(),
): Readiness {
  const expiry = expiryOf(account)

  const reason: BlockedReason | null =
    STATUS_REASON[account.status] ??
    (expiry !== null && expiry <= now ? 'membership_expired' : null) ??
    // A profile that wants IMAP with no mailbox configured blocks EVERY account. It is
    // a property of the profile, reported per account anyway, because the pool is where
    // the operator is looking when they wonder why none of them are ready.
    (requirements.requiresOtpMailbox && !requirements.hasOtpMailbox ? 'no_otp_mailbox' : null) ??
    (requirements.requiresProxy && !account.proxyId ? 'no_proxy' : null)

  return {
    ready: reason === null,
    reason,
    expiringSoon:
      reason === null &&
      expiry !== null &&
      expiry > now &&
      expiry - now <= EXPIRING_SOON_DAYS * DAY_MS,
  }
}

export interface ReadinessSummary {
  total: number
  ready: number
  expiringSoon: number
  byReason: Record<BlockedReason, number>
}

export function summariseReadiness(
  accounts: Account[],
  requirements: RunRequirements,
  now = Date.now(),
): ReadinessSummary {
  const byReason = Object.fromEntries(REASON_ORDER.map((reason) => [reason, 0])) as Record<
    BlockedReason,
    number
  >

  let ready = 0
  let expiringSoon = 0

  for (const account of accounts) {
    const state = readinessOf(account, requirements, now)
    if (state.ready) {
      ready++
      if (state.expiringSoon) expiringSoon++
    } else if (state.reason) {
      byReason[state.reason]++
    }
  }

  return { total: accounts.length, ready, expiringSoon, byReason }
}
