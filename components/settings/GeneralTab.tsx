'use client'

import * as React from 'react'
import { toast } from 'sonner'

import { initialsOf, useLocale } from '@/lib/format/LocaleProvider'
import { CURRENT_USER } from '@/components/shell/nav-config'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Prose } from '@/components/ui/typography'
import { SettingsCard, SettingRow } from './SettingsCard'

/**
 * General — who the operator is, as far as the app can know today.
 *
 * There is no `PATCH /me` and no auth, so the name and avatar are held in the same
 * preference store as everything else on this screen and go no further than this
 * browser. The card says so rather than implying a save that reaches a server. The
 * email is the one field that is genuinely not editable here: it is the identity an
 * account is keyed on, and changing it is an auth flow, not a text input.
 *
 * The avatar is a URL rather than an upload. An upload needs somewhere to upload TO;
 * a URL works today and is exactly what a backend would store anyway.
 */
export function GeneralTab() {
  const { profile, setProfile } = useLocale()

  const [name, setName] = React.useState(profile.name)
  const [avatarUrl, setAvatarUrl] = React.useState(profile.avatarUrl)

  // The store is the source of truth; this only re-seeds the draft when it changes
  // from elsewhere (a reset on the Preferences tab, or another tab of the browser).
  React.useEffect(() => {
    setName(profile.name)
    setAvatarUrl(profile.avatarUrl)
  }, [profile.name, profile.avatarUrl])

  const trimmedName = name.trim()
  const dirty = trimmedName !== profile.name || avatarUrl.trim() !== profile.avatarUrl
  const nameEmpty = trimmedName.length === 0

  const save = () => {
    setProfile({ name: trimmedName, avatarUrl: avatarUrl.trim() })
    toast.success('Profile updated. It is stored on this device until accounts land.')
  }

  return (
    <div className="space-y-6">
      <SettingsCard
        title="Profile"
        label="how_you_appear_in_the_app"
        footer={
          <div className="flex items-center justify-between gap-3">
            <Prose className="text-[12px] leading-snug text-muted">
              Saved on this device. There is no accounts backend yet, so nothing is sent anywhere.
            </Prose>
            <Button label="Save" disabled={!dirty || nameEmpty} onClick={save} />
          </div>
        }
      >
        <SettingRow
          label="Avatar"
          description="Paste an image URL. Without one you get your initials, which is what the sidebar and the topbar show today."
          control={
            <div className="flex items-center gap-3">
              <Avatar className="size-12">
                {avatarUrl.trim() && <AvatarImage src={avatarUrl.trim()} alt="" />}
                <AvatarFallback className="bg-primary-solid text-white">
                  {initialsOf(trimmedName || CURRENT_USER.name)}
                </AvatarFallback>
              </Avatar>
              <Input
                id="settings-avatar"
                value={avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                placeholder="https://…"
                autoComplete="off"
                spellCheck={false}
                className="w-[280px] max-w-full"
              />
            </div>
          }
        />

        <SettingRow
          label="Display name"
          htmlFor="settings-name"
          description="Shown in the sidebar footer and the topbar menu. Your initials are taken from it."
          control={
            <Input
              id="settings-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={nameEmpty}
              className="w-[280px] max-w-full"
            />
          }
        />

        <SettingRow
          label="Email"
          description="The address this workspace is keyed on. Changing it is an account-recovery flow, not a text field — it will move here when auth does."
          control={
            <span className="font-mono text-body text-muted tabular-nums">
              {CURRENT_USER.email}
            </span>
          }
        />
      </SettingsCard>
    </div>
  )
}
