import * as React from 'react'
import { cn } from '@/lib/utils'
import { comment } from '@/lib/format/text'

/**
 * The only components in Fetch.io allowed to set a font family (§3.3).
 * Space Grotesk 700 for display, Outfit 400 for the prose escape hatch, JetBrains Mono
 * for everything else. If a component needs a typeface, it composes one of these.
 */

type DisplaySize = 'kpi' | 'h1' | 'h2'

const displaySizes: Record<DisplaySize, string> = {
  kpi: 'text-kpi',
  h1: 'text-display',
  h2: 'text-h2',
}

export function Display({
  as: Tag = 'h1',
  size = 'h1',
  verbatim = false,
  className,
  children,
  ...props
}: {
  as?: 'h1' | 'h2' | 'div' | 'span'
  size?: DisplaySize
  /**
   * DOMAIN DATA — a fixture, a run label, whatever the operator typed. Rendered in the
   * case it was written in.
   *
   * Chrome shouts: DASHBOARD, ACCOUNTS, SETTINGS are the product talking about itself.
   * Data does not. §B7 rule 7 already says domain data renders verbatim, and
   * upper-casing a label an operator typed is not verbatim — it was the one place the
   * rule contradicted itself. It also costs a phone two lines of a long run label.
   */
  verbatim?: boolean
  className?: string
  children: React.ReactNode
} & Omit<React.HTMLAttributes<HTMLHeadingElement>, 'children'>) {
  return (
    <Tag
      className={cn(
        'font-display font-bold',
        !verbatim && 'uppercase',
        displaySizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  )
}

/**
 * `// lower_snake_case` — goes above every card, group and panel.
 * Pass a plain human string; the snake-casing and the `// ` prefix happen here.
 * Chrome strings only — never a club, fixture, person or email.
 */
export function SectionLabel({
  children,
  className,
  ...props
}: { children: string; className?: string } & Omit<
  React.HTMLAttributes<HTMLSpanElement>,
  'children'
>) {
  return (
    <span className={cn('block font-mono text-label text-muted', className)} {...props}>
      {comment(children)}
    </span>
  )
}

/**
 * Outfit 400 / 14px / 1.6 — the one escape hatch, and the ONLY component allowed
 * to render multi-line prose: dropdown descriptions, empty-state bodies, error
 * explanations. Mono is unreadable in paragraphs.
 */
export function Prose({
  as: Tag = 'p',
  className,
  children,
  ...props
}: {
  as?: 'p' | 'div' | 'span'
  className?: string
  children: React.ReactNode
} & Omit<React.HTMLAttributes<HTMLParagraphElement>, 'children'>) {
  return (
    <Tag className={cn('font-prose text-prose font-normal', className)} {...props}>
      {children}
    </Tag>
  )
}

/**
 * Explicit mono. Rarely needed — mono is already the document default — but use
 * it where an element sits inside a <Prose> block and must snap back to data
 * (an order ID inside an explanation, a seat range inside a description).
 */
export function Mono({
  as: Tag = 'span',
  className,
  children,
  ...props
}: {
  as?: 'span' | 'div' | 'code'
  className?: string
  children: React.ReactNode
} & Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'>) {
  return (
    <Tag className={cn('font-mono text-body', className)} {...props}>
      {children}
    </Tag>
  )
}
