import type { Currency, Ticket } from '@/lib/types'

/**
 * A LOT is what the right-hand panel shows one card per: the seats that were bought
 * together and sit together — same block, same row, same order.
 *
 * The order id is part of the key on purpose. The card prints ONE order id, so two
 * seats that happen to share a block and a row but came from different orders are not
 * one lot; folding them together would print an order id that only half the seats
 * belong to.
 */
export interface Lot {
  key: string
  block: string
  levelName: string
  row: string
  orderId: string
  currency: Currency
  tickets: Ticket[]
  /** Minor units, summed across the lot. */
  price: number
  faceValue: number
}

export function toLots(tickets: Ticket[]): Lot[] {
  const byKey = new Map<string, Lot>()

  for (const ticket of tickets) {
    const key = `${ticket.block}|${ticket.row}|${ticket.orderId}`
    const lot = byKey.get(key)
    if (lot) {
      lot.tickets.push(ticket)
      lot.price += ticket.price
      lot.faceValue += ticket.faceValue
      continue
    }
    byKey.set(key, {
      key,
      block: ticket.block,
      levelName: ticket.levelName,
      row: ticket.row,
      orderId: ticket.orderId,
      currency: ticket.currency,
      tickets: [ticket],
      price: ticket.price,
      faceValue: ticket.faceValue,
    })
  }

  return [...byKey.values()].sort(
    (a, b) => a.block.localeCompare(b.block, 'en') || compareSeat(a.row, b.row),
  )
}

/**
 * `Seats 43-46 (4)` when the seats run together, `Seats 12, 18-20, 44 (5)` when they
 * do not. Writing a range across a gap would claim seats the operator does not hold,
 * which on a four-seat lot is the difference between a sale and a chargeback.
 */
export function seatRange(tickets: Ticket[]): string {
  const seats = tickets.map((t) => t.seat)
  const numeric = seats.every((s) => Number.isFinite(Number(s)))
  const label = seats.length === 1 ? 'Seat' : 'Seats'

  if (!numeric) {
    // Non-numeric seat labels (`A12`, `Box 4`) cannot be collapsed into a range, so
    // they are listed as they are.
    return `${label} ${[...seats].sort((a, b) => a.localeCompare(b, 'en')).join(', ')} (${seats.length})`
  }

  const sorted = [...new Set(seats.map(Number))].sort((a, b) => a - b)
  const parts: string[] = []
  let start = sorted[0]!
  let previous = start

  for (const seat of sorted.slice(1)) {
    if (seat === previous + 1) {
      previous = seat
      continue
    }
    parts.push(run(start, previous))
    start = seat
    previous = seat
  }
  parts.push(run(start, previous))

  return `${label} ${parts.join(', ')} (${seats.length})`
}

function run(start: number, end: number): string {
  if (start === end) return String(start)
  // An en dash, not a hyphen: this is a range, and it sits in mono beside seat numbers.
  return `${start}–${end}`
}

export function compareSeat(a: string, b: string): number {
  const na = Number(a)
  const nb = Number(b)
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb
  return a.localeCompare(b, 'en')
}

/* ----------------------------------------------------------- the money */

/**
 * What a selection is worth. `price` is what the seats are being asked for, `face` is
 * what they cost — the gap between them is the only number on the screen that says
 * whether the operator is up or down on this fixture.
 *
 * Grouped by currency rather than summed across it: every seat on a fixture shares
 * the fixture's currency today, but adding EUR to GBP because they usually match is
 * exactly the bug that survives until the day they do not.
 */
export interface MoneyTotal {
  currency: Currency
  price: number
  faceValue: number
  count: number
}

export function totalsByCurrency(tickets: Ticket[]): MoneyTotal[] {
  const byCurrency = new Map<Currency, MoneyTotal>()

  for (const ticket of tickets) {
    const found = byCurrency.get(ticket.currency)
    if (found) {
      found.price += ticket.price
      found.faceValue += ticket.faceValue
      found.count += 1
      continue
    }
    byCurrency.set(ticket.currency, {
      currency: ticket.currency,
      price: ticket.price,
      faceValue: ticket.faceValue,
      count: 1,
    })
  }

  return [...byCurrency.values()]
}

/** How many distinct groups the selection spans. Ungrouped seats count as none. */
export function groupCount(tickets: Ticket[]): number {
  return new Set(tickets.map((t) => t.groupId).filter(Boolean)).size
}

/** The window the selection was bought in, as two ISO strings (equal when it is one day). */
export function purchaseWindow(tickets: Ticket[]): { first: string; last: string } | null {
  if (tickets.length === 0) return null
  const sorted = [...tickets].sort((a, b) => Date.parse(a.purchasedAt) - Date.parse(b.purchasedAt))
  return { first: sorted[0]!.purchasedAt, last: sorted[sorted.length - 1]!.purchasedAt }
}
