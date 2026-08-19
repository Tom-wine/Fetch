'use client'

import * as React from 'react'
import { Check, Copy, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

import { API_BASE_URL, setAuthToken } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Prose } from '@/components/ui/typography'
import { SettingsCard, SettingRow } from './SettingsCard'

/**
 * API — the seam to the future backend, made visible.
 *
 * Every request in the app goes through `apiFetch`, which reads exactly two things:
 * `NEXT_PUBLIC_API_BASE_URL` and a bearer token. This tab shows both, so "where does
 * the data come from and what is it authenticated as" is a question with an answer on
 * screen rather than one you answer by reading lib/api/client.ts.
 *
 * The base URL is displayed, not edited. It is a build-time environment variable — a
 * field here could only ever write a value that the next reload throws away, and a
 * setting that silently forgets is worse than one that is honestly read-only.
 *
 * The token IS editable, because `apiFetch` reads it from localStorage at request
 * time. It is masked by default and revealed on demand, the same grammar the account
 * password cell uses.
 */

const TOKEN_KEY = 'fetch_token'

export function ApiTab() {
  const [token, setToken] = React.useState('')
  const [saved, setSaved] = React.useState('')
  const [revealed, setRevealed] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  // Read after mount: localStorage does not exist on the server, and a token in the
  // first render's HTML would be a token in the page source.
  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(TOKEN_KEY) ?? ''
      setToken(stored)
      setSaved(stored)
    } catch {
      // Blocked storage is not an error worth a toast on a settings tab.
    }
  }, [])

  const dirty = token !== saved
  const usingMock = API_BASE_URL.startsWith('/')

  const persist = (next: string) => {
    try {
      if (next) window.localStorage.setItem(TOKEN_KEY, next)
      else window.localStorage.removeItem(TOKEN_KEY)
    } catch {
      // Falls back to in-memory for this session, which setAuthToken covers.
    }
    setAuthToken(next || null)
    setSaved(next)
  }

  const copyBaseUrl = async () => {
    try {
      await navigator.clipboard.writeText(API_BASE_URL)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      toast.error('The clipboard is not available in this browser.')
    }
  }

  return (
    <div className="space-y-6">
      <SettingsCard title="Connection" label="where_the_data_comes_from">
        <SettingRow
          label="API base URL"
          description={
            usingMock ? (
              <>
                Every screen is talking to the bundled mock — Next.js route handlers under{' '}
                <span className="font-mono">app/api/v1</span>, seeded in memory. Point{' '}
                <span className="font-mono">NEXT_PUBLIC_API_BASE_URL</span> at a real server and
                nothing else in the app changes.
              </>
            ) : (
              <>
                Set at build time by <span className="font-mono">NEXT_PUBLIC_API_BASE_URL</span>.
                Read-only here: a value typed into this screen would not survive a reload.
              </>
            )
          }
          control={
            <div className="flex items-center gap-2">
              <code className="rounded-md border border-border bg-surface-raised px-3 py-1.5 font-mono text-body text-text">
                {API_BASE_URL}
              </code>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Copy API base URL"
                onClick={copyBaseUrl}
              >
                {copied ? (
                  <Check className="size-4 text-success-ink" aria-hidden="true" />
                ) : (
                  <Copy className="size-4" aria-hidden="true" />
                )}
              </Button>
            </div>
          }
        />

        <SettingRow
          label="Environment"
          description="Which of the two servers in the OpenAPI document this build is pointed at."
          control={
            <span className="font-mono text-body text-muted">
              {usingMock ? 'bundled mock' : 'remote'}
            </span>
          }
        />
      </SettingsCard>

      <SettingsCard
        title="Access token"
        label="sent_as_bearer_on_every_request"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Prose className="text-[12px] leading-snug text-muted">
              Held in this browser only. The mock ignores it; a real backend would not.
            </Prose>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                label="Clear"
                disabled={!saved && !token}
                onClick={() => {
                  setToken('')
                  persist('')
                  toast.success('Token cleared.')
                }}
              />
              <Button
                label="Save token"
                disabled={!dirty}
                onClick={() => {
                  persist(token.trim())
                  toast.success('Token saved for this browser.')
                }}
              />
            </div>
          </div>
        }
      >
        <SettingRow
          label="Bearer token"
          htmlFor="settings-token"
          description="Attached as an Authorization header by the one function that makes requests. Nothing else in the app touches it."
          stacked
          control={
            <div className="flex items-center gap-2">
              <Input
                id="settings-token"
                type={revealed ? 'text' : 'password'}
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="Paste a token"
                autoComplete="off"
                spellCheck={false}
                className="font-mono"
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label={revealed ? 'Hide token' : 'Show token'}
                onClick={() => setRevealed((on) => !on)}
              >
                {revealed ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </Button>
            </div>
          }
        />
      </SettingsCard>
    </div>
  )
}
