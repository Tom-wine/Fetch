import type { Account, AppNotification, Fixture, Listing, Proxy, Ticket } from '@/lib/types'
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
  listings: Listing[]
  proxies: Proxy[]
  notifications: AppNotification[]
  passwords: Map<string, string>
  /** Incremented per created resource so ids stay unique and opaque. */
  sequence: number
}

const globalRef = globalThis as typeof globalThis & { __fetchStore?: Store }

function create(): Store {
  return {
    accounts: seed.accounts.map((a) => ({ ...a })),
    fixtures: seed.fixtures.map((f) => ({ ...f })),
    tickets: seed.tickets.map((t) => ({ ...t })),
    listings: seed.listings.map((l) => ({ ...l })),
    proxies: seed.proxies.map((p) => ({ ...p })),
    notifications: seed.notifications.map((n) => ({ ...n })),
    passwords: new Map(seed.passwords),
    sequence: 1000,
  }
}

export const store: Store = (globalRef.__fetchStore ??= create())

/** Opaque, non-sequential-looking ids — §6.2 says never assume numeric. */
export function newId(prefix: string): string {
  store.sequence += 7
  return `${prefix}_${store.sequence.toString(36)}${(store.sequence * 31).toString(36).slice(-3)}`
}
