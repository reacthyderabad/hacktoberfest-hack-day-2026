/**
 * Shared content width for the ruler and every track lane.
 *
 * Both must use the SAME formula — the 800px floor keeps a usable timeline on
 * small screens, and if only the lanes applied it (as they historically did)
 * the ruler ticks and clip positions desynced horizontally at very low zoom.
 */
export function timelineContentWidth(totalFrames: number, zoom: number): number {
  return Math.max(totalFrames * zoom, 800)
}
