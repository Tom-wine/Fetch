import Link from 'next/link'

import { GuidesShell } from '@/components/guides/GuidesShell'
import { Display, Prose, SectionLabel } from '@/components/ui/typography'
import { GUIDE_NAV, GUIDE_ORDER } from '@/content/guides/nav'

export const metadata = {
  title: 'Guides — Fetch.io',
  description:
    'How to load accounts, choose a profile, start a ballot run, and work out what went wrong when one fails.',
}

/**
 * `/guides` — the index.
 *
 * Not a search box and a wall of cards. The sections are in the order they should be
 * read, each entry says what it covers in one line, and the first page of the first
 * section is called out, because most people arriving here have not used the product
 * yet and the honest answer to "where do I start" is a link rather than a menu.
 */
export default function GuidesIndexPage() {
  const first = GUIDE_ORDER[0]

  return (
    <GuidesShell>
      <Display as="h1" size="h1" verbatim className="text-text">
        Guides
      </Display>

      <Prose className="mt-4 text-prose text-muted">
        Operating instructions for Fetch.io: how to load club accounts, how to choose a pace, how to
        start a ballot run, and how to work out what to change when one comes back failed.
      </Prose>

      {first && (
        <Prose className="mt-4 text-prose text-muted">
          New here?{' '}
          <Link
            href={`/guides/${first.slug}`}
            className="font-medium text-primary-ink underline underline-offset-4 hover:text-text"
          >
            Start with {first.title}
          </Link>
          , then work down the list — the order is the loop.
        </Prose>
      )}

      <div className="mt-12 space-y-10">
        {GUIDE_NAV.map((section) => (
          <section key={section.label}>
            <SectionLabel>{section.label}</SectionLabel>
            <h2 className="mt-1.5 font-mono text-title font-semibold text-text uppercase">
              {section.title}
            </h2>

            <ul className="mt-4 space-y-2">
              {section.entries.map((entry) => (
                <li key={entry.slug}>
                  <Link
                    href={`/guides/${entry.slug}`}
                    className="block rounded-lg border border-border bg-surface p-4 transition-colors duration-150 hover:border-border-strong hover:bg-surface-hover"
                  >
                    <span className="block text-body font-semibold text-text">{entry.title}</span>
                    <Prose className="mt-1 text-caption text-muted">{entry.summary}</Prose>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </GuidesShell>
  )
}
