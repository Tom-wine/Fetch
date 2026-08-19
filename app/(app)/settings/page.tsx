import { PageHeader } from '@/components/shell/PageHeader'
import { SettingsScreen } from '@/components/settings/SettingsScreen'

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader title="Settings" subtitle="where_preferences_are_written" />
      <SettingsScreen />
    </div>
  )
}
