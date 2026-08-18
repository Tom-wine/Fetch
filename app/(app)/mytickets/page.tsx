import { PageHeader } from '@/components/shell/PageHeader'
import { ComingSoon } from '@/components/shell/ComingSoon'

export default function MyTicketsPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader title="My Tickets" subtitle="inventory_by_fixture" />
      <ComingSoon what="One row per fixture, with the value-at-risk column and the seven-day countdown ramp, lands in Part 6." />
    </div>
  )
}
