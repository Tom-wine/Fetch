import { RunMonitorScreen } from '@/components/ballots/monitor/RunMonitorScreen'

export const metadata = {
  title: 'Ballot Run · Fetch.io',
}

export default async function BallotRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <RunMonitorScreen runId={id} />
}
