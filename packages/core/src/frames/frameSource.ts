/**
 * Pick the exact URL a browser will paint for a `Frame`, so preloading can warm
 * that URL instead of guessing.
 *
 * `<picture>` resolves in document order: the first `<source>` whose `type` the
 * browser supports wins, and within it the `srcset` candidate is chosen by
 * width against the viewport. `FrameSequenceViewer` builds its `<source>` list
 * by grouping `frame.sources` by MIME type in array order (AVIF before WebP —
 * see `encode-frames.mjs`), so this function has to replicate both steps:
 * type support first, width second. Getting either step wrong means the
 * preloader downloads bytes the browser never displays — which is exactly the
 * bug this module exists to close.
 */

import type { Frame, FrameSource } from './frameSequence'

let avifSupport: Promise<boolean> | null = null
let webpSupport: Promise<boolean> | null = null

/**
 * 1x1 test payloads. Same well-known probe images Modernizr's avif/webp
 * feature tests use — not hand-rolled, since a malformed probe would report
 * false negatives and silently defeat the whole picker.
 */
const PROBES: Record<string, string> = {
  'image/avif':
    'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAABcAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQAMAAAAABNjb2xybmNseAACAAIABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAAB9tZGF0EgAKCBgABogQEDQgMgkQAAAAB8dSLfI=',
  'image/webp':
    'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA==',
}

function probeSupport(type: string): Promise<boolean> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    // SSR / jsdom: assume unsupported so preloading falls back to `frame.src`,
    // matching what the server-rendered `<picture>` degrades to.
    return Promise.resolve(false)
  }
  const probe = PROBES[type]
  if (!probe) return Promise.resolve(false)
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img.width > 0 && img.height > 0)
    img.onerror = () => resolve(false)
    img.src = probe
  })
}

/** Memoized per format — the answer never changes within a browser session. */
export function supportsImageType(type: string): Promise<boolean> {
  if (type === 'image/avif') return (avifSupport ??= probeSupport(type))
  if (type === 'image/webp') return (webpSupport ??= probeSupport(type))
  return Promise.resolve(true)
}

export interface FrameSourceSizeHint {
  /** The rendered CSS width the frame will actually occupy. */
  widthCss: number
  /** Device pixel ratio, so a Retina viewer doesn't pick a soft candidate. */
  dpr: number
}

/**
 * Group `sources` by MIME type, preserving first-seen order — the same
 * grouping `FrameSequenceViewer` does to build one `<source>` per type.
 */
function groupByType(sources: FrameSource[]): Map<string, FrameSource[]> {
  const byType = new Map<string, FrameSource[]>()
  for (const source of sources) {
    const type = source.type ?? ''
    const list = byType.get(type) ?? []
    list.push(source)
    byType.set(type, list)
  }
  return byType
}

/** Narrowest candidate that still meets the target width, else the widest. */
function pickByWidth(candidates: FrameSource[], targetWidth: number): FrameSource {
  const sorted = [...candidates].sort((a, b) => a.width - b.width)
  return sorted.find((c) => c.width >= targetWidth) ?? sorted[sorted.length - 1]!
}

/**
 * The URL this frame will actually render as, given what the browser supports
 * and how large it will be drawn. Falls back to `frame.src` when there are no
 * `sources` or none of their types are supported — the same fallback a bare
 * `<img src>` provides in a real `<picture>`.
 */
export async function pickFrameSource(frame: Frame, sizeHint?: FrameSourceSizeHint): Promise<string> {
  const sources = frame.sources
  if (!sources || sources.length === 0) return frame.src

  const byType = groupByType(sources)
  const targetWidth = sizeHint ? sizeHint.widthCss * sizeHint.dpr : Infinity

  for (const [type, candidates] of byType) {
    if (type && !(await supportsImageType(type))) continue
    return pickByWidth(candidates, targetWidth).src
  }

  return frame.src
}
