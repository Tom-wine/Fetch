import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Logo } from '@/components/shell/Logo'

/**
 * The public chrome, for everyone who has not logged in.
 *
 * Everything Fetch.io does lives behind the app shell, which means the landing page and
 * the guides had nowhere to be: a sidebar full of `//account_manager` and a topbar with
 * a notification bell make no sense to someone who has never seen a run. So the public
 * segment gets its own layout — a wordmark, one link, one button, and nothing else that
 * can be clicked by mistake.
 *
 * It is deliberately the same PRODUCT though, not a separate brand site: same tokens,
 * same fonts, same terminal grammar, loaded from the same globals.css. A visitor who
 * reads the guides and then opens the app should recognise it instantly, which is also
 * why the gradient mark comes along — allowed use #1 (§3.2) travels with the wordmark,
 * and nothing else on a public page carries one.
 */
export function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-[1240px] items-center gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Fetch.io home" className="rounded-md">
          <Logo />
        </Link>

        <nav aria-label="Public" className="ml-auto flex items-center gap-1">
          <Link
            href="/guides"
            className="rounded-md px-3 py-2 font-mono text-nav text-muted transition-colors duration-150 hover:bg-surface-hover hover:text-text"
          >
            guides
          </Link>
        </nav>

        {/* One button, and it is the only way in. The root URL used to redirect
            straight to /dashboard, which left the product with no public surface at
            all — that redirect is now this. */}
        <Button asChild label="Open app" forward size="sm">
          <Link href="/dashboard" />
        </Button>
      </div>
    </header>
  )
}
