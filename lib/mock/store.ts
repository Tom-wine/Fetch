import type {
  Account,
  AppNotification,
  BallotProfile,
  Fixture,
  ImapAccount,
  Proxy,
  Ticket,
} from '@/lib/types'
import { buildTasks, type RunState } from './ballot-engine'
import * as seed from './seed'

/**
 * The mutable in-memory store.
 *
 * Mutations write here, so a price edit or a delete persists for the life of the dev
 * server and the optimistic-update path is genuinely exercised rather than silently
 * reverted by the next refetch. It resets on restart, which is the point — it is a
 * mock, not a database.
 *
 * Next's dev server re-evaluates modules on hot reload, so the store is parked on
 * globalThis to survive that.
 */
interface Store {
  accounts: Account[]
  fixtures: Fixture[]
  tickets: Ticket[]
  proxies: Proxy[]
  notifications: AppNotification[]
  passwords: Map<string, string>
  ballotProfiles: BallotProfile[]
  imapAccounts: ImapAccount[]
  /**
   * Keyed by run id. The engine mutates these in place on every read, which is what
   * makes a run advance without a timer -- see lib/mock/ballot-engine.ts.
   */
  ballotRuns: Map<string, RunState>
  /** Incremented per created resource so ids stay unique and opaque. */
  sequence: number
}

const globalRef = globalThis as typeof globalThis & { __fetchStore?: Store }

function create(): Store {
  return {
    accounts: seed.accounts.map((a) => ({ ...a })),
    fixtures: seed.fixtures.map((f) => ({ ...f })),
    tickets: seed.tickets.map((t) => ({ ...t })),
    proxies: seed.proxies.map((p) => ({ ...p })),
    notifications: seed.notifications.map((n) => ({ ...n })),
    passwords: new Map(seed.passwords),
    ballotProfiles: seed.ballotProfiles.map((p) => ({ ...p })),
    imapAccounts: seed.imapAccounts.map((a) => ({ ...a })),
    ballotRuns: seedRuns(),
    sequence: 1000,
  }
}

/**
 * The seeded runs, materialised into engine state. Their tasks start QUEUED and the
 * engine catches each run up to the wall clock on the first request that touches it,
 * so the two old runs arrive finished and the recent one arrives mid-flight.
 */
function seedRuns(): Map<string, RunState> {
  const byId = new Map(seed.accounts.map((a) => [a.id, a]))
  const map = new Map<string, RunState>()

  for (const s of seed.ballotRuns) {
    const profile = seed.ballotProfiles.find((p) => p.id === s.run.profileId) ?? seed.ballotProfiles[0]!
    const picked = s.accountIds
      .map((id) => byId.get(id))
      .filter((a): a is NonNullable<typeof a> => Boolean(a))
      .map((a) => ({ id: a.id, email: a.email, club: a.club }))

    map.set(s.run.id, {
      run: { ...s.run },
      tasks: buildTasks(s.run.id, picked, profile),
      events: [],
      profile,
      pausedMs: s.pausedMs,
      materialised: 0,
    })
  }
  return map
}

export const store: Store = (globalRef.__fetchStore ??= create())

/** Opaque, non-sequential-looking ids — §6.2 says never assume numeric. */
export function newId(prefix: string): string {
  store.sequence += 7
  return `${prefix}_${store.sequence.toString(36)}${(store.sequence * 31).toString(36).slice(-3)}`
}
