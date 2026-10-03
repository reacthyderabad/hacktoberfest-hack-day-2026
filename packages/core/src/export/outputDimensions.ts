/**
 * Compute the encoded output resolution for a given project stage and a
 * requested short-edge pixel count (the `outputHeight` export option).
 *
 * `outputHeight` names the stage's *short* edge, matching how "1080p" means
 * 1920x1080 landscape or 1080x1920 portrait — 1080 is the short edge either
 * way. Scaling directly against `stageHeight` only holds for landscape stages
 * (height already is the short edge); for a portrait stage, height is the
 * LONG edge, so that undersizes the short edge (width) by the same factor the
 * aspect ratio departs from 1:1 — a 9:16 "1080p" export came out 608x1080
 * instead of 1080x1920.
 *
 * Even dimensions are required by most video codecs (H.264/VP9 need even
 * width/height for chroma subsampling).
 */
export function computeExportDimensions(
  stageWidth: number,
  stageHeight: number,
  outputHeight: number | undefined,
): { width: number; height: number } {
  const shortEdge = Math.min(stageWidth, stageHeight)
  const outputShortEdge = outputHeight ?? shortEdge
  const scale = outputShortEdge / shortEdge
  return {
    width: Math.round((stageWidth * scale) / 2) * 2,
    height: Math.round((stageHeight * scale) / 2) * 2,
  }
}
