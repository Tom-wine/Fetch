import { ERROR_CODES, fail, handle, notFound, ok } from '@/lib/mock/http'
import { store } from '@/lib/mock/store'
import type { AccountStatus } from '@/lib/types'

/**
 * POST /accounts/:id/login · /relogin · /reset-password — maintenance actions.
 *
 * Each returns the full updated account, so the client replaces its cache entry
 * wholesale rather than patching a field it guessed at (§6.2).
 *
 * `/reveal` is a sibling static segment and takes precedence over this dynamic one.
 */
const ACTIONS: Record<string, { status: AccountStatus; touch: boolean }> = {
  login: { status: 'active', touch: true },
  relogin: { status: 'active', touch: true },
  'reset-password': { status: 'needs_login', touch: true },
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string; action: string }> },
) {
  const { id, action } = await ctx.params

  return handle(request, () => {
    const spec = ACTIONS[action]
    if (!spec) {
      return fail(404, ERROR_CODES.NOT_FOUND, `There is no '${action}' action on an account.`)
    }

    const index = store.accounts.findIndex((a) => a.id === id)
    if (index === -1) return notFound('That account')

    const updated = {
      ...store.accounts[index]!,
      status: spec.status,
      ...(spec.touch ? { lastCheckedAt: new Date().toISOString() } : {}),
    }

    if (action === 'reset-password') {
      // A reset invalidates the stored secret; the club emails a new one.
      store.passwords.set(id, `Fetch-reset-${Date.now().toString(36)}`)
    }

    store.accounts[index] = updated
    return ok(updated)
  })
}
