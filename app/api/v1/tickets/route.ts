import { idsSchema } from '@/lib/api/schemas'
import { handle, ok, readJson } from '@/lib/mock/http'
import { store } from '@/lib/mock/store'

/** DELETE /tickets — bulk delete `{ ids: [] }`. */
export async function DELETE(request: Request) {
  return handle(request, async () => {
    const body = await readJson(request, (v) => idsSchema.safeParse(v))
    if (!body.ok) return body.response

    const ids = new Set(body.value.ids)
    const before = store.tickets.length
    store.tickets = store.tickets.filter((t) => !ids.has(t.id))

    return ok({ affected: before - store.tickets.length, ids: [...ids] })
  })
}
