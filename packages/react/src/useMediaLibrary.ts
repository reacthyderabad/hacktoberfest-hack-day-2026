import { useMemo } from 'react'
import { importFiles, importUrl, importBlob } from '@elah/core'
import type {
  MediaAsset,
  ImportFilesResult,
  ImportUrlOptions,
  ImportBlobOptions,
} from '@elah/core'
import { useMediaLibraryStore } from './stores'

export interface UseMediaLibraryApi {
  /** Assets in insertion order. */
  assets: MediaAsset[]
  getAsset: (id: string) => MediaAsset | undefined
  removeAsset: (id: string) => void
  updateAsset: (id: string, patch: Partial<MediaAsset>) => void
  importFiles: (files: Iterable<File>) => Promise<ImportFilesResult>
  importUrl: (url: string, opts?: ImportUrlOptions) => Promise<MediaAsset>
  importBlob: (blob: Blob, opts?: ImportBlobOptions) => Promise<MediaAsset>
}

/**
 * Public hook for reading and mutating the media library. Returns assets in
 * insertion order plus the ingestion (`importFiles`/`importUrl`/`importBlob`)
 * and mutation (`removeAsset`/`updateAsset`) surface.
 *
 * Both the array and the object are memoised. Unmemoised they were a fresh
 * reference on every render, which made them useless as effect dependencies and
 * defeated `memo` on anything they were passed to — and since this hook
 * subscribes to the whole asset map, a single import (which writes three times:
 * the asset, then its thumbnail, then its waveform) re-rendered every consumer
 * several times over. Callers that only need `getAsset` should subscribe to it
 * directly instead: `useMediaLibraryStore((s) => s.getAsset)` is a stable
 * function and never re-renders at all.
 */
export function useMediaLibrary(): UseMediaLibraryApi {
  const order = useMediaLibraryStore((s) => s.order)
  const assets = useMediaLibraryStore((s) => s.assets)
  const getAsset = useMediaLibraryStore((s) => s.getAsset)
  const removeAsset = useMediaLibraryStore((s) => s.removeAsset)
  const updateAsset = useMediaLibraryStore((s) => s.updateAsset)

  const ordered = useMemo(
    () => order.map((id) => assets[id]).filter(Boolean) as MediaAsset[],
    [order, assets],
  )

  return useMemo(
    () => ({
      assets: ordered,
      getAsset,
      removeAsset,
      updateAsset,
      importFiles,
      importUrl,
      importBlob,
    }),
    [ordered, getAsset, removeAsset, updateAsset],
  )
}

/** Alias for {@link useMediaLibrary}. */
export const useAssets = useMediaLibrary
