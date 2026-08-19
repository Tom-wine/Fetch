import { handle, ok } from '@/lib/mock/http'
import { store } from '@/lib/mock/store'
import { revenueTotals } from '@/lib/mock/seed'

/**
 * GET /kpis — the three dashboard tiles plus the account-health strip (§8.1).
 *
 * Every money figure comes from the revenue series (see the note above `revenue` in
 * seed.ts). The ticket store is current inventory, not a ledger, so summing its sold
 * rows here would put an all-time total and a single month on the same row of tiles
 * with no relationship between them.
 *
 * The account and value-at-risk figures still come from the store, because those ARE
 * questions about what is held right now.
 */
export async function GET(request: Request) {
  return handle(request, () => {
    const healthy = store.accounts.filter((a) => a.status === 'active').length
    const needAction = store.accounts.length - healthy
    const valueAtRisk = store.fixtures.reduce((sum, f) => sum + f.valueAtRisk, 0)

    return ok({
      totalRevenue: revenueTotals.revenue,
      ticketsSold: revenueTotals.ticketsSold,
      monthRevenue: revenueTotals.currentMonth?.revenue ?? 0,
      currency: 'GBP',
      accountsTotal: store.accounts.length,
      accountsHealthy: healthy,
      accountsNeedAction: needAction,
      valueAtRisk,
    })
  })
}
