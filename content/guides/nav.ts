/**
 * The guide tree, written by hand.
 *
 * Explicit order beats filesystem magic. A directory listing sorts alphabetically, which
 * would put `account-status` before `loading-accounts` and teach the loop backwards —
 * and the order IS the teaching here: pool, then profiles, then runs, then what to do
 * when one fails. Reordering the docs is editing one file.
 *
 * Every slug must have a matching `content/guides/<slug>.mdx`, and the index builder
 * exits non-zero if one is missing — an entry with no file is a build error rather than
 * a link that 404s on a public page. Which is also why entries arrive here in the same
 * commit as the page they point at, never before it.
 */

export interface GuideEntry {
  /** Path under /guides, without a leading slash. */
  slug: string
  title: string
  /** One line, shown in the ⌘K palette and on the section index. */
  summary: string
}

export interface GuideSection {
  /** Rendered as a `// section_label` in the sidebar. */
  label: string
  title: string
  entries: GuideEntry[]
}

export const GUIDE_NAV: GuideSection[] = [
  {
    label: 'getting_started',
    title: 'Getting started',
    entries: [
      {
        slug: 'getting-started/what-is-fetch',
        title: 'What Fetch.io is',
        summary: 'What the tool does, and what it deliberately does not do.',
      },
    ],
  },
]

/** Flat, in reading order — what prev/next and the search index walk. */
export const GUIDE_ORDER: GuideEntry[] = GUIDE_NAV.flatMap((section) => section.entries)

export function findGuide(slug: string): GuideEntry | undefined {
  return GUIDE_ORDER.find((entry) => entry.slug === slug)
}

export function sectionOf(slug: string): GuideSection | undefined {
  return GUIDE_NAV.find((section) => section.entries.some((entry) => entry.slug === slug))
}

/** The page before and after this one, for the foot of every guide. */
export function neighbours(slug: string): {
  previous: GuideEntry | null
  next: GuideEntry | null
} {
  const index = GUIDE_ORDER.findIndex((entry) => entry.slug === slug)
  if (index === -1) return { previous: null, next: null }
  return {
    previous: GUIDE_ORDER[index - 1] ?? null,
    next: GUIDE_ORDER[index + 1] ?? null,
  }
}
