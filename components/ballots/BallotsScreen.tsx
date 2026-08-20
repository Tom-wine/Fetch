'use client'

import * as React from 'react'

import { snake } from '@/lib/format/text'
import { useOverflowFade } from '@/lib/use-overflow-fade'
import { PageHeader } from '@/components/shell/PageHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAccounts } from '@/lib/api/hooks/useAccounts'
import { BALLOT_CLUB_IDS, type Account } from '@/lib/types'

import { PoolTab } from './PoolTab'
import { ProfilesTab } from './ProfilesTab'
import { RunsTab } from './RunsTab'
import { StartRunDialog } from './StartRunDialog'
import { BALLOT_TABS, useBallotsUrlState, type BallotsTabId } from './url-state'

/**
 * §B5 — `// pool · // profiles · // runs`.
 *
 * The tab is in the query string like everything else on this screen, so
 * `/ballots?tab=runs&runStatus=RUNNING` is a link a colleague can open during an
 * on-sale and land on exactly the view being talked about.
 *
 * Each panel mounts only when selected. That matters more here than on /accounts:
 * the pool tab reads the whole account list to build its duplicate check, and firing
 * that on a screen someone opened to check a profile is the kind of waste that makes
 * an on-sale morning slower.
 *
 * The launcher lives at this level rather than inside a tab, because §B5.1 and §B5.3
 * both open it and it carries a selection made on one tab into a dialog the other can
 * also raise.
 */
export function BallotsScreen() {
  const fade = useOverflowFade<HTMLDivElement>()
  const state = useBallotsUrlState()

  /** Non-null while the launcher is open. The array is the pre-chosen selection. */
  const [launching, setLaunching] = React.useState<{ accounts: Account[] | null } | null>(null)

  /**
   * Whether the pool has anything in it at all — what disables START_RUN before the
   * launcher can be opened on an empty pool and have nothing to say.
   *
   * One row is requested rather than a page: this needs `meta.total`, not the rows.
   */
  const poolProbe = useAccounts({ club: BALLOT_CLUB_IDS, pageSize: 1 })
  const poolTotal = poolProbe.data?.meta?.total ?? 0

  /**
   * `?start=1` opens the launcher on arrival.
   *
   * The launcher is a dialog rather than a route (§B2), so START_RUN from the dashboard
   * card, the ⌘K palette or a pasted link has to ask this screen to open it. The param
   * is consumed immediately — it describes an ARRIVAL, not a state, and leaving it in
   * the URL would reopen the dialog on every back-button press.
   */
  const { startRequested, set } = state

  // Guarded by a ref, not by the dependency list: `set` is rebuilt on every render
  // (the URL writer it closes over is a fresh object each time), so an effect that
  // opens the dialog and clears the param would re-run, re-open and re-clear until
  // React stopped it — "Maximum update depth exceeded", on arrival, from a link.
  // The ref makes it once-per-arrival, and clears itself when the param is gone so a
  // second START_RUN onto the same mounted screen still opens the launcher.
  const consumedStart = React.useRef(false)

  React.useEffect(() => {
    if (!startRequested) {
      consumedStart.current = false
      return
    }
    if (consumedStart.current) return
    consumedStart.current = true
    setLaunching({ accounts: null })
    set({ start: null })
  }, [startRequested, set])

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader title="Ballot Entries" subtitle="load_accounts_and_run_entries" />

      <Tabs
        value={state.tab}
        onValueChange={(value) => state.set({ tab: value as BallotsTabId })}
        className="w-full"
      >
        <TabsList
          ref={fade.ref}
          style={fade.style}
          data-tour="ballots-tabs"
          className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-border bg-transparent p-0 text-muted"
        >
          {BALLOT_TABS.map(({ id, label }) => (
            <TabsTrigger
              key={id}
              value={id}
              className="rounded-none border-b-2 border-transparent px-3 py-2.5 font-mono text-nav whitespace-nowrap text-muted shadow-none transition-colors duration-150 hover:text-text data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-text data-[state=active]:shadow-none"
            >
              {snake(label)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="pool" className="mt-6">
          <PoolTab state={state} onStartRun={(accounts) => setLaunching({ accounts })} />
        </TabsContent>

        <TabsContent value="profiles" className="mt-6">
          <ProfilesTab />
        </TabsContent>

        <TabsContent value="runs" className="mt-6">
          <RunsTab
            state={state}
            onStartRun={() => setLaunching({ accounts: null })}
            poolEmpty={poolTotal === 0}
          />
        </TabsContent>
      </Tabs>

      {/* Raised from both the pool tab and the run history, so it lives here rather
          than inside either one. */}
      <StartRunDialog
        open={launching !== null}
        onOpenChange={(open) => !open && setLaunching(null)}
        selection={launching?.accounts ?? null}
      />
    </div>
  )
}
