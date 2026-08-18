import { handle, listQuery, multi, ok, paginate } from '@/lib/mock/http'
import { activity } from '@/lib/mock/seed'

/** GET /activity — the dashboard feed, filterable by source tab (§8.1). */
export async function GET(request: Request) {
  return handle(request, (url) => {
    const query = listQuery(url)
    const sources = multi(url, 'source')
    const kinds = multi(url, 'kind')

    const rows = activity.filter((a) => {
      if (sources.length && !sources.includes(a.source)) return false
      if (kinds.length && !kinds.includes(a.kind)) return false
      return true
    })

    const { data, meta } = paginate(rows, query, {
      searchable: ['title', 'body'],
      defaultSort: 'at',
    })

    return ok(data, meta)
  })
}
