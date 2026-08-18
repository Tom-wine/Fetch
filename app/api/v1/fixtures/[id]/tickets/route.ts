import { handle, listQuery, multi, notFound, ok, paginate } from '@/lib/mock/http'
import { store } from '@/lib/mock/store'

/** GET /fixtures/:id/tickets — the seat-level rows of the §8.5 two-pane screen. */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  return handle(request, (url) => {
    if (!store.fixtures.some((f) => f.id === id)) return notFound('That fixture')

    const query = listQuery(url)
    const accountIds = multi(url, 'accountId')
    const blocks = multi(url, 'block')
    const rowFilters = multi(url, 'row')
    const statuses = multi(url, 'status')

    const rows = store.tickets.filter((t) => {
      if (t.fixtureId !== id) return false
      if (accountIds.length && !accountIds.includes(t.accountId)) return false
      if (blocks.length && !blocks.includes(t.block)) return false
      if (rowFilters.length && !rowFilters.includes(t.row)) return false
      if (statuses.length && !statuses.includes(t.status)) return false
      return true
    })

    const { data, meta } = paginate(rows, query, {
      searchable: ['block', 'levelName', 'row', 'seat', 'orderId'],
      defaultSort: 'block',
    })

    return ok(data, meta)
  })
}
