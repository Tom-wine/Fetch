import { listingPatchSchema } from '@/lib/api/schemas'
import { handle, notFound, ok, readJson } from '@/lib/mock/http'
import { store } from '@/lib/mock/store'

/**
 * PATCH /listings/:id — the inline price edit and status toggle (§8.6).
 *
 * Returns the full updated listing, which is what makes the optimistic path safe:
 * the client can replace its cache entry rather than merging a guess.
 */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  return handle(request, async () => {
    const body = await readJson(request, (v) => listingPatchSchema.safeParse(v))
    if (!body.ok) return body.response

    const index = store.listings.findIndex((l) => l.id === id)
    if (index === -1) return notFound('That listing')

    const updated = { ...store.listings[index]!, ...body.value }
    store.listings[index] = updated
    return ok(updated)
  })
}
