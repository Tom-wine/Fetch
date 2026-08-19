'use client'

import { FilterX, History, Sliders, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/data/states'

/** §7 #23 — every empty state says what it is, why, and what to do next. */

export function NoPoolYet() {
  return (
    <EmptyState
      icon={Users}
      title="No accounts yet"
      body="Paste a block of email:password lines above, or import a CSV. Only the seven ballot clubs are shown here — accounts for any other club stay on the accounts screen."
      glyph="brackets"
    />
  )
}

export function NothingMatches({ onClear }: { onClear: () => void }) {
  return (
    <EmptyState
      icon={FilterX}
      title="Nothing matches"
      body="No account in the pool matches these filters. Clear them to see the whole pool again."
      action={<Button variant="secondary" label="Clear filters" onClick={onClear} />}
      glyph="braces"
    />
  )
}

export function NoRunsYet({ onStart, disabled }: { onStart: () => void; disabled: boolean }) {
  return (
    <EmptyState
      icon={History}
      title="No runs yet"
      body="A run enters every chosen account into its club's ballot, one after another, at the pace its profile sets. Start one and this becomes the history."
      action={<Button label="Start run" forward onClick={onStart} disabled={disabled} />}
      glyph="prompt"
    />
  )
}

export function NoRunsMatch({ onClear }: { onClear: () => void }) {
  return (
    <EmptyState
      icon={FilterX}
      title="No runs match"
      body="No run in the history matches these filters."
      action={<Button variant="secondary" label="Clear filters" onClick={onClear} />}
      glyph="braces"
    />
  )
}

export function NoProfileChosen() {
  return (
    <EmptyState
      icon={Sliders}
      title="Pick a profile"
      body="A profile decides how fast a run goes, how many accounts it works on at once, how it handles a two-factor code and what it does when a club starts refusing. Choose one on the left to edit it, or create a new one."
      glyph="code"
      className="min-h-[220px]"
    />
  )
}
