import { RunMonitorScreen } from '@/components/ballots/monitor/RunMonitorScreen'

export const metadata = {
  title: 'Ballot Run · Fetch.io',
}

/**
 * `/ballots/run/[id]` — §B5.5.
 *
 * The page does NOT read `params`. It used to `await` them, and that one await was
 * the whole shell's hydration mismatch: awaiting a promise here suspends the SERVER
 * render at this point, the client's hydration render does not suspend in the same
 * place, and React's `useId` tree context differs between the two — which silently
 * renumbered every `useId` in the layout ABOVE this page, sidebar and topbar
 * included. The run id is read from `useParams()` inside the screen instead, which is
 * a plain synchronous value on both renders.
 */
export default function BallotRunPage() {
  return <RunMonitorScreen />
}
