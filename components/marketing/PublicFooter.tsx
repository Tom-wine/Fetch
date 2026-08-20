import Link from 'next/link'

/**
 * Minimal on purpose. A public footer's job here is to say what the thing is, point at
 * the two places worth going, and stop — there is no company to link to, no newsletter,
 * and inventing either would be the marketing voice these pages are meant to avoid.
 */
export function PublicFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-3 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="font-mono text-caption text-faint">
          {'// fetch.io — ballot entries for Premier League club accounts'}
        </p>

        <nav aria-label="Footer" className="flex items-center gap-4 font-mono text-caption">
          <Link href="/guides" className="text-muted transition-colors hover:text-text">
            guides
          </Link>
          <Link
            href="/guides/getting-started/quick-start"
            className="text-muted transition-colors hover:text-text"
          >
            quick_start
          </Link>
          <Link href="/dashboard" className="text-muted transition-colors hover:text-text">
            open_app
          </Link>
        </nav>
      </div>
    </footer>
  )
}
