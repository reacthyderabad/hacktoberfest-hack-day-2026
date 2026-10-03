/**
 * drawRect — clip→stage placement math shared by every quad-based layer
 * (video, image). Pure functions: a clip's optional `Transform` + its content
 * size in, a pixel draw rect and a clip-space matrix out.
 *
 * The single behaviour worth calling out: with NO explicit transform the clip is
 * *contained* within the stage (object-fit: contain), never stretched. An
 * explicit transform is taken as the author's intent and applied verbatim.
 */

import type { Transform } from '../../../types'
import { computeContainRect, computeCoverRect } from './objectFit'

/** Pixel rect (stage space, origin top-left) plus a rotation about its centre. */
export interface DrawRect {
  x: number
  y: number
  width: number
  height: number
  rotation: number
}

/** Source-space crop window, normalized 0..1 of the media's natural size, origin top-left. */
export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

/** The no-op crop — the full source frame. */
export const FULL_CROP: CropRect = { x: 0, y: 0, width: 1, height: 1 }

/** Smallest allowed crop extent on either axis, as a fraction of the full source. */
const MIN_CROP_FRACTION = 0.05

/**
 * Clamp a crop window into the unit square with a non-degenerate size.
 * `undefined` (no crop authored yet) resolves to the full frame.
 */
export function normalizeCrop(crop?: CropRect): CropRect {
  if (!crop) return FULL_CROP
  const width = Math.min(1, Math.max(MIN_CROP_FRACTION, crop.width))
  const height = Math.min(1, Math.max(MIN_CROP_FRACTION, crop.height))
  const x = Math.min(1 - width, Math.max(0, crop.x))
  const y = Math.min(1 - height, Math.max(0, crop.y))
  return { x, y, width, height }
}

/** The effective (visible) content size after cropping — what the draw rect is sized from. */
export function croppedContentSize(
  contentWidth: number,
  contentHeight: number,
  crop?: CropRect,
): { width: number; height: number } {
  if (!crop) return { width: contentWidth, height: contentHeight }
  const c = normalizeCrop(crop)
  return { width: contentWidth * c.width, height: contentHeight * c.height }
}

/**
 * Build a column-major 3×3 transform matrix mapping the unit quad (0..1,
 * origin top-left) to clip space for a rect at pixel (x,y,w,h) on a stage
 * of size (sw, sh), with optional rotation about the rect centre.
 *
 * The rotation happens in PIXEL space and is normalized afterwards — the two
 * are separate steps, and the stage's own aspect ratio must not leak into the
 * rotation itself. Each basis vector is therefore divided by the axis it lands
 * ON, which is why there are four ratios here and not two: the rect's width
 * edge contributes `cos` to X (÷ stageWidth) and `sin` to Y (÷ stageHeight).
 *
 * Normalizing first and rotating afterwards (one `w/stageWidth` reused for both
 * of the width edge's components) rotates inside a squashed space, and scales
 * the result by the stage aspect: a 90° turn on a 9:16 stage came out 1.78×
 * tall and 0.56× wide. That disagreed with BOTH of the other two paths that
 * place the same rect — `ExportWorker`'s `ctx.rotate` and the preview overlay's
 * CSS `rotate()`, which are true pixel-space rotations — so a rotated clip
 * rendered as a stretched smear inside a correctly-rotated selection box.
 * Unrotated clips are unaffected: at rotation 0 the cross terms vanish and this
 * reduces to exactly the previous matrix.
 *
 * Y stays top-down here; `quad.vert` negates it on the way to GL's Y-up NDC. So
 * a positive rotation is clockwise on screen, matching `Transform.rotation`.
 */
export function buildTransformMatrixFromRect(
  rect: DrawRect,
  stageWidth: number,
  stageHeight: number,
): Float32Array {
  const sc = Math.cos(rect.rotation)
  const ss = Math.sin(rect.rotation)

  // Column 0: where the quad's u axis (the rect's width edge) lands.
  const m00 = (2 * rect.width * sc) / stageWidth
  const m01 = (2 * rect.width * ss) / stageHeight
  // Column 1: where the quad's v axis (the rect's height edge) lands.
  const m10 = (-2 * rect.height * ss) / stageWidth
  const m11 = (2 * rect.height * sc) / stageHeight

  // Column 2: put the quad's centre (0.5, 0.5) on the rect's pixel centre —
  // which is also the pivot, so this is what makes the rotation centred.
  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2
  const tx = (2 * cx) / stageWidth - 1 - (m00 + m10) / 2
  const ty = (2 * cy) / stageHeight - 1 - (m01 + m11) / 2

  return new Float32Array([
    m00, m01, 0,
    m10, m11, 0,
    tx, ty, 1,
  ])
}

/**
 * Convert a normalized Transform + content size into a pixel draw rect.
 *
 * `scale` is the uniform factor; `scaleX`/`scaleY` are optional per-axis
 * multipliers layered on top of it, which is what lets a clip be stretched
 * freely in one direction. Omitting them means 1, so a transform authored
 * before free resize existed resolves exactly as it always did.
 */
export function resolveTransformRect(
  transform: Transform,
  stageWidth: number,
  stageHeight: number,
  contentWidth: number,
  contentHeight: number,
  crop?: CropRect,
): DrawRect {
  const content = croppedContentSize(contentWidth, contentHeight, crop)
  const width = content.width * transform.scale * (transform.scaleX ?? 1)
  const height = content.height * transform.scale * (transform.scaleY ?? 1)

  const anchorPxX = transform.anchor.x * width
  const anchorPxY = transform.anchor.y * height

  const x = transform.x * stageWidth - anchorPxX
  const y = transform.y * stageHeight - anchorPxY

  return {
    x,
    y,
    width,
    height,
    rotation: transform.rotation,
  }
}

/**
 * Resolve the pixel draw rect for any clip with an optional transform.
 *
 * - No transform + known content size → contain the content within the stage
 *   (letterbox/pillarbox inside the project frame; never stretched).
 * - No transform + unknown content size (first frame not yet uploaded) → fill
 *   the stage for that one tick.
 * - Explicit transform → applied verbatim relative to the content size.
 */
export function resolveDrawRect(
  transform: Transform | undefined,
  stageWidth: number,
  stageHeight: number,
  contentWidth?: number,
  contentHeight?: number,
  crop?: CropRect,
): DrawRect {
  if (!transform) {
    if (contentWidth && contentHeight) {
      const content = croppedContentSize(contentWidth, contentHeight, crop)
      const fit = computeContainRect(content.width, content.height, stageWidth, stageHeight)
      return { x: fit.x, y: fit.y, width: fit.width, height: fit.height, rotation: 0 }
    }
    return { x: 0, y: 0, width: stageWidth, height: stageHeight, rotation: 0 }
  }

  return resolveTransformRect(
    transform,
    stageWidth,
    stageHeight,
    contentWidth ?? stageWidth,
    contentHeight ?? stageHeight,
    crop,
  )
}

/**
 * Synthesize the explicit Transform that reproduces the default "contain"
 * placement of a clip with no transform of its own.
 *
 * The renderer draws a transform-less clip *contained* within the stage (see
 * `resolveDrawRect`). When the user first grabs such a clip in the interactive
 * overlay, we need a concrete `Transform` to apply the drag/resize delta to —
 * but writing one must not move the clip. This returns exactly the transform
 * whose draw rect equals the contain rect, so baking it in is visually a no-op:
 * feeding the result back through `resolveTransformRect` yields the same rect as
 * `computeContainRect`.
 *
 * Uses `anchor {0.5,0.5}` so `x`/`y` are the clip centre (matching the text
 * model), and a uniform `scale` of contain-width ÷ content-width.
 */
export function transformFromContainRect(
  contentWidth: number,
  contentHeight: number,
  stageWidth: number,
  stageHeight: number,
): Transform {
  const fit = computeContainRect(contentWidth, contentHeight, stageWidth, stageHeight)
  return {
    x: stageWidth > 0 ? (fit.x + fit.width / 2) / stageWidth : 0.5,
    y: stageHeight > 0 ? (fit.y + fit.height / 2) / stageHeight : 0.5,
    scale: contentWidth > 0 ? fit.width / contentWidth : 1,
    rotation: 0,
    anchor: { x: 0.5, y: 0.5 },
  }
}

/**
 * Synthesize the explicit Transform that fits a clip's content to *cover* the
 * stage (CSS `object-fit: cover`), cropping whichever axis overflows instead
 * of letterboxing. Useful for callers that place clips programmatically (e.g.
 * random project generation) and want off-aspect media to fill the frame
 * rather than default to the renderer's contain behaviour.
 *
 * Same shape as `transformFromContainRect`: anchor `{0.5,0.5}`, uniform scale.
 */
export function transformFromCoverRect(
  contentWidth: number,
  contentHeight: number,
  stageWidth: number,
  stageHeight: number,
): Transform {
  const fit = computeCoverRect(contentWidth, contentHeight, stageWidth, stageHeight)
  return {
    x: stageWidth > 0 ? (fit.x + fit.width / 2) / stageWidth : 0.5,
    y: stageHeight > 0 ? (fit.y + fit.height / 2) / stageHeight : 0.5,
    scale: contentWidth > 0 ? fit.width / contentWidth : 1,
    rotation: 0,
    anchor: { x: 0.5, y: 0.5 },
  }
}

/** Build the clip-space transform matrix for a clip with an optional transform. */
export function buildDrawTransformMatrix(
  transform: Transform | undefined,
  stageWidth: number,
  stageHeight: number,
  contentWidth?: number,
  contentHeight?: number,
  crop?: CropRect,
): Float32Array {
  return buildTransformMatrixFromRect(
    resolveDrawRect(transform, stageWidth, stageHeight, contentWidth, contentHeight, crop),
    stageWidth,
    stageHeight,
  )
}
