import { handle, notFound, ok } from '@/lib/mock/http'
import { store } from '@/lib/mock/store'

/** GET /fixtures/:id — the detail screen's header data (§8.5). */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  return handle(request, () => {
    const fixture = store.fixtures.find((f) => f.id === id)
    return fixture ? ok(fixture) : notFound('That fixture')
  })
}
