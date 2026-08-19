import { History } from 'lucide-react'

import { PageHeader } from '@/components/shell/PageHeader'
import { ComingSoon } from '@/components/shell/ComingSoon'

export default function BallotRunPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader title="Ballot Run" subtitle="live_monitor" />
      <ComingSoon
        icon={History}
        what="One run, account by account, as it happens — who is queued, who is in, who was refused and why, with the event log that explains each verdict."
        cta={{ href: '/ballots', label: 'Go to ballots' }}
      />
    </div>
  )
}
