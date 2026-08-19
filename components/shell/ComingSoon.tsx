import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

import { EmptyState } from '@/components/data/states'
import { Button } from '@/components/ui/button'

/**
 * The honest placeholder for a route that exists so nothing 404s but that has not been
 * built yet (§9: nav is never dead).
 *
 * It is `EmptyState` with the section's own icon rather than bespoke markup, because
 * "there is nothing here" is a state the app already knows how to draw — and drawing
 * it a second way would make an unbuilt screen look like a different product.
 *
 * Three things, always. The icon the sidebar uses for this section, so the page is
 * recognisably the thing that was clicked. One sentence saying what it will do, in the
 * present tense of the product rather than a roadmap promise. And a way out to a
 * screen that works today, because a dead end is what makes a placeholder feel broken
 * rather than unfinished.
 */
export function ComingSoon({
  icon,
  what,
  cta,
}: {
  /** The section's sidebar icon, from nav-config. */
  icon: LucideIcon
  /** One sentence. What this screen will do, not when it will land. */
  what: string
  /** Somewhere that works today. */
  cta: { href: string; label: string }
}) {
  return (
    <EmptyState
      icon={icon}
      title="Coming soon"
      body={what}
      glyph="prompt"
      action={
        <Button asChild forward label={cta.label}>
          <Link href={cta.href} />
        </Button>
      }
    />
  )
}
