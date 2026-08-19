import { advance } from '@/lib/mock/ballot-engine'
import { store } from '@/lib/mock/store'

/**
 * GET /ballots/runs/:id/export — the results as CSV (§B4).
 *
 * Returns a file rather than the envelope: it is a download, not a resource read. No
 * password column, ever — this is a file that leaves the machine (§B7 rule 2).
 */
const COLUMNS = [
  'account_email',
  'club',
  'status',
  'attempt',
  'http_status',
  'entry_ref',
  'duration_ms',
  'message',
] as const

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  const state = store.ballotRuns.get(id)
  if (!state) {
    return new Response('Run not found', { status: 404 })
  }

  advance(state)

  const rows = state.tasks.map((t) =>
    [
      t.accountEmail,
      t.clubId,
      t.status,
      String(t.attempt),
      t.lastHttpStatus === undefined ? '' : String(t.lastHttpStatus),
      t.entryRef ?? '',
      t.durationMs === undefined ? '' : String(t.durationMs),
      t.lastMessage ?? '',
    ].map(csvCell),
  )

  const body = [COLUMNS.join(','), ...rows.map((r) => r.join(','))].join('\r\n')

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${id}-results.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}

/** A cell containing a comma, quote or newline is quoted; inner quotes are doubled. */
function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}
