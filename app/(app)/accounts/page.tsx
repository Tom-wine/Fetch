import { PageHeader } from '@/components/shell/PageHeader'
import { ComingSoon } from '@/components/shell/ComingSoon'

export default function AccountsPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader title="Accounts" subtitle="account_manager" />
      <ComingSoon what="The account table — club tabs, status filters, bulk actions and the masked password cell — lands in Part 4." />
    </div>
  )
}
