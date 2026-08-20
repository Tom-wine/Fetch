'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { driver, type Driver } from 'driver.js'
import 'driver.js/dist/driver.css'

import { useAccounts } from '@/lib/api/hooks/useAccounts'
import { useActiveRun } from '@/lib/api/hooks/useActiveRun'
import { BALLOT_CLUB_IDS } from '@/lib/types'
import {
  TOUR_GUIDE_HREF,
  TOUR_SESSION_KEY,
  TOUR_STEPS,
  TOUR_STORAGE_KEY,
  parseRoute,
} from '@/lib/tour/steps'

/**
 * The guided tour.
 *
 * driver.js draws one highlight at a time on one page; this tour crosses four routes. So
 * the provider — not driver.js — owns the step index, and drives ONE step at a time:
 * navigate if the step lives somewhere else, wait for its anchor to exist, then hand
 * that single element to `highlight()`. The provider is mounted inside AppShell, which
 * survives every client navigation the tour makes, so the index is ordinary React state.
 * `sessionStorage` is the backstop for a hard reload mid-tour.
 *
 * IT NEVER CAUSES A SIDE EFFECT. The three run steps point at a run that is ALREADY
 * going — the seeded in-flight one, or the most recent finished one. A tour that started
 * a run to show you a run would be submitting real entries to real clubs on behalf of
 * someone who pressed "Take the tour".
 *
 * It auto-starts once, on the dashboard, for someone who has never seen it. Not on a
 * deep link: arriving at /ballots/run/abc from a colleague's message means you were sent
 * somewhere specific, and hijacking that with a nine-step tour is the behaviour people
 * disable tours to avoid.
 */

interface TourApi {
  start: () => void
  active: boolean
}

const TourContext = React.createContext<TourApi>({ start: () => {}, active: false })

export function useTour() {
  return React.useContext(TourContext)
}

/** Where auto-start is allowed. Anywhere else, the visitor came for something. */
const AUTO_START_ROUTE = '/dashboard'

/** How long to wait for an anchor to mount after a navigation before giving up. */
const ANCHOR_TIMEOUT_MS = 4_000

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Resolves once `[data-tour="name"]` is in the DOM, or null if it never appears. */
function waitForAnchor(name: string, signal: AbortSignal): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const selector = `[data-tour="${name}"]`
    const existing = document.querySelector<HTMLElement>(selector)
    if (existing) return resolve(existing)

    const stop = (value: HTMLElement | null) => {
      observer.disconnect()
      clearTimeout(timer)
      signal.removeEventListener('abort', onAbort)
      resolve(value)
    }

    const observer = new MutationObserver(() => {
      const found = document.querySelector<HTMLElement>(selector)
      if (found) stop(found)
    })
    const timer = setTimeout(() => stop(null), ANCHOR_TIMEOUT_MS)
    const onAbort = () => stop(null)

    observer.observe(document.body, { childList: true, subtree: true })
    signal.addEventListener('abort', onAbort)
  })
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [active, setActive] = React.useState(false)
  const [index, setIndex] = React.useState(0)
  /**
   * The step actually SHOWING, which trails `index` while a route change is in flight.
   * The announcement reads from this: a live region that says "step 7 of 9" while the
   * popover still shows step 6 is telling a screen-reader user something untrue for as
   * long as the navigation takes.
   */
  const [shown, setShown] = React.useState(0)

  const driverRef = React.useRef<Driver | null>(null)
  const indexRef = React.useRef(0)
  indexRef.current = index

  /**
   * The empty-state variant. One row is requested because this needs `meta.total`, not
   * the accounts — the tour only asks "is there anything here at all".
   */
  const poolProbe = useAccounts({ club: BALLOT_CLUB_IDS, pageSize: 1 })
  const poolEmpty = (poolProbe.data?.meta?.total ?? 0) === 0

  // A run that is ALREADY running, or the last one that finished. Never a new one.
  const { active: activeRun, last: lastRun } = useActiveRun()
  const runId = activeRun?.id ?? lastRun?.id ?? null

  const end = React.useCallback(() => {
    driverRef.current?.destroy()
    driverRef.current = null
    setActive(false)
    setIndex(0)
    setShown(0)
    try {
      window.sessionStorage.removeItem(TOUR_SESSION_KEY)
    } catch {
      // A tour that cannot remember where it was is still a tour.
    }
  }, [])

  const start = React.useCallback(() => {
    try {
      window.localStorage.setItem(TOUR_STORAGE_KEY, 'seen')
    } catch {
      // Storage refused: the tour runs, it just may offer itself again.
    }
    setIndex(0)
    setActive(true)
  }, [])

  /* ------------------------------------------------------------- auto-start */

  React.useEffect(() => {
    if (pathname !== AUTO_START_ROUTE) return

    let seen = true
    try {
      seen = window.localStorage.getItem(TOUR_STORAGE_KEY) !== null
    } catch {
      // No storage means no way to remember; never auto-start rather than every time.
    }
    if (seen) return

    // One frame, so the dashboard's own cards are mounted before the first highlight.
    const timer = setTimeout(() => start(), 600)
    return () => clearTimeout(timer)
  }, [pathname, start])

  /* --------------------------------------------------- resume a hard reload */

  React.useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(TOUR_SESSION_KEY)
      if (saved === null) return
      const step = Number(saved)
      if (Number.isFinite(step) && step > 0 && step < TOUR_STEPS.length) {
        setIndex(step)
        setActive(true)
      }
    } catch {
      // Nothing to resume.
    }
  }, [])

  React.useEffect(() => {
    if (!active) return
    try {
      window.sessionStorage.setItem(TOUR_SESSION_KEY, String(index))
    } catch {
      // See above.
    }
  }, [active, index])

  /* ------------------------------------------------------------ the driving */

  React.useEffect(() => {
    if (!active) return

    const step = TOUR_STEPS[index]
    if (!step) {
      end()
      return
    }

    // A run step with no run at all to point at: end early rather than invent one.
    const wantsRun = step.route.includes('{runId}')
    if (wantsRun && !runId) {
      end()
      return
    }

    const route = wantsRun ? step.route.replace('{runId}', runId!) : step.route
    const target = parseRoute(route)
    const here = pathname === target.pathname && (searchParams.get('tab') ?? null) === target.tab

    if (!here) {
      router.push(route)
      return
    }

    const controller = new AbortController()

    void waitForAnchor(step.anchor, controller.signal).then((element) => {
      if (controller.signal.aborted) return

      if (!element) {
        // Loudly, not silently: a tour pointing at nothing is worse than no tour, and
        // the cause is always the same — the `data-tour` attribute was removed.
        console.error(
          `[tour] step ${index + 1} has no anchor: [data-tour="${step.anchor}"] is not on the page.`,
        )
        end()
        return
      }

      const instance =
        driverRef.current ??
        driver({
          animate: !prefersReducedMotion(),
          overlayColor: 'rgba(4, 8, 15, 0.72)',
          stagePadding: 6,
          stageRadius: 10,
          allowClose: true,
          smoothScroll: !prefersReducedMotion(),
          popoverClass: 'fetch-tour',
          // The tour explains; it does not let you operate the app through the hole in
          // the overlay, which would let a click start a run mid-explanation.
          disableActiveInteraction: true,
          onDestroyStarted: () => end(),
        })
      driverRef.current = instance

      const last = index === TOUR_STEPS.length - 1
      const body = poolEmpty && step.emptyBody ? step.emptyBody : step.body

      // driver.js tracks ONE previous element and clears the highlight class off that
      // one. Driving it step by step — a fresh `highlight()` per step rather than its
      // own `steps` array — leaves the class behind whenever two consecutive steps sit
      // on the same page, so the stage ends up marked on two elements and the older one
      // wins every `querySelector`. Clear the board first; driver marks the new one.
      clearStaleHighlights()

      setShown(index)
      instance.highlight({
        element,
        popover: {
          title: step.title,
          description: body,
          side: step.side ?? 'bottom',
          align: step.align ?? 'start',
          showButtons: index === 0 ? ['next', 'close'] : ['previous', 'next', 'close'],
          progressText: `${index + 1} of ${TOUR_STEPS.length}`,
          showProgress: true,
          nextBtnText: last ? 'Read the guides' : 'Next',
          prevBtnText: 'Back',
          onNextClick: () => {
            if (last) {
              end()
              router.push(TOUR_GUIDE_HREF)
              return
            }
            setIndex((current) => current + 1)
          },
          onPrevClick: () => setIndex((current) => Math.max(0, current - 1)),
          onCloseClick: () => end(),
          onPopoverRender: (popover) => decorate(popover, end),
        },
      })
    })

    return () => controller.abort()
  }, [active, index, pathname, searchParams, router, runId, poolEmpty, end])

  /* ------------------------------------------------------------- key escape */

  React.useEffect(() => {
    if (!active) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') end()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [active, end])

  // Nothing is left behind on unmount — an overlay that outlives its provider is a
  // page nobody can click.
  React.useEffect(() => () => void driverRef.current?.destroy(), [])

  const api = React.useMemo<TourApi>(() => ({ start, active }), [start, active])

  return (
    <TourContext.Provider value={api}>
      {children}
      {/* Announced to a screen reader on every step, separately from the dialog, so the
          progress is spoken even when focus has not moved. */}
      <div data-tour-live="true" aria-live="polite" className="sr-only">
        {active && TOUR_STEPS[shown]
          ? `Tour step ${shown + 1} of ${TOUR_STEPS.length}: ${TOUR_STEPS[shown]!.title}`
          : ''}
      </div>
    </TourContext.Provider>
  )
}

/**
 * Every leftover mark from a previous step: the class, the interaction block, and the
 * three ARIA attributes driver stamps on whatever it highlights.
 */
function clearStaleHighlights() {
  for (const element of document.querySelectorAll('.driver-active-element')) {
    element.classList.remove('driver-active-element', 'driver-no-interaction')
    element.removeAttribute('aria-haspopup')
    element.removeAttribute('aria-expanded')
    element.removeAttribute('aria-controls')
  }
}

/**
 * What driver.js does not do: dialog semantics, a focus trap, and a Skip that is a word
 * rather than a glyph.
 *
 * The popover is a modal — the rest of the page is covered and non-interactive — so it
 * has to say so, take focus, and keep Tab inside itself. Without the trap, Tab walks
 * into the page behind the overlay and the next Enter presses a button the visitor
 * cannot see.
 */
function decorate(
  popover: {
    wrapper: HTMLElement
    title: HTMLElement
    description: HTMLElement
    footerButtons: HTMLElement
    closeButton: HTMLButtonElement
  },
  end: () => void,
) {
  const { wrapper, title, description, footerButtons, closeButton } = popover

  wrapper.setAttribute('role', 'dialog')
  wrapper.setAttribute('aria-modal', 'true')
  wrapper.setAttribute('tabindex', '-1')

  title.id = 'fetch-tour-title'
  description.id = 'fetch-tour-description'
  wrapper.setAttribute('aria-labelledby', title.id)
  wrapper.setAttribute('aria-describedby', description.id)

  closeButton.setAttribute('aria-label', 'Close the tour')

  // Skip, spelled out, always in the footer. The ✕ is a glyph an unfamiliar visitor has
  // to guess at, and a tour someone cannot obviously leave is a trap.
  if (!footerButtons.querySelector('[data-tour-skip]')) {
    const skip = document.createElement('button')
    skip.type = 'button'
    skip.dataset.tourSkip = 'true'
    skip.className = 'driver-popover-skip-btn'
    skip.textContent = 'Skip'
    skip.addEventListener('click', end)
    footerButtons.prepend(skip)
  }

  const focusables = () => [
    ...wrapper.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])'),
  ]

  wrapper.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return
    const items = focusables()
    if (items.length === 0) return

    const first = items[0]!
    const last = items[items.length - 1]!
    const current = document.activeElement

    if (event.shiftKey && (current === first || current === wrapper)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && current === last) {
      event.preventDefault()
      first.focus()
    }
  })

  // After paint, so the browser does not scroll the highlight out of view to reach it.
  requestAnimationFrame(() => {
    wrapper.focus({ preventScroll: true })

    // driver.js puts `aria-haspopup`, `aria-expanded` and `aria-controls` on the
    // highlighted element. Those are invalid on most of what this tour points at — a
    // `th`, a section, a div — and axe flags every one as aria-allowed-attr. The popover
    // is a modal dialog that takes focus and names itself, so the association they were
    // carrying is already made a better way.
    for (const element of document.querySelectorAll('.driver-active-element')) {
      element.removeAttribute('aria-haspopup')
      element.removeAttribute('aria-expanded')
      element.removeAttribute('aria-controls')
    }
  })
}
