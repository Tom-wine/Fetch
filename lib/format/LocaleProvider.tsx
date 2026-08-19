'use client'

import * as React from 'react'
import { DEFAULT_LOCALE, type Currency, type LocaleSettings } from './locale'

/**
 * THE preference store. One provider, one localStorage key, one screen that writes it
 * (`/settings → Preferences`).
 *
 * It holds three slices that are deliberately kept apart:
 *
 *   settings   locale, timezone, display currency — the formatting contract (§9 rule
 *              6). `LocaleSettings` is what every formatter in lib/format takes, and
 *              it stays exactly that shape so a formatter can never accidentally
 *              depend on a UI preference.
 *   ui         table density, default rows per page, reduced motion. Chrome, not
 *              format. Nothing in lib/format reads it.
 *   profile    display name and avatar. Not a preference at all — it is user data that
 *              belongs to a `PATCH /me` that does not exist yet. It shares this store
 *              rather than getting its own so there stays exactly one thing to replace
 *              when auth lands, and so /settings has one place to write.
 *
 * They share a provider rather than getting one each because two stores means two
 * hydration paths, two storage keys and two answers to "what is the user's setting".
 * `useLocale()` returns the formatting slice, `useUiPreferences()` the other, and the
 * separation is in the accessors instead of in the plumbing.
 */

/** Row height. Lives here, not in the table, because a preference sets it globally. */
export type Density = 'comfortable' | 'compact'

export interface UiPreferences {
  density: Density
  /** The rows-per-page a table starts on when the URL does not say otherwise. */
  pageSize: number
  /**
   * Suppresses transitions and animations app-wide. The OS setting is honoured
   * independently in globals.css, so `false` here never overrides someone who has
   * asked their system to reduce motion — this only ever adds.
   */
  reducedMotion: boolean
}

export const DEFAULT_UI: UiPreferences = {
  density: 'comfortable',
  pageSize: 25,
  reducedMotion: false,
}

export interface Profile {
  name: string
  /**
   * An image URL, not an upload. Uploading needs somewhere to upload TO; a URL is
   * both honest about that and exactly what a real backend would store.
   */
  avatarUrl: string
}

export const DEFAULT_PROFILE: Profile = {
  name: 'Julien Moreau',
  avatarUrl: '',
}

/** `Julien Moreau` -> `JM`. Falls back to the first two letters of one long word. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return '?'
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase()
  return `${words[0]![0]}${words[words.length - 1]![0]}`.toUpperCase()
}

interface PreferencesValue extends LocaleSettings {
  settings: LocaleSettings
  ui: UiPreferences
  profile: Profile
  setLocale: (locale: string) => void
  setTimeZone: (tz: string) => void
  setDisplayCurrency: (currency: Currency | null) => void
  setDensity: (density: Density) => void
  setPageSize: (size: number) => void
  setReducedMotion: (on: boolean) => void
  setProfile: (patch: Partial<Profile>) => void
  /** Back to every default, and clears the stored blob. */
  reset: () => void
}

const PreferencesContext = React.createContext<PreferencesValue | null>(null)

const STORAGE_KEY = 'fetch_prefs'
/** The key before the UI slice existed. Read once, then migrated forward. */
const LEGACY_KEY = 'fetch_locale'

type Stored = Partial<LocaleSettings> & Partial<UiPreferences> & Partial<Profile>

export function LocaleProvider({
  children,
  initial = DEFAULT_LOCALE,
}: {
  children: React.ReactNode
  initial?: LocaleSettings
}) {
  const [settings, setSettings] = React.useState<LocaleSettings>(initial)
  const [ui, setUi] = React.useState<UiPreferences>(DEFAULT_UI)
  const [profile, setProfileState] = React.useState<Profile>(DEFAULT_PROFILE)

  // Read after mount so the server and first client render agree.
  React.useEffect(() => {
    try {
      const raw =
        window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_KEY)
      if (!raw) return
      const stored = JSON.parse(raw) as Stored
      setSettings({
        locale: stored.locale ?? initial.locale,
        timeZone: stored.timeZone ?? initial.timeZone,
        displayCurrency:
          stored.displayCurrency === undefined ? initial.displayCurrency : stored.displayCurrency,
      })
      setUi({
        density: stored.density ?? DEFAULT_UI.density,
        pageSize: stored.pageSize ?? DEFAULT_UI.pageSize,
        reducedMotion: stored.reducedMotion ?? DEFAULT_UI.reducedMotion,
      })
      setProfileState({
        name: stored.name ?? DEFAULT_PROFILE.name,
        avatarUrl: stored.avatarUrl ?? DEFAULT_PROFILE.avatarUrl,
      })
    } catch {
      // A corrupt or blocked localStorage must not take the app down.
    }
    // Only ever hydrates once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const persist = React.useCallback(
    (nextSettings: LocaleSettings, nextUi: UiPreferences, nextProfile: Profile) => {
      setSettings(nextSettings)
      setUi(nextUi)
      setProfileState(nextProfile)
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...nextSettings, ...nextUi, ...nextProfile }),
        )
        window.localStorage.removeItem(LEGACY_KEY)
      } catch {
        // Preference is in-memory for this session; not worth surfacing.
      }
    },
    [],
  )

  /**
   * Reduced motion is the one preference the CSS has to see, so it rides on the root
   * element rather than through a class name on every animated node.
   */
  React.useEffect(() => {
    document.documentElement.dataset.reducedMotion = ui.reducedMotion ? 'true' : 'false'
  }, [ui.reducedMotion])

  const value = React.useMemo<PreferencesValue>(
    () => ({
      ...settings,
      settings,
      ui,
      profile,
      setLocale: (locale) => persist({ ...settings, locale }, ui, profile),
      setTimeZone: (timeZone) => persist({ ...settings, timeZone }, ui, profile),
      setDisplayCurrency: (displayCurrency) =>
        persist({ ...settings, displayCurrency }, ui, profile),
      setDensity: (density) => persist(settings, { ...ui, density }, profile),
      setPageSize: (pageSize) => persist(settings, { ...ui, pageSize }, profile),
      setReducedMotion: (reducedMotion) => persist(settings, { ...ui, reducedMotion }, profile),
      setProfile: (patch) => persist(settings, ui, { ...profile, ...patch }),
      reset: () => {
        persist(DEFAULT_LOCALE, DEFAULT_UI, DEFAULT_PROFILE)
        try {
          window.localStorage.removeItem(STORAGE_KEY)
        } catch {
          // Same as above.
        }
      },
    }),
    [settings, ui, profile, persist],
  )

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export function useLocale(): PreferencesValue {
  const ctx = React.useContext(PreferencesContext)
  if (!ctx) throw new Error('useLocale must be used inside <LocaleProvider>')
  return ctx
}

/**
 * The chrome slice, on its own so a component that wants row height does not also get
 * handed a currency it has no business formatting with.
 *
 * Returns `DEFAULT_UI` outside a provider instead of throwing. `useLocale` throws
 * because rendering money in the wrong currency is a real defect; a table rendered at
 * the default row height is not, and this way a primitive stays usable in isolation.
 */
export function useUiPreferences(): UiPreferences {
  return React.useContext(PreferencesContext)?.ui ?? DEFAULT_UI
}

/** The profile slice. Same forgiving contract as `useUiPreferences`. */
export function useProfile(): Profile {
  return React.useContext(PreferencesContext)?.profile ?? DEFAULT_PROFILE
}
