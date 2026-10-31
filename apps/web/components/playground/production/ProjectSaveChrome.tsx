'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { missingMediaSummary } from '@elah/editor'
import { useProjectSaveStore } from './projectSave.store'

/**
 * The clips whose media didn't come back.
 *
 * A video or picture added straight from the user's own device lives at a
 * `blob:` URL that only exists for as long as that page does. The clip survives
 * a save — its name, its place on the timeline, its length — but the file
 * behind it does not, so on reopening it is a clip that plays nothing.
 *
 * Silence is the wrong answer to that. The user would find it during playback,
 * as an unexplained gap, and have no idea which of their files to add again.
 * This names them and says what fixes it. Dismissible, because it is
 * information rather than a decision, and the clips stay on the timeline either
 * way.
 */
export function ProjectMediaNotice() {
  const missing = useProjectSaveStore((s) => s.missingMedia)
  const [dismissed, setDismissed] = useState(false)

  // A fresh restore is worth speaking up about again.
  useEffect(() => setDismissed(false), [missing])

  if (dismissed || missing.length === 0) return null

  const names = missingMediaSummary(missing)
  const count = missing.length

  return (
    <div
      role="status"
      className="flex items-start gap-2 border-b border-ed-border bg-ed-card px-3 py-2 text-[13px] text-ed-text"
    >
      <AlertTriangle size={13} className="mt-[2px] shrink-0 text-ed-error" aria-hidden />
      <p className="min-w-0 flex-1">
        {count === 1 ? '1 clip is' : `${count} clips are`} still on the timeline but{' '}
        {count === 1 ? 'its file' : 'their files'} didn&apos;t come back —{' '}
        <span className="text-ed-text-muted">{names}</span>. {count === 1 ? 'It was' : 'They were'}{' '}
        added from your device, so add the {count === 1 ? 'file' : 'files'} again to see{' '}
        {count === 1 ? 'it' : 'them'} play.
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded px-1 text-ed-text-muted hover:text-ed-text"
      >
        Dismiss
      </button>
    </div>
  )
}
