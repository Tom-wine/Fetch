import { CLUBS, getClub, type Club } from '@/lib/registries/clubs'
import type { ClubId } from '@/lib/types'
import { AUTO_FIX_THRESHOLD, bestMatch, normalise, similarity } from './fuzzy'

/**
 * Turning whatever the operator's spreadsheet calls a club into a `ClubId`.
 *
 * §8.3 makes an unrecognised club an ERROR with a one-click fix, not a silent
 * correction — so "Man Utd" does not quietly become Manchester United on import.
 * It is offered, with the club's crest next to it, and the operator accepts it.
 * The only bulk shortcut is "Fix all clubs automatically", which applies exactly the
 * matches this file scores at or above `AUTO_FIX_THRESHOLD`.
 *
 * CANONICAL means the id (`man-utd`) or the full name (`Manchester United`) — the two
 * forms the template and the exporter write, so a file that came out of Fetch.io goes
 * back in without a single fix.
 */

/**
 * Nicknames and match-day shorthand, on top of each club's `short` name.
 *
 * Deliberately missing: bare `united`, `city` and `town`. Four of the twenty answer
 * to one of those, so accepting them would let the bulk auto-fix assign an account
 * to the wrong club — the one failure this whole step exists to prevent.
 */
const NICKNAMES: Partial<Record<ClubId, string[]>> = {
  arsenal: ['gunners', 'afc', 'arsenal fc'],
  'aston-villa': ['avfc', 'villans'],
  bournemouth: ['cherries', 'afcb', 'bournemouth fc'],
  brentford: ['bees', 'bfc'],
  brighton: ['seagulls', 'bhafc', 'brighton and hove albion', 'brighton hove albion'],
  chelsea: ['blues', 'cfc', 'chelsea fc'],
  'crystal-palace': ['eagles', 'cpfc'],
  everton: ['toffees', 'efc'],
  fulham: ['cottagers', 'ffc'],
  ipswich: ['tractor boys', 'itfc', 'ipswich town fc'],
  leicester: ['foxes', 'lcfc', 'leicester city fc'],
  liverpool: ['reds', 'lfc', 'liverpool fc'],
  'man-city': ['mcfc', 'man city', 'manchester city fc', 'citizens'],
  'man-utd': ['mufc', 'man utd', 'man u', 'man united', 'red devils', 'manchester utd'],
  newcastle: ['magpies', 'nufc', 'toon', 'newcastle utd'],
  'nottingham-forest': ['nffc', 'nottm forest', 'notts forest', 'forest'],
  southampton: ['saints', 'sfc', 'southampton fc'],
  tottenham: ['thfc', 'spurs', 'tottenham hotspur fc'],
  'west-ham': ['hammers', 'whufc', 'irons', 'west ham utd'],
  wolves: ['wwfc', 'wolverhampton', 'wolverhampton wanderers fc'],
}

/** Every string a club answers to, normalised once at module load. */
interface ClubIndex {
  club: Club
  /** `man-utd` and `manchesterunited` — accepting either without a prompt. */
  canonical: Set<string>
  /** Everything else the club answers to, used only to build a SUGGESTION. */
  aliases: string[]
}

const INDEX: ClubIndex[] = CLUBS.map((club) => ({
  club,
  canonical: new Set([normalise(club.id), normalise(club.name)]),
  aliases: [club.short, club.city, ...(NICKNAMES[club.id] ?? [])],
}))

export type ClubMatch =
  /** The cell already holds a club id or a full club name. Nothing to fix. */
  | { status: 'exact'; club: Club }
  /** Recognisable, but not canonical: offer it as a one-click fix. */
  | { status: 'suggestion'; club: Club; score: number }
  /** Nothing close enough to name. The operator has to pick. */
  | { status: 'none' }

/** Empty input is not a match failure — the "club is missing" rule owns that. */
export function resolveClub(value: string): ClubMatch {
  const input = normalise(value)
  if (!input) return { status: 'none' }

  for (const entry of INDEX) {
    if (entry.canonical.has(input)) return { status: 'exact', club: entry.club }
  }

  const best = bestMatch(INDEX, (entry) => {
    // An exact alias hit scores 1: "Spurs" is not ambiguous, it is just not canonical.
    let score = 0
    for (const alias of entry.aliases) {
      score = Math.max(score, normalise(alias) === input ? 1 : similarity(input, alias))
      if (score === 1) break
    }
    for (const canonical of entry.canonical) {
      score = Math.max(score, similarity(input, canonical))
    }
    return score
  })

  // Below 0.6 the "did you mean" would be a guess, and a wrong guess next to a crest
  // is more convincing than no guess at all.
  if (!best || best.score < 0.6) return { status: 'none' }
  return { status: 'suggestion', club: best.value.club, score: best.score }
}

/** The value written into the cell when a suggestion is accepted. */
export function canonicalClubValue(club: Club): string {
  return club.name
}

export function clubIdOf(value: string): ClubId | null {
  const match = resolveClub(value)
  return match.status === 'exact' ? match.club.id : null
}

/** What "Fix all clubs automatically" is allowed to touch, unattended. */
export function isAutoFixable(
  match: ClubMatch,
): match is { status: 'suggestion'; club: Club; score: number } {
  return match.status === 'suggestion' && match.score >= AUTO_FIX_THRESHOLD
}

export { getClub }
