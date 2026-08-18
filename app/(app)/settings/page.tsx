import { PageHeader } from '@/components/shell/PageHeader'
import { ComingSoon } from '@/components/shell/ComingSoon'

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader title="Settings" subtitle="general_preferences_subscription_api" />
      <ComingSoon what="General, Preferences, Subscription and API keys land in Part 10." />
    </div>
  )
}
