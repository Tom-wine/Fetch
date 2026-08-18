'use client'

import * as React from 'react'
import { Signal } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { DataTable, type FetchColumnDef, type SortSpec } from '@/components/data/DataTable'
import { Toolbar, ToolbarSearch } from '@/components/data/Toolbar'
import { Chip } from '@/components/domain/StatusChip'
import { PasswordCell } from '@/components/domain/PasswordCell'
import { RelativeTime } from '@/components/domain/RelativeTime'
import { useProxiesTable, useTestProxy } from '@/lib/api/hooks/useDashboard'
import type { ProxyFilters } from '@/lib/api/endpoints'
import type { Proxy, ProxyStatus } from '@/lib/types'
import { NoProxies } from './AccountsEmpty'

/**
 * The Proxies tab of the account manager (§8.2): a working read-only table with a
 * per-row `Test`.
 *
 * The proxy password uses the same <PasswordCell> as the accounts table, with no
 * `onReveal`. That is not an oversight — §6.3 has no proxy reveal endpoint, and the
 * cell's documented behaviour without one is to stay permanently masked with the
 * reveal control disabled. Better a control that says "not wired up" in its tooltip
 * than a cell that quietly prints a secret.
 *
 * Sorting is server-side through the same seam the accounts table uses. This tab is
 * paged too, so a client-side header sort would reorder one page and look like it had
 * ordered all eighteen. There is no URL state here — §8.2 asks for a shareable link on
 * the accounts view, and a read-only proxy list does not earn one — so the sort lives
 * beside this tab's search and page in local state.
 *
 * `Test` updates the row optimistically: the status chip flips to TESTING the
 * instant it is clicked, and the real verdict replaces it when POST /proxies/:id/test
 * returns. The mutation itself is the shared `useTestProxy`, so the toast and the
 * invalidation behave like every other write in the app (§6.4).
 */

/** Column id → the `?sort=` field. PASSWORD and ACTIONS hold nothing orderable. */
const SORT_FIELD: Record<string, string> = {
  proxy: 'label',
  endpoint: 'host',
  username: 'username',
  country: 'country',
  status: 'status',
  latency: 'latencyMs',
  lastTested: 'lastTestedAt',
}

/** Matches the API's default order, so the header agrees with the rows on first paint. */
const DEFAULT_SORT: SortSpec = { id: 'proxy', desc: false }

const DOT: Record<ProxyStatus, string> = {
  ok: 'bg-success',
  dead: 'bg-danger',
  untested: 'bg-neutral-chip',
}

export function ProxiesTab() {
  const [search, setSearch] = React.useState('')
  const [debounced, setDebounced] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(25)
  const [testing, setTesting] = React.useState<Set<string>>(new Set())
  const [sorting, setSorting] = React.useState<SortSpec | null>(DEFAULT_SORT)

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search)
      setPage(1)
    }, 250)
    return () => clearTimeout(timer)
  }, [search])

  const filters = React.useMemo<ProxyFilters>(
    () => ({
      page,
      pageSize,
      q: debounced || undefined,
      // Clearing the sort falls back to the endpoint's own default, which is `label`.
      sort: sorting ? SORT_FIELD[sorting.id] : undefined,
      order: sorting?.desc ? 'desc' : 'asc',
    }),
    [page, pageSize, debounced, sorting],
  )

  const proxies = useProxiesTable(filters)
  const testProxy = useTestProxy()

  const runTest = React.useCallback(
    (id: string) => {
      setTesting((current) => new Set(current).add(id))
      testProxy.mutate(
        { id },
        {
          onSettled: () =>
            setTesting((current) => {
              const next = new Set(current)
              next.delete(id)
              return next
            }),
        },
      )
    },
    [testProxy],
  )

  const columns = React.useMemo<FetchColumnDef<Proxy>[]>(
    () => makeProxyColumns({ testing, onTest: runTest }),
    [testing, runTest],
  )

  return (
    <DataTable
      data={proxies.rows}
      columns={columns}
      getRowId={(row) => row.id}
      // DataTable pluralises by appending an "s", so the noun is chosen to survive
      // it: "proxy" would render the footer as "Total 18 proxys".
      noun="proxy server"
      loading={proxies.loading}
      error={proxies.error}
      onRetry={proxies.onRetry}
      sorting={sorting}
      onSortingChange={setSorting}
      pageCount={Math.max(1, Math.ceil(proxies.total / pageSize))}
      totalRows={proxies.total}
      page={page}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
      empty={<NoProxies />}
      toolbar={
        <Toolbar
          search={
            <ToolbarSearch
              value={search}
              onChange={setSearch}
              placeholder="Search by label, host or country"
            />
          }
        />
      }
    />
  )
}

function makeProxyColumns({
  testing,
  onTest,
}: {
  testing: Set<string>
  onTest: (id: string) => void
}): FetchColumnDef<Proxy>[] {
  return [
    {
      id: 'proxy',
      accessorKey: 'label',
      header: 'proxy',
      meta: { sortable: true },
      enableHiding: false,
      cell: ({ row }) => (
        <span className="inline-flex min-w-0 items-center gap-2">
          <span
            className={cn('size-2 shrink-0 rounded-full', DOT[row.original.status])}
            aria-hidden="true"
          />
          <span className="truncate text-body text-text">{row.original.label}</span>
        </span>
      ),
    },
    {
      id: 'endpoint',
      accessorKey: 'host',
      header: 'endpoint',
      meta: { sortable: true },
      cell: ({ row }) => (
        <span className="font-mono text-body text-muted">
          {row.original.host}:{row.original.port}
        </span>
      ),
    },
    {
      id: 'username',
      accessorKey: 'username',
      header: 'username',
      meta: { sortable: true },
      cell: ({ row }) => <span className="text-body text-muted">{row.original.username}</span>,
    },
    {
      id: 'password',
      accessorKey: 'passwordMasked',
      header: 'password',
      // No onReveal: there is no proxy reveal endpoint, so the cell stays masked.
      cell: ({ row }) => <PasswordCell masked={row.original.passwordMasked} />,
    },
    {
      id: 'country',
      accessorKey: 'country',
      header: 'country',
      meta: { sortable: true },
      cell: ({ row }) => (
        <span className="text-body text-muted">{row.original.country ?? '—'}</span>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'status',
      meta: { sortable: true },
      cell: ({ row }) =>
        testing.has(row.original.id) ? (
          <Chip tone="primary">TESTING</Chip>
        ) : row.original.status === 'ok' ? (
          <Chip tone="success">OK</Chip>
        ) : row.original.status === 'dead' ? (
          <Chip tone="danger">DEAD</Chip>
        ) : (
          <Chip tone="neutral">UNTESTED</Chip>
        ),
    },
    {
      id: 'latency',
      accessorKey: 'latencyMs',
      header: 'latency',
      meta: { sortable: true },
      cell: ({ row }) =>
        row.original.latencyMs ? (
          <span className="text-body tabular-nums">{row.original.latencyMs}ms</span>
        ) : (
          <span className="text-faint">—</span>
        ),
    },
    {
      id: 'lastTested',
      accessorKey: 'lastTestedAt',
      header: 'last tested',
      meta: { sortable: true },
      cell: ({ row }) =>
        row.original.lastTestedAt ? (
          <RelativeTime value={row.original.lastTestedAt} />
        ) : (
          <span className="text-faint">never</span>
        ),
    },
    {
      id: 'actions',
      accessorKey: 'id',
      header: 'actions',
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            label="Test"
            disabled={testing.has(row.original.id)}
            onClick={() => onTest(row.original.id)}
          >
            <Signal className="size-4" aria-hidden="true" />
          </Button>
        </div>
      ),
    },
  ]
}
