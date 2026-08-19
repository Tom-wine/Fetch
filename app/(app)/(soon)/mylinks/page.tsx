import { Link2 } from 'lucide-react'

import { PageHeader } from '@/components/shell/PageHeader'
import { ComingSoon } from '@/components/shell/ComingSoon'

export default function MyLinksPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader title="My Links" subtitle="shared_ticket_links" />
      <ComingSoon
        icon={Link2}
        what="Every QR and ticket link you have handed to a buyer, in one list — who it went to, whether it has been opened, and the ability to revoke one that has not."
        cta={{ href: '/mytickets', label: 'Go to my tickets' }}
      />
    </div>
  )
}
