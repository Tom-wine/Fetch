/**
 * Generates neutral placeholder crests into public/crests/.
 *
 * Real club crests are trademarked (§13), so Fetch.io ships initials on the club's
 * primary colour instead. The registry in lib/registries/clubs.ts is the only place
 * that names the file, so swapping in licensed artwork later is a one-file change.
 *
 *   node scripts/generate-crests.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'public', 'crests')
mkdirSync(out, { recursive: true })

// Kept in step with lib/registries/clubs.ts by the assertion at the end.
const CLUBS = [
  ['arsenal', 'Arsenal', '#EF0107'],
  ['aston-villa', 'Villa', '#670E36'],
  ['bournemouth', 'Bournemouth', '#DA291C'],
  ['brentford', 'Brentford', '#E30613'],
  ['brighton', 'Brighton', '#0057B8'],
  ['chelsea', 'Chelsea', '#034694'],
  ['crystal-palace', 'Palace', '#1B458F'],
  ['everton', 'Everton', '#003399'],
  ['fulham', 'Fulham', '#1B1B1B'],
  ['ipswich', 'Ipswich', '#3A64A3'],
  ['leicester', 'Leicester', '#003090'],
  ['liverpool', 'Liverpool', '#C8102E'],
  ['man-city', 'Man City', '#6CABDD'],
  ['man-utd', 'Man Utd', '#DA291C'],
  ['newcastle', 'Newcastle', '#241F20'],
  ['nottingham-forest', 'Forest', '#DD0000'],
  ['southampton', 'Southampton', '#D71920'],
  ['tottenham', 'Spurs', '#132257'],
  ['west-ham', 'West Ham', '#7A263A'],
  ['wolves', 'Wolves', '#FDB913'],
]

function initials(short) {
  const words = short.split(/\s+/)
  if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase()
  return short.slice(0, 2).toUpperCase()
}

/** Relative luminance, so the initials stay readable on a light kit colour. */
function inkFor(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  return L > 0.45 ? '#0B1220' : '#FFFFFF'
}

for (const [id, short, color] of CLUBS) {
  const mark = initials(short)
  const ink = inkFor(color)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" role="img" aria-label="${short} placeholder crest">
  <title>${short}</title>
  <path d="M24 2 42 8v18c0 10-8 17.5-18 20C14 43.5 6 36 6 26V8Z" fill="${color}"/>
  <path d="M24 2 42 8v18c0 10-8 17.5-18 20C14 43.5 6 36 6 26V8Z" fill="none" stroke="${ink}" stroke-opacity=".25" stroke-width="1.5"/>
  <text x="24" y="30" text-anchor="middle" fill="${ink}"
        font-family="ui-monospace, 'JetBrains Mono', 'SF Mono', monospace"
        font-size="16" font-weight="700" letter-spacing="0.5">${mark}</text>
</svg>
`
  writeFileSync(join(out, `${id}.svg`), svg)
}

console.log(`wrote ${CLUBS.length} placeholder crests to public/crests/`)
