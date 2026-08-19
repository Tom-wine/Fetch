'use client'

import { snake } from '@/lib/format/text'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ApiTab } from './ApiTab'
import { GeneralTab } from './GeneralTab'
import { PreferencesTab } from './PreferencesTab'
import { SubscriptionTab } from './SubscriptionTab'
import { SETTINGS_TABS, useSettingsUrlState, type SettingsTabId } from './url-state'

/**
 * /settings — four tabs, the same tab strip /accounts uses.
 *
 * Which tab is open lives in the query string rather than in local state, so
 * `/settings?tab=api` is a link someone can send. Each panel mounts only when it is
 * selected: the API tab reads localStorage on mount and the General tab seeds a draft
 * from the store, and neither should happen for a tab nobody opened.
 */
export function SettingsScreen() {
  const { tab, setTab } = useSettingsUrlState()

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as SettingsTabId)} className="w-full">
      <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-border bg-transparent p-0 text-muted">
        {SETTINGS_TABS.map(({ id, label }) => (
          <TabsTrigger
            key={id}
            value={id}
            className="rounded-none border-b-2 border-transparent px-3 py-2.5 font-mono text-nav whitespace-nowrap text-muted shadow-none transition-colors duration-150 hover:text-text data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-text data-[state=active]:shadow-none"
          >
            {snake(label)}
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="mt-6 max-w-[900px]">
        <TabsContent value="general">
          <GeneralTab />
        </TabsContent>

        <TabsContent value="preferences">
          <PreferencesTab />
        </TabsContent>

        <TabsContent value="subscription">
          <SubscriptionTab />
        </TabsContent>

        <TabsContent value="api">
          <ApiTab />
        </TabsContent>
      </div>
    </Tabs>
  )
}
