import { Dices } from 'lucide-react'

import { PageHeader } from '@/components/shell/PageHeader'
import { ComingSoon } from '@/components/shell/ComingSoon'

export default function BallotsPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader title="Ballot Entries" subtitle="pool_profiles_runs" />
      <ComingSoon
        icon={Dices}
        what="The pool of accounts entered into each club's ballot, the profiles that decide how they enter, and the history of every run — so an on-sale is something you set up once rather than sit through."
        cta={{ href: '/accounts', label: 'Check accounts' }}
      />
    </div>
  )
}
