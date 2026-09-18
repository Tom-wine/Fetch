import type { ClubId, SeatmapSection, StandSide } from '@/lib/types'

/**
 * The principal stands of each of the 20 Premier League grounds, by side.
 *
 * This is the data behind the seat-map schematic: it is what makes Anfield read as
 * Anfield and Old Trafford as Old Trafford, since the stand NAMES are real and
 * specific even though the schematic's geometry is not to scale. A real backend can
 * ignore this entirely and return a provider SVG behind the same endpoint.
 *
 * `aliases` are the lower-case fragments a ticket's `block` string may contain that
 * place a seat in that stand. Each stand also matches its own compass word as a
 * fallback, so a block like "North Upper 12" still lands on the north stand.
 */
interface StandDef {
  name: string
  side: StandSide
  aliases: string[]
}

const STANDS: Record<ClubId, StandDef[]> = {
  arsenal: [
    { name: 'North Bank', side: 'N', aliases: ['north bank', 'north'] },
    { name: 'Clock End', side: 'S', aliases: ['clock end', 'clock', 'south'] },
    { name: 'East Stand', side: 'E', aliases: ['east'] },
    { name: 'West Stand', side: 'W', aliases: ['west'] },
  ],
  'aston-villa': [
    { name: 'North Stand', side: 'N', aliases: ['north'] },
    { name: 'Holte End', side: 'S', aliases: ['holte', 'south'] },
    { name: 'Doug Ellis Stand', side: 'E', aliases: ['doug ellis', 'ellis', 'east'] },
    { name: 'Trinity Road Stand', side: 'W', aliases: ['trinity', 'west'] },
  ],
  bournemouth: [
    { name: 'Ted MacDougall Stand', side: 'N', aliases: ['macdougall', 'ted', 'north'] },
    { name: 'South Stand', side: 'S', aliases: ['south'] },
    { name: 'East Stand', side: 'E', aliases: ['east'] },
    { name: 'Main Stand', side: 'W', aliases: ['main', 'west'] },
  ],
  brentford: [
    { name: 'Brook Road Stand', side: 'N', aliases: ['brook', 'north'] },
    { name: 'Bees Community Stand', side: 'S', aliases: ['bees', 'community', 'south'] },
    { name: 'East Stand', side: 'E', aliases: ['east'] },
    { name: 'Gtech West Stand', side: 'W', aliases: ['gtech', 'west'] },
  ],
  brighton: [
    { name: 'North Stand', side: 'N', aliases: ['north'] },
    { name: 'South Stand', side: 'S', aliases: ['south'] },
    { name: 'East Stand', side: 'E', aliases: ['east'] },
    { name: 'West Stand', side: 'W', aliases: ['west'] },
  ],
  chelsea: [
    { name: 'Matthew Harding Stand', side: 'N', aliases: ['matthew harding', 'harding', 'north'] },
    { name: 'The Shed End', side: 'S', aliases: ['shed', 'south'] },
    { name: 'East Stand', side: 'E', aliases: ['east'] },
    { name: 'West Stand', side: 'W', aliases: ['west'] },
  ],
  'crystal-palace': [
    { name: 'Whitehorse Lane', side: 'N', aliases: ['whitehorse', 'north'] },
    { name: 'Holmesdale Road Stand', side: 'S', aliases: ['holmesdale', 'south'] },
    { name: 'Arthur Wait Stand', side: 'E', aliases: ['arthur wait', 'wait', 'east'] },
    { name: 'Main Stand', side: 'W', aliases: ['main', 'west'] },
  ],
  everton: [
    { name: 'North Stand', side: 'N', aliases: ['north'] },
    { name: 'South Stand', side: 'S', aliases: ['south'] },
    { name: 'East Stand', side: 'E', aliases: ['east'] },
    { name: 'West Stand', side: 'W', aliases: ['west'] },
  ],
  fulham: [
    { name: 'Hammersmith End', side: 'N', aliases: ['hammersmith', 'north'] },
    { name: 'Putney End', side: 'S', aliases: ['putney', 'south'] },
    { name: 'Johnny Haynes Stand', side: 'E', aliases: ['johnny haynes', 'haynes', 'east'] },
    { name: 'Riverside Stand', side: 'W', aliases: ['riverside', 'west'] },
  ],
  ipswich: [
    { name: 'Sir Bobby Robson Stand', side: 'N', aliases: ['bobby robson', 'robson', 'north'] },
    { name: 'Sir Alf Ramsey Stand', side: 'S', aliases: ['alf ramsey', 'ramsey', 'south'] },
    { name: 'Cobbold Stand', side: 'E', aliases: ['cobbold', 'east'] },
    { name: 'Magnus West Stand', side: 'W', aliases: ['magnus', 'west'] },
  ],
  leeds: [
    { name: 'Don Revie Stand', side: 'N', aliases: ['revie', 'north'] },
    { name: 'John Charles Stand', side: 'S', aliases: ['john charles', 'charles', 'south'] },
    { name: 'East Stand', side: 'E', aliases: ['east'] },
    { name: 'West Stand', side: 'W', aliases: ['west'] },
  ],
  leicester: [
    { name: 'North Stand', side: 'N', aliases: ['north'] },
    { name: 'Kop Stand', side: 'S', aliases: ['kop', 'south'] },
    { name: 'East Stand', side: 'E', aliases: ['east'] },
    { name: 'West Stand', side: 'W', aliases: ['west'] },
  ],
  liverpool: [
    { name: 'Anfield Road End', side: 'N', aliases: ['anfield road', 'anfield', 'north'] },
    { name: 'The Kop', side: 'S', aliases: ['kop', 'spion', 'south'] },
    { name: 'Sir Kenny Dalglish Stand', side: 'E', aliases: ['dalglish', 'kenny', 'centenary', 'east'] },
    { name: 'Main Stand', side: 'W', aliases: ['main', 'west'] },
  ],
  'man-city': [
    { name: 'North Stand', side: 'N', aliases: ['north'] },
    { name: 'South Stand', side: 'S', aliases: ['south'] },
    { name: 'East Stand', side: 'E', aliases: ['east'] },
    { name: 'Colin Bell Stand', side: 'W', aliases: ['colin bell', 'bell', 'west'] },
  ],
  'man-utd': [
    { name: 'Sir Alex Ferguson Stand', side: 'N', aliases: ['ferguson', 'north'] },
    { name: 'Sir Bobby Charlton Stand', side: 'S', aliases: ['charlton', 'south'] },
    { name: 'East Stand', side: 'E', aliases: ['east'] },
    { name: 'Stretford End', side: 'W', aliases: ['stretford', 'west'] },
  ],
  newcastle: [
    { name: 'Sir John Hall Stand', side: 'N', aliases: ['john hall', 'leazes', 'north'] },
    { name: 'Gallowgate End', side: 'S', aliases: ['gallowgate', 'south'] },
    { name: 'East Stand', side: 'E', aliases: ['east'] },
    { name: 'Milburn Stand', side: 'W', aliases: ['milburn', 'west'] },
  ],
  'nottingham-forest': [
    { name: 'Brian Clough Stand', side: 'N', aliases: ['clough', 'north'] },
    { name: 'Trent End', side: 'S', aliases: ['trent', 'south'] },
    { name: 'Peter Taylor Stand', side: 'E', aliases: ['peter taylor', 'taylor', 'east'] },
    { name: 'Bridgford Stand', side: 'W', aliases: ['bridgford', 'west'] },
  ],
  southampton: [
    { name: 'Northam Stand', side: 'N', aliases: ['northam', 'north'] },
    { name: 'Chapel Stand', side: 'S', aliases: ['chapel', 'south'] },
    { name: 'Itchen Stand', side: 'E', aliases: ['itchen', 'east'] },
    { name: 'Kingsland Stand', side: 'W', aliases: ['kingsland', 'west'] },
  ],
  tottenham: [
    { name: 'North Stand', side: 'N', aliases: ['north'] },
    { name: 'South Stand', side: 'S', aliases: ['south'] },
    { name: 'East Stand', side: 'E', aliases: ['east'] },
    { name: 'West Stand', side: 'W', aliases: ['west'] },
  ],
  'west-ham': [
    { name: 'Sir Trevor Brooking Stand', side: 'N', aliases: ['brooking', 'trevor', 'north'] },
    { name: 'Bobby Moore Stand', side: 'S', aliases: ['bobby moore', 'moore', 'south'] },
    { name: 'East Stand', side: 'E', aliases: ['east'] },
    { name: 'West Stand', side: 'W', aliases: ['west'] },
  ],
  wolves: [
    { name: 'Stan Cullis Stand', side: 'N', aliases: ['cullis', 'north'] },
    { name: 'Steve Bull Stand', side: 'S', aliases: ['steve bull', 'bull', 'south bank', 'south'] },
    { name: 'Sir Jack Hayward Stand', side: 'E', aliases: ['hayward', 'jack', 'east'] },
    { name: 'Billy Wright Stand', side: 'W', aliases: ['billy wright', 'wright', 'west'] },
  ],
}

/** A safe generic bowl for any club not in the table above. */
const GENERIC: StandDef[] = [
  { name: 'North Stand', side: 'N', aliases: ['north'] },
  { name: 'South Stand', side: 'S', aliases: ['south'] },
  { name: 'East Stand', side: 'E', aliases: ['east'] },
  { name: 'West Stand', side: 'W', aliases: ['west'] },
]

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/** The four sections of a club's ground, as the seatmap endpoint returns them. */
export function sectionsFor(club: ClubId): SeatmapSection[] {
  const defs = STANDS[club] ?? GENERIC
  return defs.map((d) => ({ id: slug(d.name), name: d.name, side: d.side, aliases: d.aliases }))
}

/**
 * Which section a ticket's `block` belongs to, by matching its text against each
 * section's aliases. Longer aliases win over the bare compass word, so "Anfield Road"
 * beats a stray "north". Returns null when nothing matches — the caller lists those
 * blocks separately rather than dropping them.
 */
export function sectionForBlock(block: string, sections: SeatmapSection[]): SeatmapSection | null {
  const hay = block.toLowerCase()
  let best: { section: SeatmapSection; score: number } | null = null
  for (const section of sections) {
    for (const alias of section.aliases) {
      if (hay.includes(alias) && (!best || alias.length > best.score)) {
        best = { section, score: alias.length }
      }
    }
  }
  return best?.section ?? null
}
