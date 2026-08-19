import { PageHeader } from '@/components/shell/PageHeader'
import { ImportPagePanel } from '@/components/import/ImportPagePanel'

/**
 * `/accounts/import` — §8.3's full-page mount.
 *
 * The same `ImportWizard` the /accounts toolbar opens in a modal renders here, so a
 * link to this route and a click on IMPORT lead to the identical thing. The page
 * exists because a 500-row validation table deserves a whole viewport, and because
 * an import is a job an operator will want to bookmark, reopen and send to a
 * colleague — none of which a modal can be.
 *
 * The page stays a server component; only the panel below the header is a client
 * tree, which keeps the header in the first paint.
 */
export default function ImportAccountsPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader
        title="Import accounts"
        subtitle="add_accounts_one_or_a_thousand"
        breadcrumb={[{ label: 'accounts', href: '/accounts' }, { label: 'import' }]}
      />

      <ImportPagePanel />
    </div>
  )
}
