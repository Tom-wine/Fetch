/** Where an account actually buys — the club's own site, or a platform in front of it. */

export type ProviderId =
  'club-direct' | 'ticketmaster-uk' | 'eventim-uk' | 'seatgeek' | 'stubhub-exchange'

export interface ProviderInfo {
  id: ProviderId
  /** Rendered verbatim. */
  name: string
  mark: string
  color: string
}

export const PROVIDERS: ProviderInfo[] = [
  { id: 'club-direct', name: 'Club Direct', mark: 'CD', color: '#1A8CF0' },
  { id: 'ticketmaster-uk', name: 'Ticketmaster UK', mark: 'TM', color: '#0057C8' },
  { id: 'eventim-uk', name: 'Eventim UK', mark: 'EV', color: '#22D18A' },
  { id: 'seatgeek', name: 'SeatGeek', mark: 'SG', color: '#F5A524' },
  { id: 'stubhub-exchange', name: 'StubHub Exchange', mark: 'SX', color: '#E8542F' },
]

const BY_ID = new Map(PROVIDERS.map((p) => [p.id, p]))

export function getProvider(id: ProviderId): ProviderInfo {
  const found = BY_ID.get(id)
  if (!found) throw new Error(`Unknown provider: ${id}`)
  return found
}

/** Competitions a fixture can belong to (§5). */
export type Competition = 'premier-league' | 'fa-cup' | 'efl-cup' | 'ucl' | 'uel' | 'friendly'

export const COMPETITION_LABEL: Record<Competition, string> = {
  'premier-league': 'Premier League',
  'fa-cup': 'FA Cup',
  'efl-cup': 'EFL Cup',
  ucl: 'Champions League',
  uel: 'Europa League',
  friendly: 'Friendly',
}
