import { handle, notFound, ok } from '@/lib/mock/http'
import { store } from '@/lib/mock/store'

/**
 * POST /proxies/:id/test — run a connectivity check.
 *
 * The verdict is derived from the id rather than drawn at random, so the same proxy
 * gives the same answer on every run and a screenshot stays stable.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  return handle(request, () => {
    const index = store.proxies.findIndex((p) => p.id === id)
    if (index === -1) return notFound('That proxy')

    const hash = [...id].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7)
    const alive = hash % 5 !== 0

    const updated = {
      ...store.proxies[index]!,
      status: alive ? ('ok' as const) : ('dead' as const),
      latencyMs: alive ? 40 + (hash % 420) : undefined,
      lastTestedAt: new Date().toISOString(),
    }

    store.proxies[index] = updated
    return ok(updated)
  })
}
