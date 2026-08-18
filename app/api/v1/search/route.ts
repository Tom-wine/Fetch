import { handle, ok } from '@/lib/mock/http'
import { store } from '@/lib/mock/store'
import { getClub } from '@/lib/registries/clubs'
import type { SearchResult } from '@/lib/types'

/**
 * GET /search?q= — the ⌘K palette, returning mixed-type results (§7 #5).
 *
 * Navigation targets are matched too, so the palette can jump to a screen as well as
 * to a record.
 */
const NAVIGATION: SearchResult[] = [
  { id: 'nav_dashboard', type: 'navigation', title: 'Dashboard', href: '/dashboard' },
  { id: 'nav_accounts', type: 'navigation', title: 'Account Manager', href: '/accounts' },
  { id: 'nav_import', type: 'navigation', title: 'Import accounts', href: '/accounts/import' },
  { id: 'nav_tickets', type: 'navigation', title: 'My Tickets', href: '/mytickets' },
  { id: 'nav_listings', type: 'navigation', title: 'My Listings', href: '/mylistings' },
  { id: 'nav_settings', type: 'navigation', title: 'Settings', href: '/settings' },
]

const LIMIT_PER_TYPE = 5

export async function GET(request: Request) {
  return handle(request, (url) => {
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
    if (!q) return ok([])

    const results: SearchResult[] = []

    for (const a of store.accounts) {
      if (results.filter((r) => r.type === 'account').length >= LIMIT_PER_TYPE) break
      const haystack = `${a.email} ${a.firstName ?? ''} ${a.lastName ?? ''} ${a.membershipId}`
      if (haystack.toLowerCase().includes(q)) {
        results.push({
          id: a.id,
          type: 'account',
          title: a.email,
          subtitle: `${getClub(a.club).name} · ${a.membershipId}`,
          href: `/accounts?account=${a.id}`,
        })
      }
    }

    for (const f of store.fixtures) {
      if (results.filter((r) => r.type === 'fixture').length >= LIMIT_PER_TYPE) break
      const home = getClub(f.homeClub)
      const away = getClub(f.awayClub)
      const haystack = `${home.name} ${away.name} ${f.venue.name} ${f.venue.city}`
      if (haystack.toLowerCase().includes(q)) {
        results.push({
          id: f.id,
          type: 'fixture',
          title: `${home.short} v ${away.short}`,
          subtitle: `${f.venue.name} · ${f.venue.city}`,
          href: `/mytickets/fixture/${f.id}`,
        })
      }
    }

    for (const l of store.listings) {
      if (results.filter((r) => r.type === 'listing').length >= LIMIT_PER_TYPE) break
      if (`${l.fixtureName} ${l.listingId} ${l.block}`.toLowerCase().includes(q)) {
        results.push({
          id: l.id,
          type: 'listing',
          title: l.listingId,
          subtitle: `${l.fixtureName} · ${l.block}`,
          href: `/mylistings?listing=${l.id}`,
        })
      }
    }

    for (const nav of NAVIGATION) {
      if (nav.title.toLowerCase().includes(q)) results.push(nav)
    }

    return ok(results)
  })
}
