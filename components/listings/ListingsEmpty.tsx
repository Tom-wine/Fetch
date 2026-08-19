'use client'

import * as React from 'react'
import { FilterX, Store } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/data/states'

/**
 * The two zero-row states /mylistings can be in. They are different problems and get
 * different answers (§9 rule 15): a filter that matched nothing is fixed by clearing
 * it, while having nothing listed anywhere is fixed on /mytickets, which is where
 * listings are created from tickets.
 */
export function NoListingsYet({ onBrowseTickets }: { onBrowseTickets: () => void }) {
  return (
    <EmptyState
      icon={Store}
      title="Nothing listed yet"
      body="No tickets are on sale on any marketplace. Open a fixture in My Tickets, select the tickets you want to sell, and list them."
      action={<Button label="Go to my tickets" onClick={onBrowseTickets} forward />}
    />
  )
}

export function NoListingsMatch({ onClear }: { onClear: () => void }) {
  return (
    <EmptyState
      icon={FilterX}
      title="Nothing matches"
      body="No listing matches these filters. Widen the search, or clear the filters to see everything again."
      action={<Button variant="secondary" label="Clear filters" onClick={onClear} />}
      glyph="braces"
    />
  )
}
