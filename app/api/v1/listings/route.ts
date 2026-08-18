import { handle, listQuery, multi, ok, paginate } from '@/lib/mock/http'
import { store } from '@/lib/mock/store'

/** GET /listings — every active listing across all marketplaces (§8.6). */
export async function GET(request: Request) {
  return handle(request, (url) => {
    const query = listQuery(url)

    const platforms = multi(url, 'platform')
    const accountIds = multi(url, 'accountId')
    const statuses = multi(url, 'status')
    const fixtureIds = multi(url, 'fixtureId')

    const rows = store.listings.filter((l) => {
      if (platforms.length && !platforms.includes(l.platform)) return false
      if (accountIds.length && !accountIds.includes(l.accountId)) return false
      if (statuses.length && !statuses.includes(l.status)) return false
      if (fixtureIds.length && !fixtureIds.includes(l.fixtureId)) return false
      return true
    })

    const { data, meta } = paginate(rows, query, {
      searchable: ['fixtureName', 'listingId', 'block'],
      defaultSort: 'kickoff',
    })

    return ok(data, meta)
  })
}
