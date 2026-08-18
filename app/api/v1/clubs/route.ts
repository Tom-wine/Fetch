import { handle, listQuery, ok, paginate } from '@/lib/mock/http'
import { clubs } from '@/lib/mock/seed'

/**
 * GET /clubs — reference data for pickers.
 *
 * Read straight from lib/registries/clubs.ts, so the API and the ClubBadge can never
 * disagree about which 20 clubs exist.
 */
export async function GET(request: Request) {
  return handle(request, (url) => {
    const query = { ...listQuery(url), pageSize: Number(url.searchParams.get('pageSize') ?? 100) }
    const { data, meta } = paginate(clubs, query, {
      searchable: ['name', 'short', 'city', 'stadium'],
      defaultSort: 'name',
    })
    return ok(data, meta)
  })
}
