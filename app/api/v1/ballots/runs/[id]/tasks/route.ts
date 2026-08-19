import { advance } from '@/lib/mock/ballot-engine'
import { handle, listQuery, multi, notFound, ok, paginate } from '@/lib/mock/http'
import { store } from '@/lib/mock/store'

/** GET /ballots/runs/:id/tasks — paginated and filterable by `status`, `clubId`, `q`. */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  return handle(request, (url) => {
    const state = store.ballotRuns.get(id)
    if (!state) return notFound(`Run ${id}`)

    advance(state)

    const statuses = multi(url, 'status')
    const clubIds = multi(url, 'clubId')

    const rows = state.tasks.filter((t) => {
      if (statuses.length && !statuses.includes(t.status)) return false
      if (clubIds.length && !clubIds.includes(t.clubId)) return false
      return true
    })

    const { data, meta } = paginate(rows, listQuery(url), {
      searchable: ['accountEmail', 'lastMessage', 'entryRef'],
      defaultSort: 'updatedAt',
    })
    return ok(data, meta)
  })
}
