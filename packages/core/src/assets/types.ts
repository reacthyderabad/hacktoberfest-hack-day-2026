/** Kind of media this asset represents. */
export type MediaKind = 'video' | 'audio' | 'image'

/** A tallied object/subject detected across a video's analyzed frames. */
export interface MediaAssetTopObject {
  name: string
  occurrences: number
}

/**
 * AI-generated understanding of a video's content (tags, summary, detected
 * objects), attached to an asset by the host app when it imports one from its
 * own gallery or catalogue. The engine never produces or interprets it: this
 * is a plain data shape the host fills in and reads back, so `@elah/core`
 * stays independent of any backend or app-level gallery type.
 */
export interface MediaAssetAnalysis {
  tags: string[]
  summary: string
  frameCount: number
  topObjects: MediaAssetTopObject[]
  durationSec: number
}

/**
 * A single piece of source media registered in the editor's MediaLibrary.
 * Clips reference assets by `id`; the asset owns the metadata (duration,
 * dimensions, source fps, thumbnail) so multiple clips can share a source
 * without duplicating it.
 */
export interface MediaAsset {
  id: string
  kind: MediaKind
  name: string
  /** Object URL, blob URL, or persisted asset URL. */
  src: string
  /** Source duration in seconds. */
  durationSec: number
  width?: number
  height?: number
  /** Intrinsic frame rate of the source. Undefined for audio / image. */
  sourceFps?: number
  /** Whether a video source carries an audio track. Set during import (best-effort
   * sync probe, refined by async audio decode). Undefined for audio / image. */
  hasAudio?: boolean
  /** Single representative thumbnail (mid-frame for video). Used by the AssetPanel. */
  thumbnailUrl?: string
  /** A few evenly-spaced frames decoded once per video asset, tiled across the
   * timeline clip to fake a filmstrip. Undefined for audio. */
  thumbnailStrip?: string[]
  /** Normalized (0..1) waveform peaks for audio/video sources with audio. */
  waveform?: Float32Array
  byteSize: number
  /** File last-modified timestamp from the source `File`. Used for dedupe. */
  lastModified: number
  /** Epoch ms. Used for display order and tie-breaking. */
  addedAt: number
  /**
   * AI content analysis of this source, produced by the backend's async
   * pipeline. Set at import for a gallery item whose analysis had already
   * completed, and otherwise patched in later by the app once the pipeline
   * finishes (uploads have no analysis at import time by definition — the file
   * has only just reached the backend). So it is undefined until analysis
   * lands, and stays undefined for a source that was never analyzed or whose
   * analysis failed. Consumed by caption auto-generation and by narration
   * drafting.
   */
  analysis?: MediaAssetAnalysis
  /**
   * `'pending'` while metadata (duration/dimensions) is still being probed from
   * a remote URL — `durationSec`/`width`/`height` hold provisional/fallback
   * values until this flips to `'ready'`. Undefined (treated as `'ready'`) for
   * every asset registered the normal, synchronously-probed way.
   */
  status?: 'pending' | 'ready'
}

/** MIME type used on `dataTransfer` for drags originating from the AssetPanel. */
export const MEDIA_DRAG_MIME = 'application/x-elah-media'

/** Payload encoded into `dataTransfer.getData(MEDIA_DRAG_MIME)`. */
export interface DragMediaPayload {
  kind: 'media-asset'
  assetId: string
}

/**
 * Extra `dataTransfer` type set alongside {@link MEDIA_DRAG_MIME} that encodes
 * the asset's `MediaKind`. `dataTransfer.getData` is only readable on `drop`
 * in most browsers, but `dataTransfer.types` is readable throughout the drag —
 * so this lets drop targets show a compatible/incompatible highlight on
 * dragenter/dragover, before the actual payload can be read.
 */
export function mediaDragKindMime(kind: MediaKind): string {
  return `application/x-elah-media-kind-${kind}`
}
