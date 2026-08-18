import { listingBulkSchema } from '@/lib/api/schemas'
import { ERROR_CODES, fail, handle, ok, readJson } from '@/lib/mock/http'
import { store } from '@/lib/mock/store'
import type { Listing } from '@/lib/types'

/** POST /listings/bulk — activate / deactivate / reprice / delete (§8.6). */
export async function POST(request: Request) {
  return handle(request, async () => {
    const body = await readJson(request, (v) => listingBulkSchema.safeParse(v))
    if (!body.ok) return body.response

    const { ids, action, price } = body.value

    if (action === 'reprice' && !price) {
      return fail(422, ERROR_CODES.VALIDATION_ERROR, 'A reprice needs a new price.', {
        price: ['Enter the new price in minor units.'],
      })
    }

    if (action === 'delete') {
      const set = new Set(ids)
      const before = store.listings.length
      store.listings = store.listings.filter((l) => !set.has(l.id))
      return ok({ affected: before - store.listings.length, ids, listings: [] })
    }

    const updated: Listing[] = []
    for (const id of ids) {
      const index = store.listings.findIndex((l) => l.id === id)
      if (index === -1) continue
      const current = store.listings[index]!
      const next: Listing = {
        ...current,
        ...(action === 'activate' ? { status: 'ACTIVE' as const } : {}),
        ...(action === 'deactivate' ? { status: 'INACTIVE' as const } : {}),
        ...(action === 'reprice' && price ? { price } : {}),
      }
      store.listings[index] = next
      updated.push(next)
    }

    return ok({ affected: updated.length, ids, listings: updated })
  })
}
