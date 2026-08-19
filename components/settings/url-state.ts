'use client'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'

import { useUrlWriter } from '@/lib/url-state'

/**
 * Which settings tab is open lives in the query string, like every other tab and
 * filter in the app. `/settings?tab=api` is a link someone can send when explaining
 * where the base URL is set, which is the whole reason tab state is not local.
 *
 * The writer is the shared one in lib/url-state.ts. This file holds only this screen's
 * param schema, same split as /accounts and /mytickets.
 */

export const SETTINGS_TABS = [
  { id: 'general', label: 'General' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'subscription', label: 'Subscription' },
  { id: 'api', label: 'API' },
] as const

export type SettingsTabId = (typeof SETTINGS_TABS)[number]['id']

const IDS = new Set<string>(SETTINGS_TABS.map((t) => t.id))

/** Dropped from the URL, so an untouched screen keeps a clean link. */
const DEFAULT_TAB: SettingsTabId = 'general'

export function useSettingsUrlState() {
  const params = useSearchParams()
  const url = useUrlWriter()

  const raw = params.get('tab')
  const tab: SettingsTabId = raw && IDS.has(raw) ? (raw as SettingsTabId) : DEFAULT_TAB

  const setTab = React.useCallback(
    (next: SettingsTabId) => {
      url.commit((search) => {
        if (next === DEFAULT_TAB) search.delete('tab')
        else search.set('tab', next)
      })
    },
    [url],
  )

  return { tab, setTab }
}
