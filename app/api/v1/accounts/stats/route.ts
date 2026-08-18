import { handle, ok } from '@/lib/mock/http'
import { store } from '@/lib/mock/store'
import type { AccountStatus, ClubId } from '@/lib/types'

/** GET /accounts/stats — counts by status and by club, for the header strip (§8.2). */
export async function GET(request: Request) {
  return handle(request, () => {
    const byStatus: Partial<Record<AccountStatus, number>> = {}
    const byClub: Partial<Record<ClubId, number>> = {}

    for (const a of store.accounts) {
      byStatus[a.status] = (byStatus[a.status] ?? 0) + 1
      byClub[a.club] = (byClub[a.club] ?? 0) + 1
    }

    return ok({ total: store.accounts.length, byStatus, byClub })
  })
}
