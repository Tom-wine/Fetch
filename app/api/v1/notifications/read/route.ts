import { z } from 'zod'
import { handle, ok, readJson } from '@/lib/mock/http'
import { store } from '@/lib/mock/store'

/** POST /notifications/read — mark some, or all, as read. */
const bodySchema = z.object({
  /** Omit to mark everything read, which is what "Mark all read" sends. */
  ids: z.array(z.string()).optional(),
})

export async function POST(request: Request) {
  return handle(request, async () => {
    const body = await readJson(request, (v) => bodySchema.safeParse(v))
    if (!body.ok) return body.response

    const ids = body.value.ids ? new Set(body.value.ids) : null
    let affected = 0

    store.notifications = store.notifications.map((n) => {
      if (!n.unread) return n
      if (ids && !ids.has(n.id)) return n
      affected++
      return { ...n, unread: false }
    })

    return ok({ affected, notifications: store.notifications })
  })
}
