import { PageHeader } from '@/components/shell/PageHeader'
import { ComingSoon } from '@/components/shell/ComingSoon'

export default function MyLinksPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader title="My Links" subtitle="shared_ticket_links" />
      <ComingSoon what="Shared QR and ticket links handed to buyers. Not built yet — the five core screens ship first." />
    </div>
  )
}
