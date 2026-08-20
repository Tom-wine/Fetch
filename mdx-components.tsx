import type { MDXComponents } from 'mdx/types'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { Display, Prose } from '@/components/ui/typography'
import { Callout } from '@/components/guides/Callout'
import { GuideImage } from '@/components/guides/GuideImage'

/**
 * Markdown, rendered in the product's own voice.
 *
 * Every element maps onto a primitive that already exists somewhere in the app, so a
 * guide looks like the thing it documents rather than like a docs site that happens to
 * be next door: headings are <Display>, paragraphs are <Prose> (Outfit 400 — the one
 * face allowed to run past two lines, and docs are the one place that genuinely does),
 * tables wear the DataTable's borders, and code is mono WITH ligatures, because in a
 * guide `=>` really is an arrow rather than a value in a cell.
 *
 * Required at the project root by @next/mdx: this is the file the MDX runtime looks for.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children, ...props }) => (
      <Display as="h1" size="h1" verbatim className="scroll-mt-24 text-text" {...props}>
        {children}
      </Display>
    ),

    h2: ({ children, ...props }) => (
      <Display
        as="h2"
        size="h2"
        verbatim
        className="group mt-12 scroll-mt-24 border-t border-border pt-8 text-text first:mt-0 first:border-0 first:pt-0"
        {...props}
      >
        {children}
      </Display>
    ),

    h3: ({ children, ...props }) => (
      <h3
        className="group mt-8 scroll-mt-24 font-mono text-title font-semibold text-text uppercase"
        {...props}
      >
        {children}
      </h3>
    ),

    p: ({ children, ...props }) => (
      <Prose className="mt-4 text-prose text-muted" {...props}>
        {children}
      </Prose>
    ),

    // Internal links route through next/link; anything external opens away and says so.
    a: ({ href = '', children, ...props }) => {
      const external = /^https?:\/\//.test(href)
      const className =
        'font-medium text-primary-ink underline underline-offset-4 transition-colors hover:text-text'

      if (external) {
        return (
          <a href={href} target="_blank" rel="noreferrer" className={className} {...props}>
            {children}
          </a>
        )
      }

      return (
        <Link href={href} className={className} {...props}>
          {children}
        </Link>
      )
    },

    ul: ({ children, ...props }) => (
      <ul
        className="mt-4 list-disc space-y-2 pl-5 font-prose text-prose text-muted marker:text-faint"
        {...props}
      >
        {children}
      </ul>
    ),

    ol: ({ children, ...props }) => (
      <ol
        className="mt-4 list-decimal space-y-2 pl-5 font-prose text-prose text-muted marker:text-faint"
        {...props}
      >
        {children}
      </ol>
    ),

    li: ({ children, ...props }) => (
      <li className="pl-1" {...props}>
        {children}
      </li>
    ),

    blockquote: ({ children, ...props }) => (
      <blockquote
        className="mt-6 border-l-2 border-primary/40 pl-4 font-prose text-prose text-muted italic"
        {...props}
      >
        {children}
      </blockquote>
    ),

    // Inline code. `pre > code` is styled by the pre below, so this keeps its own chip
    // look only when it stands alone in a sentence.
    code: ({ children, className, ...props }) => (
      <code
        className={cn(
          'rounded-sm border border-border bg-surface-raised px-1.5 py-0.5 font-mono text-body text-text',
          className,
        )}
        {...props}
      >
        {children}
      </code>
    ),

    pre: ({ children, ...props }) => (
      <pre
        className="mt-6 overflow-x-auto rounded-lg border border-border bg-surface-raised p-4 font-mono text-body text-text [&_code]:border-0 [&_code]:bg-transparent [&_code]:p-0"
        {...props}
      >
        {children}
      </pre>
    ),

    // The table wears the DataTable's own borders and header treatment, because a
    // reader who has seen one in the app should not have to learn a second one here.
    table: ({ children, ...props }) => (
      <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full border-collapse text-left" {...props}>
          {children}
        </table>
      </div>
    ),

    thead: ({ children, ...props }) => (
      <thead className="bg-surface-raised" {...props}>
        {children}
      </thead>
    ),

    th: ({ children, ...props }) => (
      <th
        scope="col"
        className="border-b border-border px-4 py-3 font-mono text-label font-semibold whitespace-nowrap text-muted uppercase"
        {...props}
      >
        {children}
      </th>
    ),

    tr: ({ children, ...props }) => (
      <tr className="border-b border-border last:border-0" {...props}>
        {children}
      </tr>
    ),

    td: ({ children, ...props }) => (
      <td className="px-4 py-3 align-top font-prose text-prose text-muted" {...props}>
        {children}
      </td>
    ),

    hr: (props) => <hr className="mt-10 border-border" {...props} />,

    img: (props) => <GuideImage {...(props as { src?: string; alt?: string })} />,

    // Available in every guide without an import.
    Callout,

    ...components,
  }
}
