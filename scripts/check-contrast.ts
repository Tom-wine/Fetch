/**
 * WCAG contrast gate for the design tokens (§11 acceptance criterion 1).
 *
 * Reads the token blocks straight out of app/globals.css rather than a duplicated
 * table, so the thing that ships is the thing that is measured. Every pair the app
 * actually renders text in is listed in PAIRS below; a token that is never used as
 * text is not checked, because a colour nobody reads has no contrast requirement.
 *
 *   node --experimental-strip-types scripts/check-contrast.ts
 *
 * Exits non-zero if any text pair falls below its threshold, which is what makes
 * `npm run check` fail rather than a reviewer squinting at a screenshot.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/* ------------------------------------------------------------------ parsing */

type Tokens = Record<string, string>

/**
 * Pulls one `{ … }` block by its selector and returns the raw `--name: value`
 * declarations. Brace-counting rather than a regex for the body: the blocks contain
 * comments with braces in them, and a lazy `[^}]*` stops at the first one.
 */
function readBlock(css: string, selector: string): Tokens {
  const start = css.indexOf(selector)
  if (start === -1) throw new Error(`globals.css has no ${selector} block`)

  const open = css.indexOf('{', start)
  let depth = 0
  let end = open
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++
    else if (css[i] === '}') {
      depth--
      if (depth === 0) {
        end = i
        break
      }
    }
  }

  const body = css.slice(open + 1, end).replace(/\/\*[\s\S]*?\*\//g, '')
  const tokens: Tokens = {}
  for (const line of body.split(';')) {
    const match = /^\s*(--[\w-]+)\s*:\s*(.+?)\s*$/.exec(line)
    if (match) tokens[match[1]!] = match[2]!
  }
  return tokens
}

/** `var(--primary)` chains resolve against the theme first, then the light base. */
function resolve(name: string, theme: Tokens, base: Tokens, seen = new Set<string>()): string {
  if (seen.has(name)) throw new Error(`Cyclic token: ${name}`)
  seen.add(name)

  const raw = theme[name] ?? base[name]
  if (raw === undefined) throw new Error(`Unknown token: ${name}`)

  const ref = /^var\(\s*(--[\w-]+)\s*\)$/.exec(raw)
  return ref ? resolve(ref[1]!, theme, base, seen) : raw
}

/* -------------------------------------------------------------------- colour */

interface Rgb {
  r: number
  g: number
  b: number
}

function parseHex(hex: string): Rgb {
  const h = hex.trim().replace('#', '')
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error(`Not a hex colour: ${hex}`)
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

/** Tailwind's `bg-success/15` is the hue at 15% over whatever is behind it. */
function composite(fg: Rgb, alpha: number, bg: Rgb): Rgb {
  return {
    r: fg.r * alpha + bg.r * (1 - alpha),
    g: fg.g * alpha + bg.g * (1 - alpha),
    b: fg.b * alpha + bg.b * (1 - alpha),
  }
}

/** WCAG 2.1 relative luminance. */
function luminance({ r, g, b }: Rgb): number {
  const channel = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

/* --------------------------------------------------------------------- pairs */

/**
 * `large` means WCAG large text — ≥18.66px bold or ≥24px — and drops the threshold
 * to 3:1. Everything else is body-sized and must clear 4.5:1. The app's small type
 * (chips, column headers, captions) is 11px, so it is emphatically NOT large, which
 * is the whole reason those pairs are listed.
 */
interface Pair {
  what: string
  fg: string
  /** The surface behind the text. */
  bg: string
  /** Present when the background is a tint over `bg` rather than a solid token. */
  tint?: { token: string; alpha: number }
  large?: boolean
}

const SURFACES = ['--bg', '--surface', '--surface-raised', '--surface-hover'] as const

const PAIRS: Pair[] = [
  // Body copy, on every surface it can land on.
  ...SURFACES.map((bg) => ({ what: `text on ${bg}`, fg: '--text', bg })),
  ...SURFACES.map((bg) => ({ what: `text-muted on ${bg}`, fg: '--text-muted', bg })),
  // text-faint is deliberately only used on raised surfaces (inputs, table headers,
  // popovers), never on the page canvas — checking it against --bg would fail a pair
  // the app never renders.
  { what: 'text-faint on --surface-raised', fg: '--text-faint', bg: '--surface-raised' },
  { what: 'text-faint on --surface-hover', fg: '--text-faint', bg: '--surface-hover' },
  { what: 'text-faint on --surface', fg: '--text-faint', bg: '--surface' },

  // Links and primary text.
  ...SURFACES.map((bg) => ({ what: `primary-ink on ${bg}`, fg: '--primary-ink', bg })),

  // Filled buttons.
  { what: 'white on --primary-solid', fg: '--primary-foreground', bg: '--primary-solid' },
  { what: 'white on --primary-press', fg: '--primary-foreground', bg: '--primary-press' },

  // Status ink used as standalone text (banners, inline errors, tick icons).
  ...(['success', 'warning', 'danger', 'violet'] as const).flatMap((hue) => [
    { what: `${hue}-ink on --surface`, fg: `--${hue}-ink`, bg: '--surface' },
    { what: `${hue}-ink on --surface-raised`, fg: `--${hue}-ink`, bg: '--surface-raised' },
  ]),

  // Chip text on its own tint. `Chip` renders bg-{hue}/15 (primary /12) over whatever
  // surface it sits on — table rows are --surface, popovers are --surface-raised.
  ...(['success', 'warning', 'danger', 'violet', 'neutral-chip'] as const).flatMap((hue) =>
    (['--surface', '--surface-raised'] as const).map((bg) => ({
      what: `${hue}-ink on ${hue}/15 over ${bg}`,
      fg: `--${hue}-ink`,
      bg,
      tint: { token: `--${hue}`, alpha: 0.15 },
    })),
  ),
  ...(['--surface', '--surface-raised'] as const).map((bg) => ({
    what: `primary-ink on primary/12 over ${bg}`,
    fg: '--primary-ink',
    bg,
    tint: { token: '--primary', alpha: 0.12 },
  })),

  // Display type — Space Grotesk 700 at 28px and the 32px KPI figure clear the
  // large-text bar. 28px bold is over the 18.66px/bold threshold with room to spare, so
  // the face change does not move this pair across it.
  { what: 'text on --bg (display 28px/700)', fg: '--text', bg: '--bg', large: true },
]

/* --------------------------------------------------------------------- report */

interface Row {
  theme: 'light' | 'dark'
  what: string
  ratio: number
  need: number
  ok: boolean
}

function evaluate(theme: 'light' | 'dark', tokens: Tokens, base: Tokens): Row[] {
  return PAIRS.map((pair) => {
    const surface = parseHex(resolve(pair.bg, tokens, base))
    const background = pair.tint
      ? composite(parseHex(resolve(pair.tint.token, tokens, base)), pair.tint.alpha, surface)
      : surface
    const foreground = parseHex(resolve(pair.fg, tokens, base))

    const ratio = contrast(foreground, background)
    const need = pair.large ? 3 : 4.5
    return { theme, what: pair.what, ratio, need, ok: ratio >= need }
  })
}

function main(): void {
  const css = readFileSync(join(root, 'app', 'globals.css'), 'utf8')
  const light = readBlock(css, ':root,\n.light')
  const dark = readBlock(css, '.dark {')

  const rows = [...evaluate('light', light, light), ...evaluate('dark', dark, light)]

  const width = Math.max(...rows.map((r) => r.what.length))
  let current = ''
  for (const row of rows) {
    if (row.theme !== current) {
      current = row.theme
      console.log(`\n  ${current.toUpperCase()}`)
      console.log(`  ${'-'.repeat(width + 22)}`)
    }
    const ratio = row.ratio.toFixed(2).padStart(6)
    console.log(
      `  ${row.ok ? 'PASS' : 'FAIL'}  ${row.what.padEnd(width)}  ${ratio}:1  (needs ${row.need}:1)`,
    )
  }

  const failures = rows.filter((r) => !r.ok)
  console.log()
  if (failures.length === 0) {
    console.log(`  ${rows.length} pairs checked across both themes, all pass.\n`)
    return
  }

  console.log(`  ${failures.length} of ${rows.length} pairs fail:\n`)
  for (const f of failures) {
    console.log(`    ${f.theme}  ${f.what}  ${f.ratio.toFixed(2)}:1 < ${f.need}:1`)
  }
  console.log()
  process.exit(1)
}

main()
