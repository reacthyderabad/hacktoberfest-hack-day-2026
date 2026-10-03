/**
 * Priority preloading for a FrameSequence.
 *
 * A 36-frame orbit is ~36 network requests. Firing them all at once starves the
 * frame the user is actually looking at, and firing them lazily means every
 * drag hits an undecoded image and flashes. So: load outward from the current
 * index — current first, then ±1, ±2 … — under a concurrency cap.
 *
 * The URL warmed for each frame is whatever `pickFrameSource` resolves —
 * exactly the URL `<picture>` will actually request, given format support and
 * the caller's size hint. Warming a different URL (e.g. always the widest
 * WebP, which is `frame.src`) downloads bytes the browser never paints and
 * starves the ones it does.
 *
 * Decoding is delegated to core's existing image cache (`loadCachedImage`), not
 * a second cache. That cache is already deduped per-URL and shared with
 * `ImageLayer`, so a frame preloaded here is the same decoded object the GPU
 * renderer picks up if the sequence is later dropped onto the timeline.
 */

import { loadCachedImage, type ImageLoader, type LoadedImage } from '../renderer/gpu/layers/imageCache'
import { normalizeFrameIndex, type FrameSequence } from './frameSequence'
import { pickFrameSource, type FrameSourceSizeHint } from './frameSource'

export interface FramePreloaderOptions {
  /**
   * How many frames either side of the focus to treat as urgent. These are
   * queued before anything else, so a drag of a frame or two never waits.
   */
  radius?: number
  /**
   * Max simultaneous decodes. Browsers cap connections per host anyway; the
   * point here is to stop the far end of the sequence competing with the near.
   */
  concurrency?: number
  /** Injectable loader so tests never touch the DOM. */
  loader?: ImageLoader
  /** How large the frame will actually render, so preloading picks the same candidate the viewer does. */
  sizeHint?: FrameSourceSizeHint
  /** Fires after every settle (load or failure), so a caller can gate on "enough is ready". */
  onProgress?: (status: FramePreloaderStatus) => void
}

export interface FramePreloaderStatus {
  loaded: number
  total: number
  /** True once every frame has settled (loaded or failed). */
  complete: boolean
}

export interface FramePreloader {
  /** Re-prioritize around `index`. Cheap; safe to call on every frame change. */
  focus(index: number): void
  status(): FramePreloaderStatus
  /** True if this exact frame index has finished loading. */
  isLoaded(index: number): boolean
  /** Stop scheduling new work. In-flight decodes are left to settle. */
  dispose(): void
}

const DEFAULT_RADIUS = 2
const DEFAULT_CONCURRENCY = 6

/**
 * An `<img>`-based loader that (a) awaits `decode()` so a "loaded" frame is
 * actually paint-ready, not merely downloaded, and (b) only requests CORS mode
 * for genuinely cross-origin URLs — a same-origin frame gains nothing from
 * `crossOrigin` and a mismatched request mode can land in a different cache
 * bucket than the plain `<img>` the viewer renders (see ASSET-PIPELINE-AUDIT.md).
 */
function createFrameImageLoader(): ImageLoader {
  return (src) =>
    new Promise<LoadedImage>((resolve, reject) => {
      const img = document.createElement('img')
      if (typeof location !== 'undefined') {
        try {
          const url = new URL(src, location.href)
          if (url.origin !== location.origin) img.crossOrigin = 'anonymous'
        } catch {
          // Relative or unparsable src — treat as same-origin.
        }
      }
      img.onload = () => {
        img.onload = null
        img.onerror = null
        const settle = () =>
          resolve({ source: img, width: img.naturalWidth, height: img.naturalHeight })
        // decode() lets the browser finish off-main-thread work before this
        // frame is reported ready; if it's unsupported or rejects, the image
        // still painted via onload, so fall back rather than fail the frame.
        if (typeof img.decode === 'function') {
          img.decode().then(settle, settle)
        } else {
          settle()
        }
      }
      img.onerror = () => {
        img.onload = null
        img.onerror = null
        reject(new Error(`[frame-preloader] failed to load ${src}`))
      }
      img.src = src
    })
}

/** Stateless, so one instance is shared by every preloader using the real cache. */
const frameImageLoader = createFrameImageLoader()

/**
 * Order the sequence's indices by distance from `focus`, nearest first.
 * Under `wrap`, distance is measured the short way round, so focusing frame 0
 * of a closed orbit correctly treats the last frame as adjacent.
 */
function priorityOrder(sequence: FrameSequence, focus: number): number[] {
  const count = sequence.frames.length
  const wraps = sequence.loop === 'wrap'
  const distance = (i: number): number => {
    const raw = Math.abs(i - focus)
    return wraps ? Math.min(raw, count - raw) : raw
  }
  return sequence.frames
    .map((_, i) => i)
    .sort((a, b) => distance(a) - distance(b) || a - b)
}

export function createFramePreloader(
  sequence: FrameSequence,
  options: FramePreloaderOptions = {},
): FramePreloader {
  const radius = options.radius ?? DEFAULT_RADIUS
  const concurrency = Math.max(1, options.concurrency ?? DEFAULT_CONCURRENCY)
  // An explicit loader (tests; callers that don't want the shared cache)
  // bypasses `loadCachedImage` entirely, exactly as before this preloader
  // learned to resolve URLs through `pickFrameSource` — otherwise two
  // preloaders (or two test cases reusing the same frame src) would collide
  // on one shared, never-evicted-on-success cache entry.
  const explicitLoader = options.loader
  const sizeHint = options.sizeHint
  const onProgress = options.onProgress

  const settled = new Set<number>()
  const started = new Set<number>()
  let queue: number[] = []
  let inFlight = 0
  let disposed = false

  function status(): FramePreloaderStatus {
    return {
      loaded: settled.size,
      total: sequence.frames.length,
      complete: settled.size >= sequence.frames.length,
    }
  }

  function pump(): void {
    if (disposed) return
    while (inFlight < concurrency && queue.length > 0) {
      const index = queue.shift() as number
      if (started.has(index)) continue
      const frame = sequence.frames[index]
      if (!frame) continue

      started.add(index)
      inFlight++
      const done = () => {
        inFlight--
        settled.add(index)
        onProgress?.(status())
        pump()
      }
      // Failures settle too: a broken frame must not wedge the queue, and
      // loadCachedImage already evicts the entry so a later attempt can retry.
      void pickFrameSource(frame, sizeHint)
        .then((src) => (explicitLoader ? explicitLoader(src) : loadCachedImage(src, frameImageLoader)))
        .then(done, done)
    }
  }

  function focus(index: number): void {
    if (disposed) return
    const normalized = normalizeFrameIndex(sequence, index)
    const ordered = priorityOrder(sequence, normalized).filter((i) => !started.has(i))
    // The urgent window goes first; the rest trails behind in distance order so
    // the sequence still fully preloads for a later fast drag.
    const urgent: number[] = []
    const rest: number[] = []
    for (const i of ordered) {
      const raw = Math.abs(i - normalized)
      const d = sequence.loop === 'wrap'
        ? Math.min(raw, sequence.frames.length - raw)
        : raw
      ;(d <= radius ? urgent : rest).push(i)
    }
    queue = [...urgent, ...rest]
    pump()
  }

  return {
    focus,
    status,
    isLoaded: (index) => settled.has(normalizeFrameIndex(sequence, index)),
    dispose: () => {
      disposed = true
      queue = []
    },
  }
}
