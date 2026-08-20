/**
 * The guided tour, as data.
 *
 * NINE STEPS THAT TEACH THE LOOP, not the furniture. Nobody needs a tour of a
 * notification bell; what a first-time visitor cannot work out is that this product is a
 * sequence — accounts, then a pace, then a run, then what to do with the failures — and
 * that the sequence is what the three numbered tabs are.
 *
 * EVERY ANCHOR IS A `data-tour` ATTRIBUTE on the real element. Not a class, not an
 * nth-child: a class is a styling decision that someone will change for styling reasons,
 * and a positional selector breaks the first time a column moves. Both fail SILENTLY —
 * the tour would point at nothing, or worse, at the wrong thing. An attribute that
 * exists for no other purpose gets deleted only on purpose, and the tour fails loudly
 * (see `TourProvider`, which reports a missing anchor rather than skipping it).
 */

export interface TourStep {
  /** The `data-tour` value on the element this step points at. */
  anchor: string
  /** Where that element lives. `{runId}` is filled in with a real, already-running run. */
  route: string
  title: string
  /** One sentence, second person, ending on the next action. */
  body: string
  /** Used instead of `body` when the pool is empty — the product still has to explain itself. */
  emptyBody?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
}

export const TOUR_STEPS: TourStep[] = [
  {
    anchor: 'ballots-tabs',
    route: '/ballots?tab=pool',
    title: 'The loop, in order',
    body: 'These three tabs are the whole product in order — load accounts, choose a pace, then run them — and everything else in the app supports one of the three.',
    side: 'bottom',
    align: 'start',
  },
  {
    anchor: 'pool-paste',
    route: '/ballots?tab=pool',
    title: 'Load accounts',
    body: 'Accounts come in here as email:password, one per line, so pick the club they belong to and press LOAD_ACCOUNTS.',
    emptyBody:
      'Accounts come in here as email:password, one per line, and once you load some they appear in the table below this box.',
    side: 'bottom',
    align: 'start',
  },
  {
    anchor: 'pool-ready',
    route: '/ballots?tab=pool',
    title: 'Ready, not just active',
    body: 'READY is stricter than a working login: the membership has to be live and the account needs whatever the profile asks for, such as a proxy.',
    emptyBody:
      'Once accounts are loaded this column says whether each one can actually enter, which is stricter than having a working login.',
    side: 'bottom',
    align: 'start',
  },
  {
    anchor: 'profile-card',
    route: '/ballots?tab=profiles',
    title: 'Profiles are the pace',
    body: 'A profile holds how many accounts run at once, how long they wait between attempts, how many retries they get, which proxies they use and where one-time codes come from.',
    side: 'right',
    align: 'start',
  },
  {
    anchor: 'profile-concurrency',
    route: '/ballots?tab=profiles',
    title: 'The setting that bites',
    body: 'Concurrency is what gets people rate-limited — above ten at once, clubs start refusing every account rather than the fast ones — so leave it at eight until you know how a club responds.',
    side: 'bottom',
    align: 'start',
  },
  {
    anchor: 'start-run',
    route: '/ballots?tab=pool',
    title: 'Start a run',
    body: 'START_RUN opens the launcher, where you choose which accounts go, pick the profile, and read the estimate before anything is submitted.',
    side: 'bottom',
    align: 'end',
  },
  {
    anchor: 'run-stats',
    route: '/ballots/run/{runId}',
    title: 'Is it working',
    body: 'While a run works this band answers that at a glance — green is confirmed, red is refused, and every counter is a filter for the table below.',
    side: 'bottom',
    align: 'start',
  },
  {
    anchor: 'run-table',
    route: '/ballots/run/{runId}',
    title: 'Why it failed',
    body: 'LAST_RESPONSE carries the club’s own sentence rather than a bare code, so you can tell a dead proxy from a rate limit without leaving the row.',
    side: 'top',
    align: 'start',
  },
  {
    anchor: 'run-actions',
    route: '/ballots/run/{runId}',
    title: 'What to do next',
    body: 'RETRY_FAILED starts a new run holding only the failures and EXPORT downloads the whole thing, and the guides explain what every failure code means.',
    side: 'bottom',
    align: 'end',
  },
]

export const TOUR_STORAGE_KEY = 'fetch.tour.v1'
/** Survives a hard reload mid-tour; cleared when the tour ends. */
export const TOUR_SESSION_KEY = 'fetch.tour.progress'
export const TOUR_GUIDE_HREF = '/guides/getting-started/quick-start'

/** `/ballots?tab=pool` → { pathname, tab } — what a route match compares. */
export function parseRoute(route: string): { pathname: string; tab: string | null } {
  const [pathname, query = ''] = route.split('?')
  return { pathname: pathname!, tab: new URLSearchParams(query).get('tab') }
}
