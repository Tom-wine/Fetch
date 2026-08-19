import { Calendar } from 'lucide-react'

import { PageHeader } from '@/components/shell/PageHeader'
import { ComingSoon } from '@/components/shell/ComingSoon'

export default function FixturesPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader title="Fixtures" subtitle="upcoming_premier_league" />
      <ComingSoon
        icon={Calendar}
        what="The full Premier League calendar rather than only the matches you hold seats for, so you can see what is coming before the on-sale rather than after it."
        cta={{ href: '/mytickets', label: 'Go to my tickets' }}
      />
    </div>
  )
}
