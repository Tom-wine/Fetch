import { handle, listQuery, multi, ok, paginate } from '@/lib/mock/http'
import { store } from '@/lib/mock/store'

/** GET /fixtures — the inventory list, one row per fixture (§8.4). */
export async function GET(request: Request) {
  return handle(request, (url) => {
    const query = listQuery(url)

    const clubs = multi(url, 'club')
    const competitions = multi(url, 'competition')
    const providers = multi(url, 'provider')
    // `when=upcoming|past|all` — the §8.4 "Upcoming only" filter.
    const when = url.searchParams.get('when') ?? 'all'
    const accountId = url.searchParams.get('accountId')

    const now = Date.now()
    const fixtureIdsForAccount = accountId
      ? new Set(store.tickets.filter((t) => t.accountId === accountId).map((t) => t.fixtureId))
      : null

    const rows = store.fixtures.filter((f) => {
      if (clubs.length && !clubs.includes(f.homeClub) && !clubs.includes(f.awayClub)) return false
      if (competitions.length && !competitions.includes(f.competition)) return false
      if (providers.length && !providers.includes(f.provider)) return false
      if (fixtureIdsForAccount && !fixtureIdsForAccount.has(f.id)) return false

      const kickoff = Date.parse(f.kickoff)
      if (when === 'upcoming' && kickoff < now) return false
      if (when === 'past' && kickoff >= now) return false
      return true
    })

    const { data, meta } = paginate(rows, query, {
      searchable: ['homeClub', 'awayClub', 'venue.name', 'venue.city', 'externalId'],
      defaultSort: 'kickoff',
    })

    return ok(data, meta)
  })
}
