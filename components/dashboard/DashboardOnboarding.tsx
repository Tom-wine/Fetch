'use client'

import * as React from 'react'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'

import { cn } from '@/lib/utils'
import { qk } from '@/lib/api/hooks/keys'
import { Button, buttonVariants } from '@/components/ui/button'
import { Display, Prose, SectionLabel } from '@/components/ui/typography'
import { GlyphMark } from '@/components/shell/GlyphMark'
import { AddAccountSheet } from '@/components/accounts/AccountSheets'

/**
 * §8.1's zero-data state: with no accounts there is no revenue, no health and no
 * feed, so the whole page is replaced by the next action rather than by three
 * zeros and an empty plot.
 *
 * The gradient is spent on the CTA (allowed use #5), which is what §8.1 asks for,
 * and therefore NOT on an icon square as `EmptyState` would — §3.2 allows only one
 * gradient element per viewport region. That is the only reason this is not the
 * shared `EmptyState`.
 *
 * `Add manually` mounts the same `AddAccountSheet` /accounts uses, so the operator
 * gets the real form here instead of being bounced to another screen to find it.
 */
export function DashboardOnboarding() {
  const [addOpen, setAddOpen] = React.useState(false)
  const queryClient = useQueryClient()

  return (
    <section
      aria-label="No accounts yet"
      className="relative overflow-hidden rounded-lg border border-border bg-surface px-6 py-14 text-center"
    >
      {/* An empty region is one of the two places §3.3b allows a glyph. */}
      <GlyphMark glyph="prompt" className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      <div className="relative mx-auto flex max-w-xl flex-col items-center gap-4">
        <SectionLabel>first run</SectionLabel>

        <Display as="h2" size="h1" className="text-text">
          No accounts yet
        </Display>

        <Prose className="text-muted">
          Import your first accounts to start tracking. Fetch.io keeps their sessions alive between
          on-sales, follows every seat you hold, and tells you what is still unsold while there is
          time to reprice it.
        </Prose>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/accounts/import"
            className={cn(buttonVariants({ variant: 'gradient' }), 'gap-2')}
          >
            <span>IMPORT_ACCOUNTS</span>
            <span aria-hidden="true">→</span>
          </Link>

          <Button variant="secondary" label="Add manually" onClick={() => setAddOpen(true)} />
        </div>
      </div>

      <AddAccountSheet
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open)
          // Creating an account invalidates the accounts root, which covers the
          // stats this page gates on; the KPI tiles live under the dashboard root
          // and would otherwise still be reporting an empty estate.
          if (!open) void queryClient.invalidateQueries({ queryKey: qk.dashboard.all })
        }}
      />
    </section>
  )
}
