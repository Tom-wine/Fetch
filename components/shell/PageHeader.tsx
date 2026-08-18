import * as React from 'react'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { Display, SectionLabel } from '@/components/ui/typography'

export interface Crumb {
  label: string
  href?: string
}

/**
 * The top of every screen. §9 rule 9: breadcrumb plus a correct h1 on every detail
 * page, and the same grammar everywhere — breadcrumb → h1 → toolbar → data.
 */
export function PageHeader({
  title,
  subtitle,
  breadcrumb,
  actions,
  caret = false,
  className,
}: {
  /** Rendered by <Display> — Outfit 900, 28px, uppercase. May be domain data. */
  title: string
  /** Chrome string; rendered as `// lower_snake_case`. */
  subtitle?: string
  breadcrumb?: Crumb[]
  actions?: React.ReactNode
  /** Dashboard only: a blinking terminal caret after the title. */
  caret?: boolean
  className?: string
}) {
  return (
    <header className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-2">
            <ol className="flex flex-wrap items-center gap-1.5 font-mono text-caption text-faint">
              {breadcrumb.map((crumb, i) => (
                <li key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
                  {i > 0 && <span aria-hidden="true">/</span>}
                  {crumb.href ? (
                    <Link href={crumb.href} className="transition-colors hover:text-text">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-muted">{crumb.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        <Display as="h1" size="h1" className="flex items-baseline text-text">
          {title}
          {caret && (
            <span aria-hidden="true" className="caret-blink ml-1 text-primary">
              _
            </span>
          )}
        </Display>

        {subtitle && <SectionLabel className="mt-2">{subtitle}</SectionLabel>}
      </div>

      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
