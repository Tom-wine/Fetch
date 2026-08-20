'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { SectionLabel } from '@/components/ui/typography'

export interface TocHeading {
  depth: number
  text: string
  id: string
}

/**
 * "On this page", with the heading you are actually looking at marked.
 *
 * The ids come from the build-time index, which computes them with the same slugger
 * rehype-slug uses — so a link here cannot miss a heading by a dash. If it ever does,
 * the fault is one file (scripts/build-guides-index.mjs), not thirty MDX pages.
 *
 * The scrollspy watches the top fifth of the viewport rather than the whole of it:
 * observing the full height marks the LAST visible heading, which on a long section
 * means the ToC highlights something two screens below what is being read.
 */
export function TableOfContents({ headings }: { headings: TocHeading[] }) {
  const [active, setActive] = React.useState<string | null>(headings[0]?.id ?? null)

  React.useEffect(() => {
    if (headings.length === 0) return

    const elements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => element !== null)

    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      // Top fifth of the viewport: -80px clears the sticky public header.
      { rootMargin: '-80px 0px -80% 0px', threshold: 0 },
    )

    for (const element of elements) observer.observe(element)
    return () => observer.disconnect()
  }, [headings])

  if (headings.length === 0) return null

  return (
    <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pb-8">
      <SectionLabel>on_this_page</SectionLabel>

      <ul className="mt-2 space-y-0.5 border-l border-border">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              className={cn(
                '-ml-px block border-l py-1 font-prose text-caption transition-colors duration-150',
                heading.depth === 3 ? 'pl-6' : 'pl-3',
                active === heading.id
                  ? 'border-primary text-text'
                  : 'border-transparent text-muted hover:border-border-strong hover:text-text',
              )}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
