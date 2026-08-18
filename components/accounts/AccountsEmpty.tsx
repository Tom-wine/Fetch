'use client'

import * as React from 'react'
import { FilterX, Inbox, KeyRound, Ticket } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/data/states'

/**
 * The §8.2 zero-data state — the first thing a new operator ever sees on the anchor
 * screen, so it carries the next action rather than an apology.
 *
 * `Import CSV` is the solid primary, not the gradient: §3.2 allows the gradient on
 * this CTA but also forbids two gradient elements in one viewport region, and
 * EmptyState already spends it on the icon square. One gradient, on the thing the
 * eye lands on first.
 */
export function NoAccountsYet({
  onImport,
  onAddManually,
}: {
  onImport: () => void
  onAddManually: () => void
}) {
  return (
    <EmptyState
      icon={Ticket}
      title="No accounts yet"
      body="Import a CSV of your club accounts, or add one by hand. Fetch.io will keep their sessions alive."
      action={<Button label="Import CSV" onClick={onImport} forward />}
      secondaryAction={<Button variant="secondary" label="Add manually" onClick={onAddManually} />}
    />
  )
}

/**
 * A filter that matched nothing is a different problem from having no accounts, and
 * offering "Import CSV" here would be answering a question nobody asked.
 */
export function NoAccountsMatch({ onClear }: { onClear: () => void }) {
  return (
    <EmptyState
      icon={FilterX}
      title="Nothing matches"
      body="No account matches these filters. Widen the search, or clear the filters to see everything again."
      action={<Button variant="secondary" label="Clear filters" onClick={onClear} />}
      glyph="braces"
    />
  )
}

export function NoProxies() {
  return (
    <EmptyState
      icon={Inbox}
      title="No proxies"
      body="No proxy matches this search. Proxies are imported in bulk as host:port:user:pass lines."
      glyph="braces"
    />
  )
}

/** §8.2: IMAP and OTP Inbox ship as honest empty states, not as fake tables. */
export function ImapComingSoon() {
  return (
    <EmptyState
      icon={Inbox}
      title="Email / IMAP not connected"
      body="Connect the mailboxes your club accounts use, and Fetch.io will read confirmation emails, ticket transfers and password resets straight from them instead of asking you to forward anything. Nothing is connected yet."
      glyph="braces"
    />
  )
}

export function OtpComingSoon() {
  return (
    <EmptyState
      icon={KeyRound}
      title="OTP Inbox empty"
      body="One-time codes the clubs send during an on-sale will land here, matched to the account that triggered them, so you can answer a 2FA challenge without leaving the app. It fills up once a mailbox is connected."
      glyph="prompt"
    />
  )
}
