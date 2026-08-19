import Link from 'next/link'

import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Display, Prose, SectionLabel } from '@/components/ui/typography'

/**
 * Row 2 right of §8.1 — the promo card, and allowed use #3 of the signature
 * gradient (docs/DESIGN-TOKENS.md §2). It is the only gradient in this column, and
 * the CTA on it is deliberately NOT a gradient button: §3.2 forbids two gradient
 * elements in one viewport region.
 *
 * The gradient runs #0057C8 → #6FD3FA, and white on that last stop is about 1.7:1.
 * The scrim below keeps the copy on the dark half of the ramp without repainting
 * the brand gradient — the cyan end still shows, it just does not sit under text.
 */
export function PromoCard({ className }: { className?: string }) {
  return (
    <section
      aria-label="Import accounts"
      className={cn('relative overflow-hidden rounded-lg bg-fetch-gradient p-5', className)}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(105deg, rgba(3,12,28,0.58) 0%, rgba(3,12,28,0.24) 48%, rgba(3,12,28,0) 100%)',
        }}
      />

      <div className="relative flex flex-col items-start gap-3">
        <SectionLabel className="text-white/70">next step</SectionLabel>

        <Display as="h2" size="h2" className="text-white">
          More accounts, more seats
        </Display>

        <Prose className="text-white/85">
          Every account you add is another place in the queue. Import a club spreadsheet and
          Fetch.io keeps those sessions alive between on-sales, so the next drop starts with all of
          them logged in.
        </Prose>

        <Link
          href="/accounts/import"
          className={cn(
            buttonVariants({ variant: 'secondary' }),
            'mt-1 border-white/25 bg-white/12 text-white hover:border-white/45 hover:bg-white/20',
          )}
        >
          <span>IMPORT_ACCOUNTS</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  )
}
