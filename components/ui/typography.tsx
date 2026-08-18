import * as React from 'react'
import { cn } from '@/lib/utils'
import { comment } from '@/lib/format/text'

/**
 * The only components in Fetch.io allowed to set a font family (§3.3).
 * Two families, no third: Outfit for display and prose, JetBrains Mono for
 * everything else. If a component needs a typeface, it composes one of these.
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
  className,
  children,
  ...props
}: {
  as?: 'h1' | 'h2' | 'div' | 'span'
  size?: DisplaySize
  className?: string
  children: React.ReactNode
} & Omit<React.HTMLAttributes<HTMLHeadingElement>, 'children'>) {
  return (
    <Tag
      className={cn('font-display font-black uppercase', displaySizes[size], className)}
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
