import { handle, listQuery, multi, ok, paginate } from '@/lib/mock/http'
import { store } from '@/lib/mock/store'

/** GET /proxies — the Proxies tab of the account manager (§8.2). */
export async function GET(request: Request) {
  return handle(request, (url) => {
    const query = listQuery(url)
    const statuses = multi(url, 'status')
    const groupIds = multi(url, 'groupId')

    const rows = store.proxies.filter((p) => {
      if (statuses.length && !statuses.includes(p.status)) return false
      if (groupIds.length && !groupIds.includes(p.groupId)) return false
      return true
    })

    const { data, meta } = paginate(rows, query, {
      searchable: ['label', 'host', 'country'],
      defaultSort: 'label',
    })

    return ok(data, meta)
  })
}
