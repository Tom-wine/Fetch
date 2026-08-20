import Link from 'next/link'

/**
 * Minimal on purpose. A public footer's job here is to say what the thing is, point at
 * the places worth going, and stop — there is no company to link to, no newsletter, and
 * inventing either would be the marketing voice these pages are meant to avoid.
 *
 * It also carries the sentence about what Fetch.io does NOT do. That used to sit in the
 * landing hero; it belongs under every public page, not just the first one, and a
 * visitor who scrolls the guides deserves to meet it as well.
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
          <a
            href="https://github.com/Tom-wine/Fetch"
            className="text-muted transition-colors hover:text-text"
            rel="noreferrer"
          >
            github
          </a>
          <Link href="/dashboard" className="text-muted transition-colors hover:text-text">
            open_app
          </Link>
        </nav>
      </div>

      <div className="mx-auto w-full max-w-[1240px] px-4 pb-8 sm:px-6">
        <p className="max-w-[86ch] font-mono text-caption text-faint">
          {
            '// fetch.io does not queue-jump, guess passwords or bypass a club’s checks — it signs in with credentials you already have and submits the same form you would, in order, at the rate you choose.'
          }
        </p>
      </div>
    </footer>
  )
}
