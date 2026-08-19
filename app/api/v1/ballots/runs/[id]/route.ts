import { advance } from '@/lib/mock/ballot-engine'
import { handle, notFound, ok } from '@/lib/mock/http'
import { store } from '@/lib/mock/store'

/**
 * GET /ballots/runs/:id — the run's state (§B4).
 *
 * Advanced on every read. That is the whole trick: the run moves because someone
 * asked, not because a timer fired, so it survives a reload and leaks nothing.
 */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  return handle(request, () => {
    const state = store.ballotRuns.get(id)
    if (!state) return notFound(`Run ${id}`)

    advance(state)
    return ok(state.run)
  })
}

/** DELETE /ballots/runs/:id — remove a run from the history. */
export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  return handle(request, () => {
    if (!store.ballotRuns.has(id)) return notFound(`Run ${id}`)
    store.ballotRuns.delete(id)
    return ok({ id })
  })
}
