import { PublicFooter } from '@/components/marketing/PublicFooter'
import { PublicHeader } from '@/components/marketing/PublicHeader'

/**
 * The public segment: `/` and `/guides/**`.
 *
 * It shares everything that decides what the product LOOKS like — globals.css, the
 * ThemeProvider, the two font faces, the type primitives — and none of what decides how
 * it BEHAVES. No sidebar, no command palette, no polling. A page here can be read by
 * someone with no account, and nothing on it implies one.
 *
 * The document scrolls normally, unlike `(app)`, which is a fixed h-screen frame with
 * its own scroll container. Docs are long; a page that scrolls inside a box loses the
 * browser's find-in-page position and the scroll-to-anchor behaviour every guide link
 * depends on.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  )
}
