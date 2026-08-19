'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { ImportWizard } from './ImportWizard'

/**
 * The full-page mount of the wizard (`/accounts/import`).
 *
 * Identical wizard, different frame: on a page there is no overlay to dismiss, so the
 * only way to lose an in-progress import is a reload or a navigation — which is
 * exactly what `beforeunload` catches. The panel is height-capped rather than fluid
 * so the step footer stays where it is on every step and the operator is not chasing
 * the Continue button down a growing page.
 */
export function ImportPagePanel() {
  const router = useRouter()
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (!busy) return

    function warn(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [busy])

  return (
    <div className="flex h-[calc(100vh-13rem)] min-h-[460px] flex-col overflow-hidden rounded-lg border border-border bg-surface">
      <ImportWizard
        onBusyChange={setBusy}
        onDone={() => {
          setBusy(false)
          router.push('/accounts')
        }}
      />
    </div>
  )
}
