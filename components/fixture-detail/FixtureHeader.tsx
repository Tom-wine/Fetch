/* eslint-disable @next/next/no-img-element */
'use client'

import * as React from 'react'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { useLocale } from '@/lib/format/LocaleProvider'
import { formatDateLong, formatDateTime, formatRelative, urgencyOf } from '@/lib/format/date'
import type { LocaleSettings } from '@/lib/format/locale'
import { getClub } from '@/lib/registries/clubs'
import { getPlatform } from '@/lib/registries/platforms'
import { COMPETITION_LABEL } from '@/lib/registries/providers'
import { Display, SectionLabel } from '@/components/ui/typography'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Chip } from '@/components/domain/StatusChip'
import { Money } from '@/components/domain/Money'
import { PrivacyToggle } from '@/components/domain/PrivacyToggle'
import type { Fixture } from '@/lib/types'

/**
 * The §8.5 fixture header.
 *
 * This is the one screen where `PageHeader` is not enough: §8.5 puts 72px of home
 * crest beside the `h1`, and `PageHeader` takes a plain string. The breadcrumb markup
 * below is deliberately identical to the shared one — same grammar, same separators,
 * same `text-caption text-faint` — so the two headers read as the same component
 * family rather than as a second design.
 */
export function FixtureHeader({ fixture }: { fixture: Fixture }) {
  const { settings } = useLocale()
  const home = getClub(fixture.homeClub)
  const away = getClub(fixture.awayClub)

  const relative = formatRelative(fixture.kickoff, settings)
  const urgency = urgencyOf(relative.daysAway)

  return (
    <header className="space-y-4">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5 font-mono text-caption text-faint">
          <li>
            <Link href="/mytickets" className="transition-colors hover:text-text">
              My Tickets
            </Link>
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true">/</span>
            {/* The fixture, written the way a fixture is written — never snake_cased. */}
            <span className="text-muted">{fixtureCrumb(fixture, settings)}</span>
          </li>
        </ol>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 items-start gap-4">
          <img
            src={fixture.artworkUrl}
            alt=""
            width={72}
            height={72}
            className="shrink-0 rounded-md"
            style={{ width: 72, height: 72 }}
          />

          <div className="min-w-0">
            <Display as="h1" size="h1" className="text-text">
              {home.short} <span className="text-muted lowercase">v</span> {away.short}
            </Display>

            <p className="mt-1.5 text-lg font-semibold text-text tabular-nums">
              {formatDateTime(fixture.kickoff, settings)}
              <span
                className={cn(
                  'ml-2 text-body font-normal',
                  urgency === 'past'
                    ? 'text-faint'
                    : urgency === 'urgent'
                      ? 'text-danger-ink'
                      : urgency === 'soon'
                        ? 'text-warning-ink'
                        : 'text-muted',
                )}
              >
                {relative.text}
              </span>
            </p>

            <p className="mt-1 text-body text-muted">
              {fixture.venue.name} — {fixture.venue.city}, {fixture.venue.country}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <Chip tone="neutral">{COMPETITION_LABEL[fixture.competition]}</Chip>
              {fixture.matchweek !== undefined && (
                <Chip tone="primary">MW {fixture.matchweek}</Chip>
              )}
              {fixture.blockedPlatforms.map((platform) => (
                <BlockedChip key={platform} platform={platform} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="text-right">
            <SectionLabel>value at risk</SectionLabel>
            <Money
              amount={fixture.valueAtRisk}
              currency={fixture.currency}
              className={cn(
                'mt-1 block font-display text-kpi font-black',
                urgency === 'urgent'
                  ? 'text-danger-ink'
                  : urgency === 'soon'
                    ? 'text-warning-ink'
                    : 'text-text',
              )}
            />
          </div>
          <PrivacyToggle className="mt-5" />
        </div>
      </div>
    </header>
  )
}

/**
 * §9 rule 10 — every domain flag chip says what it means in plain English. "No
 * Viagogo" is the kind of chip an operator learns to ignore until the day it costs
 * them a listing, so it spells the consequence out rather than the fact.
 */
function BlockedChip({ platform }: { platform: Fixture['blockedPlatforms'][number] }) {
  const { name } = getPlatform(platform)
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="rounded-sm">
            <Chip tone="danger">No {name}</Chip>
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-[280px] font-prose text-prose">
          {`This fixture cannot be resold on ${name}.`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * `Arsenal v Chelsea — 14 Sep 2026`, the §8.5 breadcrumb. `formatDateLong` exists for
 * exactly this — §9 rule 6 puts every date in the app through one formatter, so no
 * component reaches for `Intl` itself.
 */
export function fixtureCrumb(fixture: Fixture, settings: LocaleSettings): string {
  const home = getClub(fixture.homeClub)
  const away = getClub(fixture.awayClub)
  return `${home.name} v ${away.name} — ${formatDateLong(fixture.kickoff, settings)}`
}

/** The header's own skeleton, so a cold load shows the shape rather than a gap. */
export function FixtureHeaderSkeleton() {
  return (
    <header className="space-y-4">
      <Skeleton className="h-3 w-64" />
      <div className="flex items-start gap-4">
        <Skeleton className="size-[72px] rounded-md" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-72" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-3 w-64" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
    </header>
  )
}
