import { handle, ok } from '@/lib/mock/http'
import { revenue } from '@/lib/mock/seed'

/**
 * GET /revenue?groupBy=month — the dashboard chart series (§8.1).
 *
 * Returns raw buckets: a period key and integer minor units. The client formats and
 * labels them; the server never sends a display string (§6.2).
 */
export async function GET(request: Request) {
  return handle(request, (url) => {
    const groupBy = url.searchParams.get('groupBy') ?? 'month'
    if (groupBy !== 'month') {
      // Only month is seeded; a real backend would also answer week and day.
      return ok([])
    }
    return ok(revenue)
  })
}
