'use client'

import { useSelectionStore, useTracksStore, type Clip } from '@elah/editor'

/**
 * The one selected text clip, or null.
 *
 * Null for a multi-selection as well as for an empty one: every caller acts on
 * a single clip, and silently picking the first of three would apply a template
 * to something the user did not point at.
 *
 * Shared so every surface that acts on "the selected text clip" agrees about
 * what that means.
 */
export function useSelectedTextClip(): Clip | null {
  const selectedClipIds = useSelectionStore((s) => s.selectedClipIds)
  const clips = useTracksStore((s) => s.clips)

  if (selectedClipIds.size !== 1) return null
  const [id] = selectedClipIds
  for (const trackClips of Object.values(clips)) {
    const clip = trackClips.find((c) => c.id === id && c.type === 'text')
    if (clip) return clip
  }
  return null
}
