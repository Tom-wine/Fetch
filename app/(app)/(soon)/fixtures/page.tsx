import { PageHeader } from '@/components/shell/PageHeader'
import { ComingSoon } from '@/components/shell/ComingSoon'

export default function FixturesPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader title="Fixtures" subtitle="upcoming_premier_league" />
      <ComingSoon what="Browse upcoming Premier League fixtures. Not built yet — the five core screens ship first." />
    </div>
  )
}
