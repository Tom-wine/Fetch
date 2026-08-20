import Image from 'next/image'
import Link from 'next/link'
import { BookOpen, Dices, ListChecks, Radio } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Display, Prose, SectionLabel } from '@/components/ui/typography'
import { getClub } from '@/lib/registries/clubs'
import { BALLOT_CLUB_IDS } from '@/lib/types'

/**
 * `/` — the public front door.
 *
 * Deliberately spare. It says what the tool does, what it does not do, and offers the
 * two ways in: open the app, or read the guides. It describes the loop that exists and
 * nothing else — no social proof, no testimonials, no success rates, no pricing. There
 * is no subscription to describe yet, and every one of those would be the placeholder
 * content this project has refused on twenty screens.
 *
 * What it does have is the one genuinely persuasive asset: a screenshot of the run
 * monitor, dark, at the width it actually runs at, doing visible work.
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
      {/* 1 · Hero */}
      <section className="fetch-rise py-16 sm:py-24">
        <div className="flex items-center gap-3">
          {/* The single hero gradient — allowed use #3 of five (§3.2). The mark in the
              header is use #1; nothing else on this page carries one. */}
          <span aria-hidden="true" className="h-0.5 w-10 rounded-full bg-fetch-gradient" />
          <span className="font-display text-nav font-bold tracking-[-0.02em] text-text uppercase">
            Fetch.io
          </span>
        </div>

        <SectionLabel className="mt-8">ballot_entries_at_scale</SectionLabel>

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
          <Button asChild variant="ghost" label="Read the guides">
            <Link href="/guides">
              <BookOpen className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>

      {/* 2 · The screenshot. The same capture the guides use, at the width it was taken:
          one asset, one download, and the picture a reader meets twice is the same
          picture. Framed rather than bled, because it is a picture OF the app. */}
      <section className="pb-16 sm:pb-24">
        <figure className="fetch-rise fetch-rise-delayed">
          <div className="overflow-hidden rounded-xl border border-border bg-surface-raised p-1.5 sm:p-2">
            <Image
              src="/guides/monitor.png"
              alt="The run monitor at 1440px: seven counters over a segmented progress bar, the task table, and the selected task's timeline"
              width={1440}
              height={900}
              priority
              sizes="(min-width: 1240px) 1180px, 100vw"
              className="w-full rounded-lg border border-border"
            />
          </div>
          <figcaption className="mt-3 font-mono text-caption text-faint">
            {'// the run monitor, mid-run'}
          </figcaption>
        </figure>
      </section>

      {/* 3 · The loop */}
      <section className="grid gap-4 border-t border-border py-16 sm:grid-cols-3">
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

      {/* 4 · The clubs. Crests are the generated initials-on-colour marks from
          `public/crests` (§13 — real club artwork is trademarked), and the list is
          BALLOT_CLUB_IDS itself, so this cannot drift from what the app will run. */}
      <section className="border-t border-border py-16">
        <SectionLabel>supported_clubs</SectionLabel>
        <h2 className="mt-1.5 text-title font-semibold text-text uppercase">
          Seven clubs run ballots today
        </h2>

        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {BALLOT_CLUB_IDS.map((id) => {
            const club = getClub(id)
            return (
              <li
                key={id}
                className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface px-3 py-4"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={club.crest} alt="" width={32} height={32} className="size-8" />
                {/* A club is domain data: rendered in its own case, never snake_cased. */}
                <span className="text-center text-caption text-muted">{club.short}</span>
              </li>
            )
          })}
        </ul>

        <Prose className="mt-5 max-w-[62ch] text-caption text-faint">
          The other thirteen Premier League clubs are already in the registry behind the app.
          Whether one of them can be entered is a question of what its ticketing site allows, so
          they are switched on one at a time rather than claimed here in advance.
        </Prose>
      </section>
    </div>
  )
}
