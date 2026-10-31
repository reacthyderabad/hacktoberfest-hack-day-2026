'use client'

import { useEffect, useRef } from 'react'
import {
  relinkProjectMedia,
  scheduleThumbnailById,
  useMediaLibraryStore,
  useTimelineEngine,
  type Project as EditorDocument,
} from '@elah/editor'
import { createAutosave, type Autosave } from '@/lib/project-autosave'
import {
  backupUnreadableLocalProject,
  localStorageOrNull,
  readLocalProject,
  writeLocalProject,
} from '@/lib/local-project'
import { DEFAULT_TRACK_HEIGHT } from './trackConstants'
import { useProjectSaveStore } from './projectSave.store'
import { referencedSrcsOf, useMediaLibrarySnapshot } from './useMediaLibrarySnapshot'
import { deleteMediaBlob, getAllStoredMediaIds, getMediaRecord } from '@/lib/media-file-storage'
import { isPurgeable, planBlobRestore } from '@/lib/blob-restore'

/**
 * Keeps the standalone `/editor` timeline across a refresh, in `localStorage`.
 *
 * Mounted inside `EditorProvider`, because the engine comes from that context.
 *
 * It reuses `createAutosave` rather than a debounce of its own. The rules that
 * helper exists to enforce are about *when* to write, not about where, and two
 * of them matter just as much here: a drag emits a change per commit and must
 * write once at the end of it, and the change the restore itself emits must
 * write nothing (`baseline`). The version is pinned at 0 and the save resolves
 * synchronously, so the conflict path can never be entered.
 *
 * What a refresh cannot bring back is a file the user dragged in from their own
 * device: its `blob:` URL died with the session that minted it. That clip is
 * *kept* — name, position, length, all of it — and named to the user by
 * `ProjectMediaNotice`. Dropping it would be
 * the one outcome they could neither see nor undo. Its filmstrip does come
 * back, from the media-library snapshot: the thumbnails were decoded while the
 * file was still readable and stored as images, so the clip is recognisable on
 * the timeline even though its source is gone.
 *
 * Imported files' bytes live in IndexedDB (`lib/media-file-storage`). On load
 * a stored blob is brought back only if the library snapshot or a restored clip
 * still points at it; the rest are purged (`lib/blob-restore`), so deleting
 * media really deletes it. This runs even when no composition was saved, so
 * media imported but never placed survives a reload.
 *
 * Scope worth knowing: one key, so two `/editor` tabs are last-write-wins.
 * That's acceptable for a local scratch composition.
 */
export function LocalProjectBridge() {
  const engine = useTimelineEngine()
  const setMissingMedia = useProjectSaveStore((s) => s.setMissingMedia)
  const { hydrate } = useMediaLibrarySnapshot('local')

  // Read by the pagehide handler below, which is registered once and must not
  // re-register every time the autosave is rebuilt.
  const autosaveRef = useRef<Autosave<EditorDocument> | null>(null)

  useEffect(() => {
    const store = localStorageOrNull()
    // No storage (SSR, private mode, blocked). The editor works; it just won't
    // remember — which is exactly what it did before this component existed.
    if (store === null) return

    const restore = readLocalProject(store, { defaultTrackHeight: DEFAULT_TRACK_HEIGHT })

    /**
     * A document this build can't read is copied aside before anything is
     * allowed to write over it.
     *
     * The blob is on the user's own machine and now sits under a second key, so
     * there is nothing left to protect and nothing worth a modal over — the
     * editor opens empty and saves normally.
     */
    if (restore.kind === 'refused') {
      backupUnreadableLocalProject(store)
      console.warn(
        `[editor] Stored timeline could not be opened (${restore.reason}); ` +
          'it has been kept under "myeditor-local-project-backup".',
      )
    }

    const restored = restore.kind === 'ready' ? restore.project : null

    const autosave = createAutosave<EditorDocument>({
      // No versioning: one writer, one key, no way to conflict.
      version: 0,
      // What storage already holds. Scheduling it writes nothing, which is what
      // makes the restore below a read.
      baseline: restored,
      save: (document) => {
        // Deliberately synchronous before the first yield: `flush` relies on
        // that to get the write out inside a `pagehide` handler, where a real
        // async gap would never resume.
        writeLocalProject(store, document)
        return Promise.resolve({ documentVersion: 0 })
      },
      onStatus: (status) => {
        if (status.kind === 'idle' || status.kind === 'saved') {
          useProjectSaveStore.getState().setSaveStatus('saved')
        } else if (status.kind === 'saving') {
          useProjectSaveStore.getState().setSaveStatus('saving')
        } else if (status.kind === 'dirty') {
          useProjectSaveStore.getState().setSaveStatus('dirty')
        }
      },
    })
    autosaveRef.current = autosave

    let live = true
    let projectLoaded = !restored
    // Every object URL this effect minted, revoked in the cleanup below.
    const mintedUrls: string[] = []
    const mint = (blob: Blob): string => {
      const url = URL.createObjectURL(blob)
      mintedUrls.push(url)
      return url
    }

    void (async () => {
      // 1. Hydrate the library from the snapshot written during the session
      // that saved this composition. Runs with or without a saved project: media
      // imported but never placed on the timeline must survive too. The raw
      // snapshot ids come back because hydration drops unreferenced `blob:`
      // entries, and those are exactly the ones whose bytes we still want.
      const snapshotIds = await hydrate(restored ? referencedSrcsOf(restored) : new Set())
      if (!live) return

      // 2. One pass over the stored blobs: keep what the snapshot or a restored
      // clip still points at, purge the rest.
      const wanted = new Set(snapshotIds)
      if (restored) {
        for (const clips of Object.values(restored.clips)) {
          for (const clip of clips) if (clip.assetId) wanted.add(clip.assetId)
        }
      }
      const { restore, purge } = planBlobRestore(await getAllStoredMediaIds(), wanted)
      if (!live) return

      for (const id of purge) {
        // An import that landed while this pass was running is already in the
        // live library; its blob is not garbage just because no snapshot has
        // caught up with it yet.
        if (useMediaLibraryStore.getState().assets[id]) continue
        // Same race across a reload: the snapshot is debounced, so a file
        // imported moments before a refresh has bytes but no reference yet.
        // Reading the record costs a blob read, but only for candidates, and
        // in a healthy library there are none.
        const candidate = await getMediaRecord(id)
        if (!live) return
        if (candidate && !isPurgeable(candidate.savedAt, Date.now())) continue
        await deleteMediaBlob(id)
      }

      const restoredBlobSrcs = new Map<string, string>()
      const assetIdByOldSrc = new Map<string, string>()
      const recoveredClipIds = new Set<string>()

      for (const id of restore) {
        const record = await getMediaRecord(id)
        if (!live) return
        if (!record || !record.blob) continue

        const freshUrl = mint(record.blob)
        restoredBlobSrcs.set(id, freshUrl)

        const existing = useMediaLibraryStore.getState().assets[id]
        if (existing) {
          restoredBlobSrcs.set(existing.src, freshUrl)
          assetIdByOldSrc.set(existing.src, id)
          useMediaLibraryStore.getState().updateAsset(id, { src: freshUrl })
        } else {
          const kind = record.type?.startsWith('video/')
            ? 'video'
            : record.type?.startsWith('audio/')
              ? 'audio'
              : 'image'
          useMediaLibraryStore.getState().addAsset({
            id,
            kind,
            name: record.name || 'Uploaded Media',
            src: freshUrl,
            status: 'ready',
            durationSec: 0,
            byteSize: record.blob.size || 0,
            lastModified: (record.blob as File).lastModified || record.savedAt || Date.now(),
            addedAt: record.savedAt || Date.now(),
          })
        }
        scheduleThumbnailById(id)
      }

      // Nothing saved: the library is restored and there is no timeline to load.
      if (!restored) return

      // 3. Pre-repair the restored project with fresh URLs and linked assetIds
      // BEFORE the engine loads it.
      const updatedAssets = useMediaLibraryStore.getState().assets
      const repairedClips: Record<string, (typeof restored.clips)[string]> = {}
      for (const [trackId, clips] of Object.entries(restored.clips)) {
        repairedClips[trackId] = clips.map((clip) => {
          let newSrc = clip.src
          let assetId = clip.assetId

          if (typeof clip.src === 'string' && restoredBlobSrcs.has(clip.src)) {
            newSrc = restoredBlobSrcs.get(clip.src)!
            if (!assetId && assetIdByOldSrc.has(clip.src)) {
              assetId = assetIdByOldSrc.get(clip.src)
            }
            recoveredClipIds.add(clip.id)
          } else if (clip.assetId) {
            const fresh =
              updatedAssets[clip.assetId]?.src ||
              (restoredBlobSrcs.has(clip.assetId) ? restoredBlobSrcs.get(clip.assetId) : undefined)
            if (fresh) {
              newSrc = fresh
              recoveredClipIds.add(clip.id)
            }
          }

          // Fallback: If clip has no assetId, match by src or name in updatedAssets
          if (!assetId) {
            const matched = Object.values(updatedAssets).find(
              (a) => a.src === clip.src || (a.name === clip.name && a.kind === clip.type),
            )
            if (matched) {
              assetId = matched.id
              if (!newSrc || newSrc.startsWith('blob:')) {
                newSrc = matched.src
              }
              recoveredClipIds.add(clip.id)
            }
          }

          return {
            ...clip,
            src: newSrc,
            ...(assetId ? { assetId } : {}),
          }
        })
      }

      const projectToLoad: EditorDocument = {
        ...restored,
        clips: repairedClips,
      }

      if (!live) return

      // 4. Load the repaired project directly into the engine with working URLs
      engine.loadProject(projectToLoad)
      autosave.rebase(projectToLoad)
      projectLoaded = true

      const { missing } = relinkProjectMedia(projectToLoad, mediaLibraryAssets())
      // Clips successfully recovered from IndexedDB are no longer missing
      const actualMissing = missing.filter((m) => !recoveredClipIds.has(m.clipId))
      setMissingMedia(actualMissing)
    })()

    const onChange = () => {
      if (!projectLoaded) return
      const current = engine.getProject()
      autosave.schedule(current)
      const missing = useProjectSaveStore.getState().missingMedia
      if (missing.length > 0) {
        const remainingClipIds = new Set<string>()
        for (const bucket of Object.values(current.clips)) {
          for (const clip of bucket) remainingClipIds.add(clip.id)
        }
        const nextMissing = missing.filter((m) => remainingClipIds.has(m.clipId))
        if (nextMissing.length !== missing.length) {
          setMissingMedia(nextMissing)
        }
      }
    }
    engine.on('change', onChange)

    return () => {
      live = false
      engine.off('change', onChange)
      // Object URLs pin their blob in memory until revoked.
      for (const url of mintedUrls) URL.revokeObjectURL(url)
      // An edit from the last couple of seconds would otherwise die with the
      // component. `flush` performs the write before it yields, so disposing
      // immediately afterwards cancels nothing.
      void autosave.flush()
      autosave.dispose()
      autosaveRef.current = null
      // The store is module-scoped: a missing-media notice left behind here
      // would greet whatever editor mounts next.
      setMissingMedia([])
    }
  }, [engine, setMissingMedia, hydrate])

  /**
   * A tab closed or backgrounded mid-debounce would lose the last edit.
   * `pagehide` is the one event that fires reliably on mobile (`beforeunload`
   * does not), and `visibilitychange` covers the tab that is switched away from
   * and then discarded under memory pressure without ever firing anything else.
   * Both are cheap here — the write is synchronous and local.
   */
  useEffect(() => {
    const flush = () => void autosaveRef.current?.flush()
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return null
}

function mediaLibraryAssets(): { id: string; src: string }[] {
  return Object.values(useMediaLibraryStore.getState().assets)
}
