import { handle, ok } from '@/lib/mock/http'
import { store } from '@/lib/mock/store'
import { revenue } from '@/lib/mock/seed'

/** GET /kpis — the three dashboard tiles plus the account-health strip (§8.1). */
export async function GET(request: Request) {
  return handle(request, () => {
    const sold = store.tickets.filter((t) => t.status === 'sold')
    const totalRevenue = sold.reduce((sum, t) => sum + t.price, 0)
    const monthRevenue = revenue.at(-1)?.revenue ?? 0

    const healthy = store.accounts.filter((a) => a.status === 'active').length
    const needAction = store.accounts.length - healthy
    const valueAtRisk = store.fixtures.reduce((sum, f) => sum + f.valueAtRisk, 0)

    return ok({
      totalRevenue,
      ticketsSold: sold.length,
      monthRevenue,
      currency: 'GBP',
      accountsTotal: store.accounts.length,
      accountsHealthy: healthy,
      accountsNeedAction: needAction,
      valueAtRisk,
    })
  })
}
