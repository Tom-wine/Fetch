import { PageHeader } from '@/components/shell/PageHeader'
import { RegisterMembershipForm } from '@/components/accounts/register/RegisterMembershipForm'

/**
 * `/accounts/register` — the membership registration flow.
 *
 * The full data set for one membership, entered in one sectioned page: identity,
 * address, login and tokenized payment. It writes through the same account store as
 * every other screen, so a registered membership appears in the account manager with
 * its assigned membership number and creation date.
 *
 * The page stays a server component; only the form below the header is client, which
 * keeps the header in the first paint.
 */
export default function RegisterMembershipPage() {
  return (
    <div className="mx-auto w-full max-w-[900px] space-y-6">
      <PageHeader
        title="Register membership"
        subtitle="one_membership_every_field"
        breadcrumb={[{ label: 'accounts', href: '/accounts' }, { label: 'register' }]}
      />

      <RegisterMembershipForm />
    </div>
  )
}
