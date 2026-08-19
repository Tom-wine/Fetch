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
  { id: 'nav_proxies', type: 'navigation', title: 'Proxies', href: '/accounts?tab=proxies' },
  { id: 'nav_import', type: 'navigation', title: 'Import accounts', href: '/accounts/import' },
  { id: 'nav_tickets', type: 'navigation', title: 'My Tickets', href: '/mytickets' },
  { id: 'nav_listings', type: 'navigation', title: 'My Listings', href: '/mylistings' },
  { id: 'nav_links', type: 'navigation', title: 'My Links', href: '/mylinks' },
  { id: 'nav_fixtures', type: 'navigation', title: 'Fixtures Calendar', href: '/fixtures' },
  { id: 'nav_onsales', type: 'navigation', title: 'On-Sales', href: '/onsales' },
  { id: 'nav_insights', type: 'navigation', title: 'Insights', href: '/insights' },
  { id: 'nav_salestracker', type: 'navigation', title: 'Sales Tracker', href: '/salestracker' },
  { id: 'nav_settings', type: 'navigation', title: 'Settings', href: '/settings' },
  {
    id: 'nav_settings_preferences',
    type: 'navigation',
    title: 'Preferences',
    subtitle: 'Language, timezone, currency',
    href: '/settings?tab=preferences',
  },
  {
    id: 'nav_settings_api',
    type: 'navigation',
    title: 'API settings',
    subtitle: 'Base URL and access token',
    href: '/settings?tab=api',
  },
]

const LIMIT_PER_TYPE = 5

export async function GET(request: Request) {
  return handle(request, (url) => {
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
    if (!q) return ok([])

    const results: SearchResult[] = []

    for (const a of store.accounts) {
      if (results.filter((r) => r.type === 'account').length >= LIMIT_PER_TYPE) break
      // The club is part of the haystack because it is how an operator thinks about
      // an account. Typing `arsenal` and getting fixtures and listings but none of
      // the twelve Arsenal accounts reads as a broken search, not a narrow one.
      const club = getClub(a.club)
      const haystack = `${a.email} ${a.firstName ?? ''} ${a.lastName ?? ''} ${a.membershipId} ${club.name} ${club.short}`
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

    // Subtitles are matched as well as titles, so `currency` reaches Preferences and
    // `token` reaches the API tab — the words an operator actually has in mind are
    // rarely the name of the screen.
    for (const nav of NAVIGATION) {
      if (`${nav.title} ${nav.subtitle ?? ''}`.toLowerCase().includes(q)) results.push(nav)
    }

    return ok(results)
  })
}
