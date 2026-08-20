'use client'

import { cn } from '@/lib/utils'
import type { Fixture } from '@/lib/types'
import type { FetchColumnDef } from '@/components/data/DataTable'
import { FixtureIdentity } from '@/components/domain/FixtureIdentity'
import { Chip } from '@/components/domain/StatusChip'
import { Num } from '@/components/domain/Money'
import { COMPETITION_LABEL } from '@/lib/registries/providers'
import { KickoffCell } from './KickoffCell'
import { SORTABLE_COLUMN_IDS } from './sorting'
import { ValueAtRisk } from './ValueAtRisk'

/**
 * The §8.4 columns, in order.
 *
 * `competition` and `venue` ship hidden. Mono runs ~12% wider than a proportional face,
 * so nine columns do not fit at 1280px (§9 rule 3) — and both of these repeat something
 * the row already says. `FixtureIdentity` carries the competition chip in the first
 * cell, and it names the home club, which IS the ground: Arsenal v Chelsea is at the
 * Emirates whether or not a column says so. The city is the part that cannot be
 * inferred, and it matters when scanning for travel, which is what the filters are for.
 *
 * Both are one click away in the view options. Hiding a duplicate is the sanctioned fix;
 * shrinking the type is not.
 *
 * `meta.sortable` is stamped from the sort registry rather than written per column,
 * so a header is clickable exactly when the API can order by that field. FIXTURE and
 * COMPETITION have no entry, so they render as plain header text and emit nothing.
 */
export const FIXTURE_COLUMNS: FetchColumnDef<Fixture>[] = (
  [
    {
      id: 'fixture',
      accessorKey: 'homeClub',
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
      cell: ({ row }) => <KickoffCell value={row.original.kickoff} />,
    },
    {
      id: 'venue',
      accessorKey: 'venue.name',
      header: 'venue',
      cell: ({ row }) => (
        <div className="max-w-[200px] min-w-0">
          <div className="truncate">{row.original.venue.name}</div>
          <div className="truncate text-caption text-faint">{row.original.venue.city}</div>
        </div>
      ),
    },
    {
      id: 'competition',
      accessorKey: 'competition',
      header: 'competition',
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted">
          {COMPETITION_LABEL[row.original.competition]}
        </span>
      ),
    },
    {
      id: 'total',
      accessorKey: 'counts.total',
      header: 'total',
      cell: ({ row }) => (
        <Num value={row.original.counts.total} className="font-semibold text-primary-ink" />
      ),
    },
    {
      id: 'listed',
      accessorKey: 'counts.listed',
      header: 'listed',
      cell: ({ row }) => <Count value={row.original.counts.listed} tone="text-success-ink" />,
    },
    {
      id: 'sold',
      accessorKey: 'counts.sold',
      header: 'sold',
      cell: ({ row }) => <Count value={row.original.counts.sold} tone="text-violet-ink" />,
    },
    {
      id: 'transferred',
      accessorKey: 'counts.transferred',
      header: 'transferred',
      cell: ({ row }) =>
        row.original.counts.transferred > 0 ? (
          // The §8.4 ring-chip: transferred stock has left the building, so it reads as
          // an outline rather than another solid count.
          <Chip tone="warning" className="bg-transparent ring-1 ring-warning/25 ring-inset">
            <Num value={row.original.counts.transferred} />
          </Chip>
        ) : (
          <span className="text-faint tabular-nums">0</span>
        ),
    },
    {
      id: 'valueAtRisk',
      accessorKey: 'valueAtRisk',
      header: 'value_at_risk',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <ValueAtRisk fixture={row.original} />
        </div>
      ),
    },
  ] as FetchColumnDef<Fixture>[]
).map((column) => ({
  ...column,
  meta: { ...column.meta, sortable: SORTABLE_COLUMN_IDS.has(column.id ?? '') },
}))

/** Column ids hidden on first render — see the note above. */
export const INITIALLY_HIDDEN = ['competition', 'venue']

function Count({ value, tone }: { value: number; tone: string }) {
  return <Num value={value} className={cn('font-semibold', value === 0 ? 'text-faint' : tone)} />
}
