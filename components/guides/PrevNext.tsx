import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'

import type { GuideEntry } from '@/content/guides/nav'

/**
 * The foot of every guide.
 *
 * Derived from nav.ts, so the order the sidebar teaches and the order these links walk
 * cannot disagree. A reader who works through the docs front to back never has to go
 * back up to the tree to find out what comes next — which is the whole point of having
 * ordered them by hand.
 */
export function PrevNext({
  previous,
  next,
}: {
  previous: GuideEntry | null
  next: GuideEntry | null
}) {
  if (!previous && !next) return null

  return (
    <nav
      aria-label="Guide navigation"
      className="mt-16 grid gap-3 border-t border-border pt-8 sm:grid-cols-2"
    >
      {previous ? (
        <Link
          href={`/guides/${previous.slug}`}
          className="group rounded-lg border border-border bg-surface p-4 transition-colors duration-150 hover:border-border-strong hover:bg-surface-hover"
        >
          <span className="flex items-center gap-1.5 font-mono text-label text-faint uppercase">
            <ArrowLeft className="size-3" aria-hidden="true" />
            previous
          </span>
          <span className="mt-1.5 block text-body font-semibold text-text">{previous.title}</span>
        </Link>
      ) : (
        <span />
      )}

      {next && (
        <Link
          href={`/guides/${next.slug}`}
          className="group rounded-lg border border-border bg-surface p-4 text-right transition-colors duration-150 hover:border-border-strong hover:bg-surface-hover sm:col-start-2"
        >
          <span className="flex items-center justify-end gap-1.5 font-mono text-label text-faint uppercase">
            next
            <ArrowRight className="size-3" aria-hidden="true" />
          </span>
          <span className="mt-1.5 block text-body font-semibold text-text">{next.title}</span>
        </Link>
      )}
    </nav>
  )
}
