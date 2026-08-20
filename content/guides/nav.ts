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
      {
        slug: 'getting-started/quick-start',
        title: 'Quick start',
        summary: 'Ten accounts into a ballot in five minutes, end to end.',
      },
      {
        slug: 'getting-started/the-ballot-loop',
        title: 'The ballot loop',
        summary: 'Four stages — pool, profile, run, read — and why they are separate.',
      },
    ],
  },
  {
    label: 'accounts',
    title: 'Accounts',
    entries: [
      {
        slug: 'accounts/loading-accounts',
        title: 'Loading accounts',
        summary: 'Pasting credentials, the CSV wizard, and what happens to duplicates.',
      },
      {
        slug: 'accounts/account-status',
        title: 'Account status',
        summary: 'active, needs_login, needs_otp, locked, expired, error — and the fix for each.',
      },
      {
        slug: 'accounts/ready-to-run',
        title: 'Ready to run',
        summary: 'Why an account can be ACTIVE and still not be READY.',
      },
      {
        slug: 'accounts/proxies-and-email',
        title: 'Proxies and email',
        summary: 'Proxy groups, testing them, IMAP mailboxes, and when a code is needed.',
      },
    ],
  },
  {
    label: 'ballots',
    title: 'Ballots',
    entries: [
      {
        slug: 'ballots/profiles',
        title: 'Profiles',
        summary: 'Every setting: what it does, a sane value, and what breaks if it is too high.',
      },
      {
        slug: 'ballots/starting-a-run',
        title: 'Starting a run',
        summary: 'Scope, the estimate, and what stops a run before it begins.',
      },
      {
        slug: 'ballots/reading-the-monitor',
        title: 'Reading the monitor',
        summary: 'The stats band, the bar, the task table and the three log tabs.',
      },
      {
        slug: 'ballots/failure-codes',
        title: 'Failure codes',
        summary: 'Every code the engine can emit, what it means, and what to change.',
      },
      {
        slug: 'ballots/retrying',
        title: 'Retrying a run',
        summary: 'What RETRY_FAILED carries over, and when retrying is the wrong move.',
      },
    ],
  },
  {
    label: 'reference',
    title: 'Reference',
    entries: [
      {
        slug: 'reference/csv-template',
        title: 'CSV template',
        summary: 'The fifteen columns, which are required, and a file to start from.',
      },
      {
        slug: 'reference/keyboard',
        title: 'Keyboard',
        summary: 'The palette, and moving through a table without a mouse.',
      },
      {
        slug: 'reference/glossary',
        title: 'Glossary',
        summary: 'run, task, entry, profile, pool, ballot, ready, seq.',
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
