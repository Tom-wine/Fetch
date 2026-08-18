import { PageHeader } from '@/components/shell/PageHeader'
import { ComingSoon } from '@/components/shell/ComingSoon'

export default async function FixtureDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader
        // Real fixture identity (ARSENAL v CHELSEA — 14 Sep 2026) replaces the id
        // once the seeded API lands in Part 3.
        title={id}
        subtitle="seat_level_inventory"
        breadcrumb={[{ label: 'my_tickets', href: '/mytickets' }, { label: id }]}
      />
      <ComingSoon what="The two-pane fixture screen — seat table plus the ticket/fixture/seat-map context panel — lands in Part 7." />
    </div>
  )
}
