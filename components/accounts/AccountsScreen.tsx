'use client'

import * as React from 'react'

import { snake } from '@/lib/format/text'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AccountsTab } from './AccountsTab'
import { ProxiesTab } from './ProxiesTab'
import { ImapComingSoon, OtpComingSoon } from './AccountsEmpty'
import { ACCOUNT_TABS, useAccountsUrlState, type AccountsTabId } from './url-state'

/**
 * Level 1 of the account manager (§8.2): `Accounts · Proxies · Email / IMAP ·
 * OTP Inbox`.
 *
 * The tab is in the query string like every other piece of view state, so
 * `/accounts?tab=proxies` is a link a colleague can open. The strip is an underline
 * rail rather than the primitive's default pill group — level-1 tabs are navigation,
 * and navigation in this product is `lower_snake_case` (§3.3b).
 *
 * Each panel mounts only when selected: three tables' worth of queries firing on a
 * screen the operator opens to check one thing is exactly the kind of waste that
 * makes an on-sale morning slower.
 */
export function AccountsScreen() {
  const { tab, set } = useAccountsUrlState()

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => set({ tab: value as AccountsTabId })}
      className="w-full"
    >
      <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-border bg-transparent p-0 text-muted">
        {ACCOUNT_TABS.map(({ id, label }) => (
          <TabsTrigger
            key={id}
            value={id}
            className="rounded-none border-b-2 border-transparent px-3 py-2.5 font-mono text-nav whitespace-nowrap text-muted shadow-none transition-colors duration-150 hover:text-text data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-text data-[state=active]:shadow-none"
          >
            {snake(label)}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="accounts" className="mt-6">
        <AccountsTab />
      </TabsContent>

      <TabsContent value="proxies" className="mt-6">
        <ProxiesTab />
      </TabsContent>

      <TabsContent value="imap" className="mt-6">
        <div className="rounded-lg border border-border bg-surface">
          <ImapComingSoon />
        </div>
      </TabsContent>

      <TabsContent value="otp" className="mt-6">
        <div className="rounded-lg border border-border bg-surface">
          <OtpComingSoon />
        </div>
      </TabsContent>
    </Tabs>
  )
}
