'use client'

import { cn } from '@/lib/utils'
import type { Fixture } from '@/lib/types'
import type { FetchColumnDef } from '@/components/data/DataTable'
import { FixtureIdentity } from '@/components/domain/FixtureIdentity'
import { Chip } from '@/components/domain/StatusChip'
import { Num } from '@/components/domain/Money'
import { COMPETITION_LABEL } from '@/lib/registries/providers'
import { KickoffCell } from './KickoffCell'
import { ValueAtRisk } from './ValueAtRisk'

/**
 * The §8.4 columns, in order.
 *
 * `competition` ships hidden: `FixtureIdentity` already carries the competition chip
 * in the first cell, and mono runs ~12% wider than a proportional face, so nine
 * columns do not fit at 1280px (§9 rule 3). It is one click away in the view
 * options — hiding a duplicate is the sanctioned fix, shrinking the type is not.
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
)
  // Header sorting is off on every column: DataTable sorts the rows it holds, and
  // under server paging that is one page pretending to be the whole list. The
  // toolbar's `Sort ▾` drives `sort` / `order` on the API instead — same call
  // session-a made on /accounts.
  .map((column) => ({ ...column, enableSorting: false }))

/** Column ids hidden on first render — see the note above. */
export const INITIALLY_HIDDEN = ['competition']

function Count({ value, tone }: { value: number; tone: string }) {
  return <Num value={value} className={cn('font-semibold', value === 0 ? 'text-faint' : tone)} />
}
