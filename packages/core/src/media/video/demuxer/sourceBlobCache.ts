/**
 * Shared whole-file Blob cache for video sources.
 *
 * Every consumer of a video's bytes currently downloads the file for itself:
 * the has-audio container probe (`assets/hasAudio.ts`), the demuxer backend
 * (`createMediabunnyBackend.open`), and a second demuxer for the same source on
 * a copy-pasted clip. For a proxied gallery video — which cannot be range-read,
 * because the proxy route answers `Accept-Ranges: none` — that is the same
 * multi-megabyte download two to four times over, and the second one starts
 * only once the user has already dropped the clip on the timeline. The wait
 * they see between drop and first frame is very largely that download.
 *
 * So the download is shared instead. One promise per `src`, handed to whoever
 * asks first and reused by everyone after — which means the probe that import
 * already kicks off (`registerAsset` → `determineAssetHasAudio`) doubles as the
 * warm-up for the decoder that runs minutes later, and the drop lands on bytes
 * that are already in memory.
 *
 * Bounded, unlike `imageCache`, because the entries are whole video files: an
 * LRU of `maxEntries` keeps a working set without letting a long editing
 * session pin every video the user has ever touched. Eviction drops only this
 * cache's reference — a `BlobSource` already holding the Blob keeps it alive
 * for as long as its `Input` lives, exactly as before this cache existed.
 */

/** Fetches a source's bytes. Injectable so tests never touch the network. */
export type BlobFetcher = (src: string) => Promise<Blob>

export const defaultBlobFetcher: BlobFetcher = (src) =>
  fetch(src).then((r) => {
    if (!r.ok) {
      throw new Error(`sourceBlobCache: failed to fetch "${src}" (${r.status} ${r.statusText})`)
    }
    return r.blob()
  })

export interface SourceBlobCache {
  /** The shared download for `src`, started if nobody has started it yet. */
  resolve: (src: string) => Promise<Blob>
  /** Start the download without waiting for it. Failures are swallowed. */
  warm: (src: string) => void
  /** Forget `src`, so the next `resolve` downloads again. */
  evict: (src: string) => void
  /** Forget everything. */
  clear: () => void
  /** How many sources are currently held. Test seam. */
  readonly size: number
}

export interface CreateSourceBlobCacheOpts {
  /** How many sources to hold before evicting the least recently used. */
  maxEntries?: number
  fetcher?: BlobFetcher
}

export function createSourceBlobCache(opts: CreateSourceBlobCacheOpts = {}): SourceBlobCache {
  const maxEntries = Math.max(1, opts.maxEntries ?? 4)
  const fetcher = opts.fetcher ?? defaultBlobFetcher

  // Map iteration order is insertion order, so re-inserting on every hit makes
  // the first key the least recently used.
  const entries = new Map<string, Promise<Blob>>()

  const touch = (src: string, promise: Promise<Blob>): void => {
    entries.delete(src)
    entries.set(src, promise)
    while (entries.size > maxEntries) {
      const oldest = entries.keys().next()
      if (oldest.done) break
      entries.delete(oldest.value)
    }
  }

  const resolve = (src: string): Promise<Blob> => {
    const cached = entries.get(src)
    if (cached) {
      touch(src, cached)
      return cached
    }

    const promise = fetcher(src)
    // A failed download must not be remembered as the answer — but a *newer*
    // attempt for the same src must not be dropped either, hence the identity
    // guard (same rule as `loadCachedImage`).
    promise.catch(() => {
      if (entries.get(src) === promise) entries.delete(src)
    })
    touch(src, promise)
    return promise
  }

  return {
    resolve,
    warm: (src) => {
      // The rejection is already handled inside `resolve`; this catch only stops
      // the extra branch created here from surfacing as an unhandled rejection.
      void resolve(src).catch(() => {})
    },
    evict: (src) => {
      entries.delete(src)
    },
    clear: () => {
      entries.clear()
    },
    get size() {
      return entries.size
    },
  }
}

/**
 * The cache the editor actually uses. Shared across the has-audio probe, every
 * demuxer backend and the preview's warm-up, which is the whole point of it.
 */
export const sourceBlobCache: SourceBlobCache = createSourceBlobCache()

/**
 * Start downloading a video source now, so a later drop onto the timeline finds
 * the bytes already in memory. Safe to call repeatedly — it is a cache hit
 * after the first call.
 */
export function warmVideoSrc(src: string): void {
  sourceBlobCache.warm(src)
}
