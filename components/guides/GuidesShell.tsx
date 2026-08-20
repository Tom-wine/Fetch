import { GuidesNav, GuidesNavSheet } from './GuidesNav'
import { TableOfContents, type TocHeading } from './TableOfContents'

/**
 * The three-column reading frame, at the widths where three columns exist.
 *
 *   ≥1280   tree · content · on-this-page
 *   ≥1024   tree · content
 *   below   content, with the tree behind a CONTENTS button
 *
 * The centre is capped at 72ch rather than filling the width. A line of prose past about
 * 80 characters costs the reader the start of the next one — and unlike the app's
 * tables, where every pixel is data, a wide column here buys nothing.
 */
export function GuidesShell({
  headings = [],
  children,
}: {
  headings?: TocHeading[]
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-8 sm:px-6 sm:py-12">
      {/* The mobile trigger. Hidden from lg up, where the tree is simply there. */}
      <div className="mb-6 lg:hidden">
        <GuidesNavSheet />
      </div>

      <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_200px]">
        <aside className="hidden lg:block">
          <GuidesNav />
        </aside>

        <article className="max-w-[72ch] min-w-0">{children}</article>

        <aside className="hidden xl:block">
          <TableOfContents headings={headings} />
        </aside>
      </div>
    </div>
  )
}
