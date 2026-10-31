'use client'

import { useCallback, useEffect, useRef } from 'react'
import {
  hydrateMediaLibrary,
  mediaLibraryStore,
  refreshMissingThumbnails,
  snapshotMediaLibrary,
  type Project as EditorDocument,
} from '@elah/editor'
import {
  readMediaLibrarySnapshot,
  writeMediaLibrarySnapshot,
  type MediaLibraryScope,
} from '@/lib/media-library-snapshot'

/** How long the library must sit still before it is worth a write. */
const WRITE_DEBOUNCE_MS = 1000

/** Every media clip's source in a composition — what `hydrate` needs to decide
 * whether a dead `blob:` asset is still worth restoring. */
export function referencedSrcsOf(project: EditorDocument): Set<string> {
  const srcs = new Set<string>()
  for (const clips of Object.values(project.clips)) {
    for (const clip of clips) {
      if (typeof clip.src === 'string' && clip.src.length > 0) srcs.add(clip.src)
    }
  }
  return srcs
}

export interface UseMediaLibrarySnapshotApi {
  /**
   * Put the stored library back and start re-decoding whatever came back
   * without thumbnails. Resolves once the library is populated, so a caller can
   * re-link against it.
   *
   * Resolves with the id of every entry in the stored snapshot - the raw list,
   * *before* `hydrateMediaLibrary` drops unreferenced `blob:` entries - so the
   * caller can tell which stored file blobs are still wanted. Empty when there
   * is no snapshot (or hydration is disabled).
   */
  hydrate: (referencedSrcs: ReadonlySet<string>) => Promise<Set<string>>
}

/**
 * Keeps a page load from throwing away everything the media library knows.
 *
 * The library is decoded, not stored: thumbnails come from seeking a video and
 * drawing frames to a canvas, waveforms from decoding its audio. None of that
 * is in the saved composition, and the library itself is module-scoped and
 * rebuilt empty every load — so before this, a refresh replaced every clip's
 * filmstrip with a grey placeholder box and there was nothing to recover it
 * from. This snapshots the library as it changes and hydrates it on open.
 */
export function useMediaLibrarySnapshot(
  scope: MediaLibraryScope,
  { enabled = true }: { enabled?: boolean } = {},
): UseMediaLibrarySnapshotApi {
  const hydrate = useCallback(
    async (referencedSrcs: ReadonlySet<string>): Promise<Set<string>> => {
      if (!enabled) return new Set()
      const stored = await readMediaLibrarySnapshot(scope)
      if (!stored || stored.length === 0) return new Set()
      const snapshotIds = new Set(stored.map((entry) => entry.id))
      const { needsThumbnail } = hydrateMediaLibrary(stored, { referencedSrcs })
      // Cosmetic and fire-and-forget: a decode that fails costs a filmstrip.
      refreshMissingThumbnails(needsThumbnail)
      return snapshotIds
    },
    [scope, enabled],
  )

  // Read by the subscription below, which must not re-subscribe when the
  // caller's identity changes underneath it.
  const scopeRef = useRef(scope)
  scopeRef.current = scope

  useEffect(() => {
    if (!enabled) return
    let timer: ReturnType<typeof setTimeout> | null = null

    const unsubscribe = mediaLibraryStore.subscribe(() => {
      // An import writes several times in a row — the asset, then its
      // thumbnail, then its waveform. Only the settled result is worth storing.
      if (timer !== null) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        // Read fresh rather than closing over the notification's snapshot: the
        // whole point of the debounce is that more writes landed since.
        const state = mediaLibraryStore.getState()
        if (state.order.length === 0) return
        void writeMediaLibrarySnapshot(scopeRef.current, snapshotMediaLibrary(state))
      }, WRITE_DEBOUNCE_MS)
    })

    return () => {
      unsubscribe()
      // Cancel rather than flush: the only reason this component is unmounting
      // is that the editor is going away, and the bridge empties the library on
      // its way out. Flushing here would store that emptiness.
      if (timer !== null) clearTimeout(timer)
    }
  }, [enabled])

  return { hydrate }
}
