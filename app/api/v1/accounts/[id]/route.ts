import { accountPatchSchema } from '@/lib/api/schemas'
import { handle, notFound, ok, readJson } from '@/lib/mock/http'
import { newId, store } from '@/lib/mock/store'
import type { CardRef } from '@/lib/types'

/** PATCH /accounts/:id — edit. Returns the full updated resource (§6.2). */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  return handle(request, async () => {
    const body = await readJson(request, (v) => accountPatchSchema.safeParse(v))
    if (!body.ok) return body.response

    const index = store.accounts.findIndex((a) => a.id === id)
    if (index === -1) return notFound('That account')

    const { password, cards, ...rest } = body.value
    // imapEmail/imapPassword are register-only concerns; they never patch an account.
    delete (rest as Record<string, unknown>).imapEmail
    delete (rest as Record<string, unknown>).imapPassword
    const updated = { ...store.accounts[index]!, ...rest }

    // Cards arrive without ids (tokenized, no PAN/CVV). Mint an id per card.
    if (cards !== undefined) {
      const withIds: CardRef[] = cards.map((c) => ({ ...c, id: newId('card') }))
      updated.cards = withIds.length > 0 ? withIds : undefined
    }

    // A password change updates the side table and the mask — never the response.
    if (password) {
      store.passwords.set(id, password)
      updated.passwordMasked = '•'.repeat(Math.min(14, Math.max(8, password.length)))
    }

    store.accounts[index] = updated
    return ok(updated)
  })
}

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  return handle(request, () => {
    const account = store.accounts.find((a) => a.id === id)
    return account ? ok(account) : notFound('That account')
  })
}
