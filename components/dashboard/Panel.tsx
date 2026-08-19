import * as React from 'react'

import { cn } from '@/lib/utils'
import { upperSnake } from '@/lib/format/text'
import { SectionLabel } from '@/components/ui/typography'

/**
 * The card shell every region of /dashboard sits in.
 *
 * `components/ui/card.tsx` is the shadcn primitive and still wears the generated
 * `bg-card` / `text-card-foreground` names; every screen shipped so far composes
 * `border-border bg-surface` directly instead (StatTile does exactly this). This
 * keeps that one recipe in one place for this screen rather than repeating it in
 * four components — it deliberately does not try to become a shared primitive.
 *
 * `title` is a chrome string: UPPER_SNAKE'd here per §3.3b, so callers write it
 * normally. `label` is the `// lower_snake` sub-label §3.3 puts above every panel.
 */
export function Panel({
  title,
  label,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title: string
  label?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section
      aria-label={title}
      className={cn(
        'flex flex-col rounded-lg border border-border bg-surface shadow-sm dark:shadow-none',
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-title font-semibold text-text">{upperSnake(title)}</h2>
          {label && <SectionLabel className="mt-1.5">{label}</SectionLabel>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>

      <div className={cn('flex-1 p-5', bodyClassName)}>{children}</div>
    </section>
  )
}
