'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Ban,
  Copy,
  Download,
  Link2,
  PoundSterling,
  RefreshCw,
  Send,
  Share2,
  Ticket,
  Trash2,
  TrendingUp,
  Upload,
  Users,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { comment, snake, step, upperSnake, withCount } from '@/lib/format/text'
import { Display, Mono, Prose, SectionLabel } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { ThemeSegment } from '@/components/shell/ThemeSegment'
import { PageHeader } from '@/components/shell/PageHeader'

import { DataTable, type FetchColumnDef, type RowSelectionState } from '@/components/data/DataTable'
import { Toolbar, ToolbarSearch } from '@/components/data/Toolbar'
import { ALL, FilterSelect } from '@/components/data/FilterSelect'
import { ViewOptionsPopover, type Density } from '@/components/data/ViewOptionsPopover'
import { BulkActionBar } from '@/components/data/BulkActionBar'
import { EmptyState, ErrorState, SkeletonCard, SkeletonTable } from '@/components/data/states'

import {
  Chip,
  StatusChip,
  ACCOUNT_STATUSES,
  LISTING_STATUSES,
} from '@/components/domain/StatusChip'
import { AccountPicker } from '@/components/domain/AccountPicker'
import { ClubBadge } from '@/components/domain/ClubBadge'
import { PlatformBadge, ProviderBadge } from '@/components/domain/PlatformBadge'
import { FixtureIdentity } from '@/components/domain/FixtureIdentity'
import { StatTile } from '@/components/domain/StatTile'
import { PasswordCell } from '@/components/domain/PasswordCell'
import { Money, Num, Percent } from '@/components/domain/Money'
import { DateTime, RelativeTime } from '@/components/domain/RelativeTime'
import { ActionsMenu } from '@/components/domain/ActionsMenu'
import { ConfirmDialog } from '@/components/domain/ConfirmDialog'
import { PrivacyToggle } from '@/components/domain/PrivacyToggle'
import { BarChart, LineChart, Sparkline } from '@/components/domain/charts'

import {
  useAccountsTable,
  useListingsTable,
  useRevealPassword,
  useUpdateListing,
} from '@/lib/api/hooks'
import type { AccountFilters, ListingFilters } from '@/lib/api/endpoints'
import type { Account } from '@/lib/types'
import { CLUBS } from '@/lib/registries/clubs'
import { PLATFORMS } from '@/lib/registries/platforms'
import { PROVIDERS } from '@/lib/registries/providers'
import {
  DEMO_FIXTURES,
  DEMO_LISTINGS,
  DEMO_REVENUE,
  DEMO_SPARK,
  type DemoFixture,
} from './demo-data'

/**
 * The regression check for every part that follows (§7): every primitive, every
 * variant, every state, both themes.
 *
 * Deliberately outside the (app) shell so components are judged on their own rather
 * than inside a layout that could be hiding a sizing bug.
 */

export default function KitchenSinkPage() {
  return (
    <div className="min-h-screen bg-bg px-4 py-8 text-text sm:px-6">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-12">
        <PageHeader
          title="Kitchen sink"
          subtitle="every_primitive_every_state"
          actions={
            <div className="flex items-center gap-2">
              <PrivacyToggle />
              <ThemeSegment />
            </div>
          }
        />

        <TypographySection />
        <GrammarSection />
        <TokenSection />
        <ButtonSection />
        <ChipSection />
        <DomainSection />
        <StatTileSection />
        <FormatSection />
        <MenuSection />
        <ControlSection />
        <StateSection />
        <TableSection />
        <ChartSection />
      </div>
    </div>
  )
}

/** A fixed offset, so the "2h ago" specimen does not drift between screenshots. */
const FOUR_MINUTES_AGO = new Date(Date.now() - 4 * 60_000).toISOString()

/* ------------------------------------------------------------------ layout */

function Section({
  label,
  note,
  children,
}: {
  label: string
  note?: string
  children: React.ReactNode
}) {
  return (
    // The label doubles as the anchor id, so a section can be linked or screenshotted
    // directly — this page is the visual regression check for every later part.
    <section id={label} className="flex scroll-mt-6 flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border pb-2">
        <SectionLabel>{label}</SectionLabel>
        {note && <span className="text-caption text-faint">{note}</span>}
      </div>
      {children}
    </section>
  )
}

function Panel({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
      {label && <SectionLabel>{label}</SectionLabel>}
      {children}
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>
}

/* -------------------------------------------------------------- typography */

function TypographySection() {
  return (
    <Section label="typography_specimen" note="§3.3 · two families, no third">
      <Panel>
        <Spec caption="kpi · outfit 900 · 32px · -0.03em">
          <Display as="div" size="kpi">
            £48,210
          </Display>
        </Spec>
        <Spec caption="h1 · outfit 900 · 28px · uppercase · -0.02em">
          <Display as="h2" size="h1">
            Arsenal v Chelsea
          </Display>
        </Spec>
        <Spec caption="h2 · outfit 900 · 18px · uppercase · -0.01em">
          <Display as="h2" size="h2">
            Account health
          </Display>
        </Spec>
        <Spec caption="section label · mono 400 · 11px · 0.08em · muted">
          <SectionLabel>account_health</SectionLabel>
        </Spec>
        <Spec caption="card title · mono 600 · 14px · UPPER_SNAKE · 0.04em">
          <div className="text-title font-semibold uppercase">TOTAL_RESALE_REVENUE</div>
        </Spec>
        <Spec caption="body / table cell · mono 400 · 13px · -0.01em">
          <div className="text-body">
            j.moreau@mail.com · AFC-8842019 · 2,140 · North Bank Upper 21
          </div>
        </Spec>
        <Spec caption="table header · mono 600 · 11px · UPPER_SNAKE · 0.08em · muted">
          <div className="text-label font-semibold text-muted">VALUE_AT_RISK</div>
        </Spec>
        <Spec caption="numeric cell · mono 600 · 13px · tabular">
          <div className="text-body font-semibold tabular-nums">1,204,880</div>
        </Spec>
        <Spec caption="button · mono 600 · 12px · UPPER_SNAKE · 0.06em">
          <Button variant="gradient" label="Import CSV" forward />
        </Spec>
        <Spec caption="chip · mono 500 · 11px · UPPERCASE · 0.04em">
          <Chip tone="success">ACTIVE</Chip>
        </Spec>
        <Spec caption="input · mono 400 · 13px">
          <ToolbarSearch value="" onChange={() => {}} placeholder="Search accounts" />
        </Spec>
        <Spec caption="caption / timestamp · mono 400 · 11px · muted">
          <div className="text-caption text-muted">4m ago</div>
        </Spec>
        <Spec caption="prose · outfit 400 · 14px · 1.6 — the one escape hatch">
          <Prose className="max-w-prose text-muted">
            Prose is the only place a proportional face appears in running text. It is used where
            copy runs past two lines — dropdown descriptions, empty states, validation explanations
            — because mono is unreadable in paragraphs and a third family would dilute the system.
          </Prose>
        </Spec>
        <Spec caption="ligature guard — must render as separate glyphs, never arrows">
          <Mono>{'-> != === => <= |> ::'}</Mono>
        </Spec>
      </Panel>
    </Section>
  )
}

function Spec({ caption, children }: { caption: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 border-b border-border py-3 last:border-0 last:pb-0 md:grid-cols-[1fr_280px] md:items-center md:gap-6">
      <div className="min-w-0">{children}</div>
      <div className="text-caption text-faint md:text-right">{caption}</div>
    </div>
  )
}

/* ----------------------------------------------------------------- grammar */

function GrammarSection() {
  const RIGHT: Array<[string, string]> = [
    ['section label', comment('account_health')],
    ['column header', upperSnake('value at risk')],
    ['button', 'IMPORT_CSV →'],
    ['button with count', withCount('Delete accounts', 4)],
    ['nav item', snake('My Listings')],
    ['active nav item', `//${snake('Account Manager')}`],
    ['status chip', upperSnake('needs otp')],
    ['wizard step', step(2, 'Map columns')],
    ['helper text', '// passwords are never stored in your browser'],
    ['metric label', snake('Total resale revenue')],
  ]

  const GUARDRAILS: Array<[string, string, string]> = [
    ['user data is never snake_cased', 'ARSENAL v CHELSEA', 'arsenal_v_chelsea'],
    ['…nor are emails', 'j.moreau@mail.com', 'j_moreau_mail_com'],
    ['…nor club names', 'Manchester United', 'manchester_united'],
    [
      'errors read as plain sentences',
      'Delete 4 accounts? This cannot be undone.',
      '// delete_failed',
    ],
    [
      'no uppercase paragraphs',
      'Import a CSV of your club accounts.',
      'IMPORT A CSV OF YOUR CLUB ACCOUNTS',
    ],
  ]

  return (
    <Section label="terminal_grammar" note="§3.3b · chrome strings only">
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel label="conventions">
          <dl className="flex flex-col gap-2">
            {RIGHT.map(([role, sample]) => (
              <div
                key={role}
                className="flex items-center justify-between gap-4 border-b border-border pb-2 last:border-0 last:pb-0"
              >
                <dt className="min-w-0 truncate text-caption text-muted">{role}</dt>
                <dd className="shrink-0 text-body text-text">{sample}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel label="guardrails">
          <div className="flex flex-col gap-3">
            {GUARDRAILS.map(([rule, ok, bad]) => (
              <div
                key={rule}
                className="flex flex-col gap-1.5 border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <Prose className="text-[12px] text-muted">{rule}</Prose>
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone="success">correct</Chip>
                  <span className="min-w-0 text-body break-all text-text">{ok}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone="danger">wrong</Chip>
                  <span className="min-w-0 text-body break-all text-faint line-through">{bad}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------------ tokens */

const CANVAS = [
  ['bg', 'bg-bg'],
  ['surface', 'bg-surface'],
  ['surface_raised', 'bg-surface-raised'],
  ['surface_hover', 'bg-surface-hover'],
  ['border', 'bg-border'],
  ['border_strong', 'bg-border-strong'],
  ['text', 'bg-text'],
  ['muted', 'bg-muted'],
  ['faint', 'bg-faint'],
] as const

const BRAND = [
  ['primary', 'bg-primary'],
  ['primary_solid', 'bg-primary-solid'],
  ['primary_press', 'bg-primary-press'],
  ['primary_ink', 'bg-primary-ink'],
  ['cyan', 'bg-cyan'],
  ['deep', 'bg-deep'],
  ['success', 'bg-success'],
  ['warning', 'bg-warning'],
  ['danger', 'bg-danger'],
  ['violet', 'bg-violet'],
  ['neutral_chip', 'bg-neutral-chip'],
] as const

const CHARTS = [
  ['chart_1', 'bg-chart-1'],
  ['chart_2', 'bg-chart-2'],
  ['chart_3', 'bg-chart-3'],
  ['chart_4', 'bg-chart-4'],
  ['chart_5', 'bg-chart-5'],
] as const

function TokenSection() {
  return (
    <Section label="colour_tokens" note="§3.1 · every hex lives in globals.css">
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel label="canvas and ink">
          <Swatches items={CANVAS} />
        </Panel>
        <Panel label="brand and status">
          <Swatches items={BRAND} />
        </Panel>
        <Panel label="chart ramp">
          <Swatches items={CHARTS} />
          <Prose className="text-[12px] text-muted">
            Not the raw chip hues: these are per-theme steps validated for lightness, chroma,
            colour-vision separation and contrast against both surfaces.
          </Prose>
        </Panel>
      </div>
      <Panel label="gradient">
        <div className="h-14 w-full rounded-lg bg-fetch-gradient shadow-fetch-glow" />
        <Prose className="text-[12px] text-muted">
          Five allowed uses only: the logo mark, StatTile icon squares, the dashboard promo card,
          the active nav hairline, and the import CTA. Glow on hover, never at rest.
        </Prose>
      </Panel>
    </Section>
  )
}

function Swatches({ items }: { items: readonly (readonly [string, string])[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(([name, cls]) => (
        <div key={name} className="w-[104px]">
          <div className={cn('h-10 rounded-sm border border-border', cls)} />
          <div className="mt-1 truncate text-caption text-faint">{name}</div>
        </div>
      ))}
    </div>
  )
}

/* ----------------------------------------------------------------- buttons */

function ButtonSection() {
  return (
    <Section label="buttons" note="mono 600 · 12px · UPPER_SNAKE · → on the forward action">
      <Panel label="variants">
        <Row>
          <Button variant="gradient" label="Import CSV" forward />
          <Button label="Refresh" />
          <Button variant="secondary" label="Export" />
          <Button variant="ghost" label="Actions" />
          <Button variant="warning" label="Relogin" />
          <Button variant="danger" label="Delete accounts" count={4} />
          <Button variant="link" label="View tickets" />
        </Row>
      </Panel>
      <Panel label="sizes and states">
        <Row>
          <Button size="sm" label="Small" />
          <Button label="Default" />
          <Button size="lg" label="Large" />
          <Button size="icon" aria-label="Refresh">
            <RefreshCw className="size-4" />
          </Button>
          <Button label="With icon">
            <Upload className="size-4" />
          </Button>
        </Row>
        <Row>
          <Button label="Disabled" disabled />
          <Button variant="secondary" label="Disabled" disabled />
          <Button variant="danger" label="Disabled" disabled />
          <Button variant="gradient" label="Disabled" forward disabled />
        </Row>
      </Panel>

      <Panel label="as child — a link that looks like a button">
        <div id="aschild-demo" className="flex flex-wrap items-center gap-3">
          {/* Regression case: Button renders up to three children, and Radix Slot
              accepts exactly one, so this used to throw. Slottable fixes it — the
              output must be a single <a> carrying the button classes. */}
          {/* The label supplies the text, so the slotted element carries only an
              icon — passing both would render the caption twice. */}
          <Button asChild variant="gradient" label="Import CSV" forward>
            <Link href="/accounts/import">
              <Upload className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="secondary" label="View accounts">
            <Link href="/accounts">
              <Users className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="link" label="Read the contract">
            <a href="https://example.com/docs" rel="noreferrer">
              <Link2 className="size-4" />
            </a>
          </Button>
        </div>
        <Prose className="text-[12px] text-muted">
          Each of these is one anchor element, not a button wrapping a link, so it is keyboard- and
          middle-click-navigable like any other link.
        </Prose>
      </Panel>
    </Section>
  )
}

/* ------------------------------------------------------------------- chips */

function ChipSection() {
  return (
    <Section label="status_chips" note="§3.5 recipe · one class set, both themes">
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel label="listing statuses">
          <Row>
            {LISTING_STATUSES.map((s) => (
              <StatusChip key={s} status={s} kind="listing" />
            ))}
          </Row>
        </Panel>
        <Panel label="account statuses">
          <Row>
            {ACCOUNT_STATUSES.map((s) => (
              <StatusChip key={s} status={s} kind="account" />
            ))}
          </Row>
        </Panel>
      </div>
      <Panel label="tones and domain flags">
        <Row>
          <Chip tone="success">MONEY_IN</Chip>
          <Chip tone="warning">EXPIRING</Chip>
          <Chip tone="danger">NO_VIAGOGO</Chip>
          <Chip tone="violet">NORTH_BANK_21</Chip>
          <Chip tone="neutral">INACTIVE</Chip>
          <Chip tone="primary">MW 5</Chip>
          <Chip tone="danger" outline>
            UNDELIVERABLE
          </Chip>
        </Row>
        <Prose className="text-[12px] text-muted">
          Every status chip carries a plain-English tooltip on hover or focus, so a flag never has
          to be decoded from its colour alone.
        </Prose>
      </Panel>
    </Section>
  )
}

/* ------------------------------------------------------------------ domain */

function DomainSection() {
  return (
    <Section label="domain_badges" note="names render verbatim — never snake_cased">
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel label="clubs">
          <Row>
            {CLUBS.slice(0, 8).map((c) => (
              <ClubBadge key={c.id} club={c.id} />
            ))}
          </Row>
          <Row>
            <ClubBadge club="man-utd" variant="full" size="lg" />
            <ClubBadge club="tottenham" variant="crest-only" size="lg" />
          </Row>
        </Panel>
        <Panel label="marketplaces and providers">
          <Row>
            {PLATFORMS.map((p) => (
              <PlatformBadge key={p.id} platform={p.id} />
            ))}
          </Row>
          <Row>
            {PROVIDERS.map((p) => (
              <ProviderBadge key={p.id} provider={p.id} />
            ))}
          </Row>
        </Panel>
      </div>
      <Panel label="fixture identity">
        <div className="flex flex-col gap-4">
          {DEMO_FIXTURES.slice(0, 3).map((f) => (
            <FixtureIdentity
              key={f.id}
              homeClub={f.homeClub}
              awayClub={f.awayClub}
              competition={f.competition}
              matchweek={f.matchweek}
              size="lg"
            />
          ))}
        </div>
      </Panel>

      <Panel label="account picker — searchable, shared by two screens">
        <AccountPickerDemo />
        <Prose className="text-[12px] text-muted">
          A plain Select cannot do this job: sixty-four accounts are all name@domain, so the list is
          unscannable without a filter. Lives in components/domain/ because /mytickets and
          /mylistings both use it.
        </Prose>
      </Panel>
    </Section>
  )
}

function AccountPickerDemo() {
  const [account, setAccount] = React.useState(ALL)
  return (
    <Row>
      <AccountPicker value={account} onChange={setAccount} />
      <span className="text-caption text-faint">
        selected: {account === ALL ? 'all accounts' : account}
      </span>
    </Row>
  )
}

/* --------------------------------------------------------------- stat tiles */

function StatTileSection() {
  return (
    <Section label="stat_tiles" note="privacy eye above blurs every value on the page">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatTile icon={PoundSterling} label="Total resale revenue" delta={0.124}>
          <Money amount={4821000} currency="GBP" compact />
        </StatTile>
        <StatTile icon={Ticket} label="Tickets sold" delta={-0.043}>
          <Num value={312} />
        </StatTile>
        <StatTile icon={Users} label="Accounts healthy">
          <Num value={51} />
        </StatTile>
      </div>
    </Section>
  )
}

/* ---------------------------------------------------------------- formatters */

function FormatSection() {
  return (
    <Section label="money_and_time" note="§9 rule 6 · one date formatter, one number formatter">
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel label="money — integer minor units, never a float">
          <dl className="flex flex-col gap-2">
            <Pair k="4821000 GBP">
              <Money amount={4821000} currency="GBP" />
            </Pair>
            <Pair k="24500 GBP">
              <Money amount={24500} currency="GBP" />
            </Pair>
            <Pair k="18900 EUR → display GBP">
              <Money amount={18900} currency="EUR" />
            </Pair>
            <Pair k="18900 EUR, original">
              <Money amount={18900} currency="EUR" original />
            </Pair>
            <Pair k="compact">
              <Money amount={4821000} currency="GBP" compact />
            </Pair>
            <Pair k="signed delta">
              <Money amount={-31500} currency="GBP" signed />
            </Pair>
            <Pair k="number">
              <Num value={1204880} />
            </Pair>
            <Pair k="percent">
              <Percent value={0.124} />
            </Pair>
          </dl>
        </Panel>

        <Panel label="time — the seven-day ramp">
          <dl className="flex flex-col gap-2">
            {DEMO_FIXTURES.map((f) => (
              <Pair key={f.id} k={`${f.venue}`}>
                <span className="flex flex-wrap items-center gap-2">
                  <DateTime value={f.kickoff} className="text-body" />
                  <RelativeTime value={f.kickoff} ramp />
                </span>
              </Pair>
            ))}
            <Pair k="last checked, no ramp">
              <RelativeTime value={FOUR_MINUTES_AGO} />
            </Pair>
          </dl>
        </Panel>
      </div>

      <Panel label="password_cell">
        <Row>
          <PasswordCell masked="••••••••••" onReveal={async () => 'not-a-real-password'} />
          <span className="text-caption text-faint">reveal → auto re-mask after 10s</span>
        </Row>
        <Row>
          <PasswordCell masked="••••••••" />
          <span className="text-caption text-faint">
            no reveal endpoint wired — controls disabled
          </span>
        </Row>
      </Panel>
    </Section>
  )
}

function Pair({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-2 last:border-0 last:pb-0">
      <dt className="min-w-0 truncate text-caption text-muted">{k}</dt>
      <dd className="shrink-0 text-body">{children}</dd>
    </div>
  )
}

/* ------------------------------------------------------------------- menus */

const MENU_ITEMS = [
  { id: 'group', icon: Link2, label: 'Group', description: 'Create or merge a group.', count: 4 },
  {
    id: 'list',
    icon: Upload,
    label: 'List',
    description: 'Create a new listing.',
    tone: 'primary' as const,
  },
  {
    id: 'associate',
    icon: Link2,
    label: 'Associate listing',
    description: 'Link a supported listing or record one manually.',
    tone: 'success' as const,
  },
  {
    id: 'transfer',
    icon: Send,
    label: 'Transfer',
    description: 'Transfer ticket to another user.',
    tone: 'primary' as const,
  },
  {
    id: 'pdf',
    icon: Download,
    label: 'Download PDF',
    description: 'Download PDF tickets.',
    tone: 'violet' as const,
  },
  {
    id: 'share',
    icon: Share2,
    label: 'Share',
    description: 'Share tickets with a QR code.',
    tone: 'primary' as const,
  },
  {
    id: 'copy',
    icon: Copy,
    label: 'Copy credentials',
    description: 'Copy the email and password to the clipboard.',
  },
  {
    id: 'blocked',
    icon: Ban,
    label: 'Resell at face value',
    description: 'Not supported by this club.',
    disabled: true,
  },
]

function MenuSection() {
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  return (
    <Section label="actions_menu" note="icon + label + description · danger zone separated">
      <Panel>
        <Row>
          <ActionsMenu
            items={MENU_ITEMS}
            dangerItems={[
              {
                id: 'delete',
                icon: Trash2,
                label: 'Delete',
                description: 'Delete the selected tickets.',
                count: 4,
                onSelect: () => setConfirmOpen(true),
              },
            ]}
            selectionCount={4}
          />
          <ActionsMenu items={MENU_ITEMS} selectionCount={0} />
          <span className="text-caption text-faint">
            second menu is disabled — it acts on a selection and there is none
          </span>
        </Row>
        <Row>
          <Button
            variant="danger"
            label="Delete accounts"
            count={4}
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="size-4" />
          </Button>
          <span className="text-caption text-faint">opens a confirm naming the count</span>
        </Row>
      </Panel>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        verb="Delete"
        count={4}
        noun="account"
        description="Their sessions, proxies and purchase history will be removed. This cannot be undone."
        onConfirm={() => setConfirmOpen(false)}
      />
    </Section>
  )
}

/* ---------------------------------------------------------------- controls */

function ControlSection() {
  const [query, setQuery] = React.useState('')
  const [club, setClub] = React.useState(ALL)
  const [status, setStatus] = React.useState(ALL)
  const [density, setDensity] = React.useState<Density>('comfortable')
  const [pageSize, setPageSize] = React.useState(25)
  const [selected, setSelected] = React.useState(4)

  return (
    <Section label="toolbar_and_filters" note="§9 rule 1 · wraps, never scrolls sideways">
      <Panel label="toolbar at full width">
        <Toolbar
          search={
            <ToolbarSearch
              value={query}
              onChange={setQuery}
              placeholder="Search by email, name or membership ID"
            />
          }
          filters={
            <>
              <FilterSelect
                value={club}
                onChange={setClub}
                noun="clubs"
                options={CLUBS.slice(0, 6).map((c) => ({ value: c.id, label: c.name }))}
              />
              <FilterSelect
                value={status}
                onChange={setStatus}
                noun="statuses"
                options={ACCOUNT_STATUSES.map((s) => ({ value: s, label: snake(s) }))}
              />
              <FilterSelect
                value={ALL}
                onChange={() => {}}
                noun="tags"
                options={[{ value: 'priority', label: 'priority' }]}
              />
            </>
          }
          actions={
            <>
              <ViewOptionsPopover
                density={density}
                onDensityChange={setDensity}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                columns={[
                  { id: 'account', label: 'Account', visible: true, canHide: false },
                  { id: 'club', label: 'Club', visible: true, canHide: true },
                  { id: 'membership', label: 'Membership', visible: true, canHide: true },
                  { id: 'loyalty', label: 'Loyalty', visible: false, canHide: true },
                  { id: 'proxy', label: 'Proxy', visible: false, canHide: true },
                ]}
                onColumnToggle={() => {}}
              />
              <Button variant="secondary" label="Check all" />
              <Button label="Add account" />
              <Button variant="gradient" label="Import" forward />
              <Button variant="secondary" label="Export" />
            </>
          }
        />
      </Panel>

      <Panel label="toolbar constrained to 640px — proves the wrap">
        <div className="max-w-[640px]">
          <Toolbar
            search={
              <ToolbarSearch value={query} onChange={setQuery} placeholder="Search fixtures" />
            }
            filters={
              <>
                <FilterSelect value={ALL} onChange={() => {}} noun="clubs" options={[]} />
                <FilterSelect value={ALL} onChange={() => {}} noun="competitions" options={[]} />
              </>
            }
            actions={
              <>
                <Button label="Refresh" />
                <Button variant="gradient" label="Import" forward />
                <Button variant="secondary" label="Export" />
              </>
            }
          />
        </div>
      </Panel>

      <Panel label="bulk_action_bar">
        <BulkActionBar count={selected} noun="account" onClear={() => setSelected(0)}>
          <Button variant="secondary" size="sm" label="Check status" />
          <Button variant="secondary" size="sm" label="Assign proxy" />
          <Button variant="secondary" size="sm" label="Add tag" />
          <Button variant="danger" size="sm" label="Delete" count={selected || undefined} />
        </BulkActionBar>
        {selected === 0 && (
          <Row>
            <span className="text-caption text-faint">
              cleared — the bar renders nothing at zero
            </span>
            <Button variant="secondary" size="sm" label="Restore" onClick={() => setSelected(4)} />
          </Row>
        )}
      </Panel>
    </Section>
  )
}

/* ------------------------------------------------------------------ states */

function StateSection() {
  return (
    <Section label="states" note="§11 · every list has four designed states">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <EmptyState
            icon={Ticket}
            title="No accounts yet"
            body="Import a CSV of your club accounts, or add one by hand. Fetch.io will keep their sessions alive."
            action={<Button variant="gradient" label="Import CSV" forward />}
            secondaryAction={<Button variant="secondary" label="Add manually" />}
          />
        </div>
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <ErrorState
            message="The accounts service did not respond. Your data is safe — nothing was changed."
            onRetry={() => {}}
          />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <SkeletonTable rows={5} columns={6} />
        </div>
        <SkeletonCard />
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------------ tables */

/**
 * Typed against the real `Account` resource from lib/types.ts — this table is fed by
 * the live API, not by demo data.
 */
const ACCOUNT_COLUMNS: FetchColumnDef<Account>[] = [
  {
    id: 'account',
    accessorKey: 'email',
    header: 'account',
    enableHiding: false,
    cell: ({ row }) => (
      <div className="min-w-0">
        <div className="truncate text-text">{row.original.email}</div>
        <div className="truncate text-caption text-faint">
          {[row.original.firstName, row.original.lastName].filter(Boolean).join(' ')}
        </div>
      </div>
    ),
  },
  {
    id: 'club',
    accessorKey: 'club',
    header: 'club',
    cell: ({ row }) => <ClubBadge club={row.original.club} />,
  },
  {
    id: 'membership',
    accessorKey: 'membershipId',
    header: 'membership_id',
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <Chip tone="neutral">{upperSnake(row.original.membershipType)}</Chip>
        <span className="text-caption text-muted">{row.original.membershipId}</span>
      </div>
    ),
  },
  {
    id: 'loyalty',
    accessorKey: 'loyaltyPoints',
    header: 'loyalty',
    cell: ({ row }) => <Num value={row.original.loyaltyPoints ?? 0} className="font-semibold" />,
  },
  {
    id: 'tickets',
    accessorKey: 'ticketsPurchased',
    header: 'tickets',
    cell: ({ row }) => <Num value={row.original.ticketsPurchased} className="font-semibold" />,
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: 'status',
    cell: ({ row }) => <StatusChip status={row.original.status} kind="account" />,
  },
  {
    id: 'proxy',
    accessorKey: 'proxyId',
    header: 'proxy',
    cell: ({ row }) => <span className="text-muted">{row.original.proxyId ?? '—'}</span>,
  },
  {
    id: 'lastCheck',
    accessorKey: 'lastCheckedAt',
    header: 'last_check',
    cell: ({ row }) =>
      row.original.lastCheckedAt ? <RelativeTime value={row.original.lastCheckedAt} /> : null,
  },
  {
    id: 'password',
    accessorKey: 'passwordMasked',
    header: 'password',
    enableSorting: false,
    cell: ({ row }) => <LivePasswordCell account={row.original} />,
  },
]

const FIXTURE_COLUMNS: FetchColumnDef<DemoFixture>[] = [
  {
    id: 'fixture',
    accessorKey: 'id',
    header: 'fixture',
    enableHiding: false,
    cell: ({ row }) => (
      <FixtureIdentity
        homeClub={row.original.homeClub}
        awayClub={row.original.awayClub}
        competition={row.original.competition}
        matchweek={row.original.matchweek}
      />
    ),
  },
  {
    id: 'kickoff',
    accessorKey: 'kickoff',
    header: 'kickoff',
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5">
        <DateTime value={row.original.kickoff} />
        <RelativeTime value={row.original.kickoff} ramp className="text-caption" />
      </div>
    ),
  },
  {
    id: 'venue',
    accessorKey: 'venue',
    header: 'venue',
    cell: ({ row }) => (
      <div className="min-w-0">
        <div className="truncate">{row.original.venue}</div>
        <div className="truncate text-caption text-faint">{row.original.city}</div>
      </div>
    ),
  },
  {
    id: 'total',
    accessorKey: 'total',
    header: 'total',
    cell: ({ row }) => (
      <Num value={row.original.total} className="font-semibold text-primary-ink" />
    ),
  },
  {
    id: 'listed',
    accessorKey: 'listed',
    header: 'listed',
    cell: ({ row }) => (
      <Num value={row.original.listed} className="font-semibold text-success-ink" />
    ),
  },
  {
    id: 'sold',
    accessorKey: 'sold',
    header: 'sold',
    cell: ({ row }) => <Num value={row.original.sold} className="font-semibold text-violet-ink" />,
  },
  {
    id: 'valueAtRisk',
    accessorKey: 'valueAtRisk',
    header: 'value_at_risk',
    cell: ({ row }) => (
      <Money
        amount={row.original.valueAtRisk}
        currency={row.original.currency}
        className="font-semibold"
      />
    ),
  },
]

/**
 * The live table. Fed by `useAccountsTable` against /api/v1/accounts — this is the
 * end-to-end proof that loading → populated → error → retry all work, and it is the
 * regression check for every part after this one.
 */
function TableSection() {
  const [selection, setSelection] = React.useState<RowSelectionState>({})
  const [forceFailure, setForceFailure] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [club, setClub] = React.useState(ALL)

  const selectedCount = Object.values(selection).filter(Boolean).length

  // Memoised: the filters object is part of the query key, so a fresh object every
  // render would refetch forever.
  const filters = React.useMemo<AccountFilters>(
    () => ({
      // DataTable paginates client-side, so it is handed the whole filtered set and
      // its `Total N` footer and page count stay truthful. Server-side paging needs
      // page/pageCount props on DataTable — that lands with /accounts in Part 4.
      pageSize: 200,
      sort: 'email',
      order: 'asc',
      q: search || undefined,
      club: club === ALL ? undefined : [club as Account['club']],
      // §6.2 failure injection, so the error state is demonstrable on demand.
      ...(forceFailure ? { __fail: 500 } : {}),
    }),
    [search, club, forceFailure],
  )

  const accounts = useAccountsTable(filters)

  return (
    <Section
      label="data_table"
      note="live · /api/v1/accounts · sortable · selectable · stacked cards under md"
    >
      <Panel label="client-paged — the whole filtered set, sliced locally">
        <Row>
          <Button
            variant={forceFailure ? 'danger' : 'secondary'}
            size="sm"
            label={forceFailure ? 'Serving errors' : 'Force API failure'}
            onClick={() => setForceFailure((v) => !v)}
          />
          <span className="text-caption text-faint">
            appends <code>?__fail=500</code> to the request
          </span>
          {accounts.fetching && !accounts.loading && (
            <span className="text-caption text-primary-ink">refetching…</span>
          )}
        </Row>

        <DataTable
          data={accounts.rows}
          columns={ACCOUNT_COLUMNS}
          getRowId={(r) => r.id}
          noun="account"
          enableSelection
          selection={selection}
          onSelectionChange={setSelection}
          onRowClick={() => {}}
          defaultPageSize={5}
          loading={accounts.loading}
          error={accounts.error}
          onRetry={accounts.onRetry}
          // Mono is ~12% wider, so these two start hidden rather than crowding at 1280px.
          initiallyHidden={['proxy', 'tickets']}
          toolbar={
            <div className="flex flex-col gap-3">
              <Toolbar
                search={
                  <ToolbarSearch
                    value={search}
                    onChange={setSearch}
                    placeholder="Search by email, name or membership ID"
                  />
                }
                filters={
                  <FilterSelect
                    value={club}
                    onChange={setClub}
                    noun="clubs"
                    options={CLUBS.map((c) => ({ value: c.id, label: c.name }))}
                  />
                }
              />
              <BulkActionBar count={selectedCount} noun="account" onClear={() => setSelection({})}>
                <Button variant="secondary" size="sm" label="Check status" />
                <Button variant="danger" size="sm" label="Delete" count={selectedCount} />
              </BulkActionBar>
            </div>
          }
          toolbarActions={<Button variant="secondary" label="Export" />}
          empty={
            <EmptyState
              icon={Users}
              title="No accounts match"
              body="No account matches that search and club combination. Clear the filters to see them all."
            />
          }
        />
        <span className="text-caption text-faint">
          server reports {accounts.total} matching accounts
        </span>
      </Panel>

      <ServerPagedPanel />

      <MutationPanel />

      <Panel label="fixture table — value at risk and the countdown ramp">
        <DataTable
          data={DEMO_FIXTURES}
          columns={FIXTURE_COLUMNS}
          getRowId={(r) => r.id}
          noun="fixture"
          onRowClick={() => {}}
          defaultPageSize={10}
          defaultDensity="compact"
        />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel label="loading">
          <DataTable
            data={[]}
            columns={FIXTURE_COLUMNS}
            getRowId={(r) => r.id}
            noun="fixture"
            loading
          />
        </Panel>
        <Panel label="error">
          <DataTable
            data={[]}
            columns={FIXTURE_COLUMNS}
            getRowId={(r) => r.id}
            noun="fixture"
            error="The fixtures service did not respond. Your data is safe — nothing was changed."
            onRetry={() => {}}
          />
        </Panel>
      </div>

      <Panel label="empty">
        <DataTable
          data={[]}
          columns={FIXTURE_COLUMNS}
          getRowId={(r) => r.id}
          noun="fixture"
          empty={
            <EmptyState
              icon={Ticket}
              title="No fixtures yet"
              body="Once your accounts buy allocations, every fixture you hold tickets for will appear here."
              action={<Button variant="gradient" label="Import CSV" forward />}
              glyph="braces"
            />
          }
        />
      </Panel>
    </Section>
  )
}

/**
 * The server-paged twin of the table above. Same component, same columns; the only
 * difference is that `pageCount` / `totalRows` / `page` are supplied, which puts
 * DataTable into manual mode: it stops slicing and asks the caller for each page.
 *
 * pageSize 5 against 64 seeded accounts, so the footer must read
 * `Total 64 accounts · 1 / 13`.
 */
function ServerPagedPanel() {
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(5)
  const [selection, setSelection] = React.useState<RowSelectionState>({})

  const filters = React.useMemo<AccountFilters>(
    () => ({ page, pageSize, sort: 'email', order: 'asc' }),
    [page, pageSize],
  )
  const accounts = useAccountsTable(filters)
  const meta = accounts.query.data?.meta ?? null
  const selectedCount = Object.values(selection).filter(Boolean).length

  return (
    <Panel label="server-paged — one page at a time, meta drives the footer">
      <Row>
        <span className="text-caption text-faint">
          GET /api/v1/accounts?page={page}&amp;pageSize={pageSize} · meta.total {meta?.total ?? '—'}{' '}
          · meta.totalPages {meta?.totalPages ?? '—'}
        </span>
      </Row>

      <DataTable
        data={accounts.rows}
        columns={ACCOUNT_COLUMNS}
        getRowId={(r) => r.id}
        noun="account"
        enableSelection
        selection={selection}
        onSelectionChange={setSelection}
        loading={accounts.loading}
        error={accounts.error}
        onRetry={accounts.onRetry}
        initiallyHidden={['proxy', 'tickets', 'loyalty']}
        // These four are what switch the table into manual mode.
        pageCount={meta?.totalPages}
        totalRows={meta?.total}
        page={page}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        defaultPageSize={5}
        toolbar={
          <BulkActionBar
            count={selectedCount}
            noun="account"
            pageScoped
            onClear={() => setSelection({})}
          >
            <Button variant="secondary" size="sm" label="Check status" />
            <Button variant="danger" size="sm" label="Delete" count={selectedCount} />
          </BulkActionBar>
        }
        empty={<EmptyState icon={Users} title="No accounts" body="Nothing on this page." />}
      />
    </Panel>
  )
}

/**
 * PasswordCell against the real endpoint. A component rather than an inline closure
 * because `useRevealPassword` is a hook and a cell renderer is not a component body.
 *
 * The revealed value is returned straight to the cell and never enters the query
 * cache — a secret that outlives its ten-second window is a leak.
 */
function LivePasswordCell({ account }: { account: Account }) {
  const revealFor = useRevealPassword()
  return <PasswordCell masked={account.passwordMasked} onReveal={revealFor(account.id)} />
}

/**
 * The optimistic-mutation proof (§6.4). Bumping a price updates the cell instantly
 * and toasts; with failures forced, the same click rolls the price back visibly and
 * toasts the error instead.
 */
function MutationPanel() {
  const [forceFailure, setForceFailure] = React.useState(false)
  const filters = React.useMemo<ListingFilters>(
    () => ({ pageSize: 4, sort: 'price', order: 'desc' }),
    [],
  )
  const listings = useListingsTable(filters)
  const updateListing = useUpdateListing()

  return (
    <Panel label="optimistic mutation — PATCH /listings/:id">
      <Row>
        <Button
          variant={forceFailure ? 'danger' : 'secondary'}
          size="sm"
          label={forceFailure ? 'Writes will fail' : 'Force write failure'}
          onClick={() => setForceFailure((v) => !v)}
        />
        <span className="text-caption text-faint">
          {forceFailure
            ? 'the price moves, then rolls back when the server rejects it'
            : 'the price moves immediately, then the server confirms'}
        </span>
      </Row>

      {listings.error ? (
        <ErrorState message={listings.error} onRetry={listings.onRetry} />
      ) : listings.loading ? (
        <SkeletonTable rows={4} columns={4} />
      ) : (
        <div className="flex flex-col gap-2">
          {listings.rows.map((l) => (
            <div
              key={l.id}
              className="flex flex-wrap items-center gap-3 border-b border-border pb-2 last:border-0 last:pb-0"
            >
              <PlatformBadge platform={l.platform} />
              <span className="min-w-0 flex-1 truncate text-body">{l.fixtureName}</span>
              <span className="text-caption text-muted">{l.block}</span>
              <Money amount={l.price} currency={l.currency} className="font-semibold" />
              <StatusChip status={l.status} kind="listing" />
              <Button
                size="sm"
                variant="secondary"
                label="Raise £5"
                disabled={updateListing.isPending}
                onClick={() =>
                  updateListing.mutate({
                    id: l.id,
                    patch: { price: l.price + 500 },
                    forceFailure,
                  })
                }
              />
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}

/* ------------------------------------------------------------------ charts */

function ChartSection() {
  return (
    <Section label="charts" note="one theme object · reads the CSS variables at runtime">
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <BarChart
            label="revenue_by_month"
            data={DEMO_REVENUE}
            xKey="month"
            series={[{ key: 'revenue', name: 'Revenue' }]}
            kind="money"
            currency="GBP"
          />
        </Panel>
        <Panel>
          <LineChart
            label="listed_vs_sold"
            data={DEMO_REVENUE}
            xKey="month"
            series={[
              { key: 'listed', name: 'Listed' },
              { key: 'sold', name: 'Sold' },
            ]}
          />
        </Panel>
      </div>
      <Panel label="sparklines — one per chart slot">
        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-5">
          {[0, 1, 2, 3, 4].map((slot) => (
            <div key={slot} className="flex flex-col gap-1">
              <span className="text-caption text-faint">chart_{slot + 1}</span>
              <Sparkline data={DEMO_SPARK} slot={slot} />
            </div>
          ))}
        </div>
      </Panel>
      <Panel label="stat tile with a trend">
        <div className="grid gap-4 md:grid-cols-2">
          <StatTile icon={TrendingUp} label="September revenue" delta={0.312}>
            <Money amount={4821000} currency="GBP" compact />
          </StatTile>
          <div className="flex flex-col justify-center gap-2 rounded-lg border border-border bg-surface p-6">
            <SectionLabel>listings_live</SectionLabel>
            <Sparkline data={DEMO_SPARK} slot={1} height={48} />
          </div>
        </div>
      </Panel>
      <Panel label="listings — mixed currencies through the normaliser">
        <div className="grid gap-2">
          {DEMO_LISTINGS.map((l) => (
            <div
              key={l.id}
              className="flex flex-wrap items-center gap-3 border-b border-border pb-2 last:border-0 last:pb-0"
            >
              <PlatformBadge platform={l.platform} />
              <span className="min-w-0 flex-1 truncate text-body">{l.fixture}</span>
              <span className="text-caption text-muted">{l.block}</span>
              <Money amount={l.price} currency={l.currency} className="font-semibold" />
              <StatusChip status={l.status} kind="listing" />
            </div>
          ))}
        </div>
      </Panel>
    </Section>
  )
}
