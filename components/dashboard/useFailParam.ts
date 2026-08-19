'use client'

import { useSearchParams } from 'next/navigation'

/**
 * §6.2 failure injection, read off the screen's own URL.
 *
 * /mytickets and the fixture screen each read `__fail` inside their own url-state
 * module, because each has a param schema to read it alongside. /dashboard
 * has no filters and therefore no url-state of its own, so this is the whole of its
 * URL contract — one optional parameter, shared by the four panels.
 *
 * Anything outside the 4xx/5xx band is ignored rather than forwarded, so a typo
 * cannot become a request parameter the API does not understand.
 */
export function useFailParam(): number | null {
  const raw = useSearchParams().get('__fail')
  if (!raw) return null
  const status = Number(raw)
  return Number.isFinite(status) && status >= 400 && status <= 599 ? status : null
}
