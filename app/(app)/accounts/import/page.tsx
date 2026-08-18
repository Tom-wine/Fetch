import { PageHeader } from '@/components/shell/PageHeader'
import { ComingSoon } from '@/components/shell/ComingSoon'

export default function ImportaccountsPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader
        title="Import accounts"
        subtitle="manual_and_bulk_csv"
        breadcrumb={[{ label: 'accounts', href: '/accounts' }, { label: 'import' }]}
      />
      <ComingSoon what="The four-step CSV wizard — upload, map columns, validate, commit — lands in Part 5." />
    </div>
  )
}
