import Link from 'next/link'
import { BookOpen, Dices, ListChecks, Radio } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Display, Prose, SectionLabel } from '@/components/ui/typography'

/**
 * `/` — the public front door.
 *
 * Deliberately spare. It says what the tool does, what it does not do, and offers the
 * two ways in: open the app, or read the guides. The full landing page is a later part;
 * what this must not do in the meantime is make claims the product cannot keep, so it
 * describes the loop that exists and nothing else.
 */
export const metadata = {
  title: 'Fetch.io — ballot entries for Premier League club accounts',
  description:
    'Load club accounts, choose how fast to go, enter a ballot with all of them, and watch every attempt as it happens.',
}

const STEPS = [
  {
    icon: ListChecks,
    label: '01_pool',
    title: 'Load the accounts',
    body: 'Paste email:password lines or import a club spreadsheet. Fetch.io keeps the sessions alive between on-sales.',
  },
  {
    icon: Dices,
    label: '02_profiles',
    title: 'Choose the pace',
    body: 'A profile is how fast to go: how many at once, how long between attempts, how many retries, which proxies.',
  },
  {
    icon: Radio,
    label: '03_runs',
    title: 'Run it and watch',
    body: 'Every account is entered one after another. The monitor shows each attempt, and says in plain English why one failed.',
  },
]

export default function LandingPage() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6">
      <section className="border-b border-border py-16 sm:py-24">
        <SectionLabel>ballot_entries_at_scale</SectionLabel>

        <Display as="h1" size="h1" className="mt-4 max-w-[18ch] text-text">
          Every account in the ballot, before the queue opens
        </Display>

        <Prose className="mt-5 max-w-[62ch] text-prose text-muted">
          Fetch.io enters your Premier League club accounts into a ballot one after another, at a
          pace you set, and shows you every attempt as it happens. When one fails it tells you which
          account, what the club said, and what to change.
        </Prose>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button asChild label="Open app" forward>
            <Link href="/dashboard" />
          </Button>
          <Button asChild variant="secondary" label="Read the guides">
            <Link href="/guides">
              <BookOpen className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {/* The honesty that the guides open with, said once here too. */}
        <Prose className="mt-8 max-w-[62ch] text-caption text-faint">
          Fetch.io does not queue-jump, guess passwords or bypass a club&apos;s checks. It signs in
          with credentials you already have and submits the same form you would, in order, at the
          rate you choose.
        </Prose>
      </section>

      <section className="grid gap-4 py-16 sm:grid-cols-3">
        {STEPS.map((step) => (
          <article key={step.label} className="rounded-lg border border-border bg-surface p-5">
            <span className="flex size-9 items-center justify-center rounded-md border border-border bg-surface-raised text-muted">
              <step.icon className="size-4" aria-hidden="true" />
            </span>
            <SectionLabel className="mt-4">{step.label}</SectionLabel>
            <h2 className="mt-1.5 text-title font-semibold text-text uppercase">{step.title}</h2>
            <Prose className="mt-2 text-prose text-muted">{step.body}</Prose>
          </article>
        ))}
      </section>
    </div>
  )
}
