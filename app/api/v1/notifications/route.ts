import { handle, listQuery, multi, ok, paginate } from '@/lib/mock/http'
import { store } from '@/lib/mock/store'

/** GET /notifications — the bell popover's counted tabs (§4). */
export async function GET(request: Request) {
  return handle(request, (url) => {
    const query = listQuery(url)
    const kinds = multi(url, 'kind')
    const unreadOnly = url.searchParams.get('unread') === 'true'

    const rows = store.notifications.filter((n) => {
      if (kinds.length && !kinds.includes(n.kind)) return false
      if (unreadOnly && !n.unread) return false
      return true
    })

    const { data, meta } = paginate(rows, query, {
      searchable: ['title', 'body'],
      defaultSort: 'at',
    })

    return ok(data, meta)
  })
}
