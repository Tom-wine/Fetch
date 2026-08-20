'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { List, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { SectionLabel } from '@/components/ui/typography'
import { GUIDE_NAV } from '@/content/guides/nav'

/**
 * The guide tree.
 *
 * Every section is always visible — there are sixteen pages, and collapsing four groups
 * to save 120px of a sticky column that has the height to spare only hides the map from
 * someone who does not yet know the territory. The CURRENT section is marked instead.
 *
 * Below `lg` it becomes a Sheet, because a 240px tree on a 375px screen is the page. The
 * trigger says CONTENTS rather than showing a hamburger: this is not the app's
 * navigation, and a second hamburger on a page that already has one in the header is a
 * coin toss.
 */
function Tree({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <nav aria-label="Guides" className="space-y-6">
      {GUIDE_NAV.map((section) => {
        const current = section.entries.some((entry) => pathname === `/guides/${entry.slug}`)

        return (
          <div key={section.label}>
            <SectionLabel className={cn(current && 'text-primary-ink')}>
              {section.label}
            </SectionLabel>

            <ul className="mt-2 space-y-0.5 border-l border-border">
              {section.entries.map((entry) => {
                const href = `/guides/${entry.slug}`
                const active = pathname === href

                return (
                  <li key={entry.slug}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        '-ml-px block border-l py-1.5 pl-3 font-mono text-nav transition-colors duration-150',
                        active
                          ? 'border-primary text-text'
                          : 'border-transparent text-muted hover:border-border-strong hover:text-text',
                      )}
                    >
                      {entry.title}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </nav>
  )
}

export function GuidesNav() {
  return (
    <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-4 pb-8">
      <Tree />
    </div>
  )
}

export function GuidesNavSheet() {
  const [open, setOpen] = React.useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 font-mono text-caption text-muted transition-colors duration-150 hover:bg-surface-hover hover:text-text"
        >
          <List className="size-4" aria-hidden="true" />
          CONTENTS
        </button>
      </SheetTrigger>

      <SheetContent side="left" className="w-[280px] overflow-y-auto border-border bg-bg p-6">
        <div className="flex items-center justify-between">
          <SheetTitle className="font-mono text-title font-semibold text-text uppercase">
            Guides
          </SheetTitle>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close contents"
            className="flex size-8 items-center justify-center rounded-md text-muted hover:bg-surface-hover hover:text-text"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6">
          <Tree onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
