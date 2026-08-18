'use client'

import * as React from 'react'
import { Check, Copy, Eye, EyeOff } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * Masked by default, revealed only on an explicit click, re-masked automatically
 * (§7 #22, §9 rule 13).
 *
 * SECURITY NOTES — these are requirements, not preferences:
 * - The plaintext is never written to localStorage, sessionStorage or a cookie.
 * - It is never passed to console.* — there is no logging in this file at all.
 * - It is fetched on demand from `POST /accounts/:id/reveal` (audit-logged server
 *   side) and held only in component state, which dies with the row.
 * - It re-masks after 10 seconds so a revealed password cannot sit on a screen
 *   behind someone's back.
 */

const REMASK_MS = 10_000

export function PasswordCell({
  masked,
  onReveal,
  className,
}: {
  /** What the API returns by default, e.g. `••••••••`. Never the real value. */
  masked: string
  /**
   * Fetches the plaintext once. Omit and the cell stays permanently masked with the
   * reveal control disabled — which is the correct behaviour before Part 3 wires
   * the endpoint.
   */
  onReveal?: () => Promise<string>
  className?: string
}) {
  const [plain, setPlain] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }, [])

  // Drop the plaintext if the row unmounts before the timer fires.
  React.useEffect(() => () => clearTimer(), [clearTimer])

  async function reveal() {
    if (!onReveal || busy) return
    setBusy(true)
    try {
      const value = await onReveal()
      setPlain(value)
      clearTimer()
      timer.current = setTimeout(() => setPlain(null), REMASK_MS)
    } catch {
      // The row shows a toast from the mutation layer; the cell just stays masked.
      setPlain(null)
    } finally {
      setBusy(false)
    }
  }

  function hide() {
    clearTimer()
    setPlain(null)
  }

  async function copy() {
    const value = plain ?? (onReveal ? await onReveal() : null)
    if (!value) return
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const revealed = plain !== null
  const RevealIcon = revealed ? EyeOff : Eye

  return (
    <TooltipProvider delayDuration={200}>
      <span className={cn('inline-flex items-center gap-1.5', className)}>
        <span className={cn('text-body select-none', revealed ? 'text-text' : 'text-faint')}>
          {revealed ? plain : masked}
        </span>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={revealed ? hide : reveal}
              disabled={!onReveal || busy}
              aria-label={revealed ? 'Hide password' : 'Reveal password'}
              className="flex size-6 items-center justify-center rounded-sm text-faint transition-colors duration-150 hover:bg-surface-hover hover:text-text disabled:opacity-40"
            >
              <RevealIcon className="size-3.5" aria-hidden="true" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-[240px] font-prose text-prose">
            {onReveal
              ? 'Reveals the password for 10 seconds. The action is logged.'
              : 'Revealing passwords is not wired up yet.'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={copy}
              disabled={!onReveal}
              aria-label="Copy password"
              className="flex size-6 items-center justify-center rounded-sm text-faint transition-colors duration-150 hover:bg-surface-hover hover:text-text disabled:opacity-40"
            >
              {copied ? (
                <Check className="size-3.5 text-success-ink" aria-hidden="true" />
              ) : (
                <Copy className="size-3.5" aria-hidden="true" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent className="font-prose text-prose">
            Copies to the clipboard without showing it.
          </TooltipContent>
        </Tooltip>
      </span>
    </TooltipProvider>
  )
}
