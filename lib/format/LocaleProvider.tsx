'use client'

import * as React from 'react'
import { DEFAULT_LOCALE, type Currency, type LocaleSettings } from './locale'

/**
 * Holds the one locale/timezone/display-currency setting for the app (§9 rule 6).
 * `/settings → Preferences` is the only screen that writes it.
 */

interface LocaleContextValue extends LocaleSettings {
  settings: LocaleSettings
  setLocale: (locale: string) => void
  setTimeZone: (tz: string) => void
  setDisplayCurrency: (currency: Currency | null) => void
}

const LocaleContext = React.createContext<LocaleContextValue | null>(null)

const STORAGE_KEY = 'fetch_locale'

export function LocaleProvider({
  children,
  initial = DEFAULT_LOCALE,
}: {
  children: React.ReactNode
  initial?: LocaleSettings
}) {
  const [settings, setSettings] = React.useState<LocaleSettings>(initial)

  // Read after mount so the server and first client render agree.
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) setSettings({ ...initial, ...(JSON.parse(raw) as Partial<LocaleSettings>) })
    } catch {
      // A corrupt or blocked localStorage must not take the app down.
    }
    // Only ever hydrates once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const persist = React.useCallback((next: LocaleSettings) => {
    setSettings(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Preference is in-memory for this session; not worth surfacing.
    }
  }, [])

  const value = React.useMemo<LocaleContextValue>(
    () => ({
      ...settings,
      settings,
      setLocale: (locale) => persist({ ...settings, locale }),
      setTimeZone: (timeZone) => persist({ ...settings, timeZone }),
      setDisplayCurrency: (displayCurrency) => persist({ ...settings, displayCurrency }),
    }),
    [settings, persist],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(): LocaleContextValue {
  const ctx = React.useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used inside <LocaleProvider>')
  return ctx
}
