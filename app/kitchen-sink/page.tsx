import { PageHeader } from '@/components/shell/PageHeader'
import { ComingSoon } from '@/components/shell/ComingSoon'

/**
 * Dev-only regression page: every primitive, every state, both themes.
 * Deliberately outside the (app) shell so components are judged on their own.
 */
export default function KitchenSinkPage() {
  return (
    <div className="min-h-screen bg-bg px-6 py-10 text-text">
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <PageHeader title="Kitchen sink" subtitle="every_primitive_every_state" />
        <ComingSoon what="The full primitive library renders here in Part 2." />
      </div>
    </div>
  )
}
