import { handle, notFound, ok } from '@/lib/mock/http'
import { store } from '@/lib/mock/store'

/**
 * POST /accounts/:id/reveal — the ONE endpoint that returns a plaintext password.
 *
 * Security notes, which a real backend must honour and this mock only imitates:
 * - It is a POST, not a GET, so the value never lands in a URL, a referrer or a log line.
 * - It is audit-logged server side. The console line below stands in for that; it
 *   deliberately records the account id and NOT the password.
 * - The response is marked no-store so no cache holds it.
 * - `expiresAt` tells the client the value is short-lived; PasswordCell re-masks
 *   after 10 seconds regardless.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  return handle(request, () => {
    const account = store.accounts.find((a) => a.id === id)
    if (!account) return notFound('That account')

    const password = store.passwords.get(id)
    if (!password) return notFound('A stored password for that account')

    // Audit trail. The id, never the secret.
    console.info(`[audit] password revealed for account ${id}`)

    const response = ok({
      password,
      expiresAt: new Date(Date.now() + 10_000).toISOString(),
    })
    response.headers.set('Cache-Control', 'no-store')
    return response
  })
}
