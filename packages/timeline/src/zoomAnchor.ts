/**
 * Pure math backing anchored timeline zoom — extracted from Timeline.tsx so
 * the arithmetic (and its edge cases) can be unit-tested independent of the
 * DOM/React lifecycle. All x/scroll values are in the track lane's own
 * coordinate space: px from the lane's left edge, i.e. AFTER the sticky
 * track-label sidebar has already been subtracted by the caller.
 */

/**
 * Given the zoom level before and after a change (the "after" value must
 * already be store-clamped), the scrollLeft before the change, and the
 * anchor point that should stay visually fixed, returns the scrollLeft to
 * apply once the DOM has re-laid-out lanes at the new zoom.
 *
 * Derivation: the frame under the anchor is `(scrollLeft + anchorX) / prevZoom`.
 * After zoom changes, that same frame must again sit at `anchorX`:
 *   anchorFrame * nextZoom - scrollLeft' = anchorX
 *   scrollLeft' = anchorFrame * nextZoom - anchorX
 *
 * Clamped to >= 0 — scrollLeft can never go negative, and zooming out from an
 * anchor near the left edge can otherwise compute a small negative value.
 */
export function computeAnchoredScrollLeft(
  prevZoom: number,
  nextZoom: number,
  scrollLeft: number,
  anchorX: number,
): number {
  const anchorFrame = (scrollLeft + anchorX) / prevZoom
  return Math.max(0, anchorFrame * nextZoom - anchorX)
}

/**
 * Resolve the anchor x for a playhead-or-center zoom (toolbar buttons, the
 * zoom slider, and editor-wide ctrl+scroll forwarding all use this): the
 * playhead's current on-screen x when it's within the visible lane, else the
 * lane's horizontal center.
 */
export function resolveZoomAnchorX(
  currentFrame: number,
  prevZoom: number,
  scrollLeft: number,
  laneWidth: number,
): number {
  const playheadX = currentFrame * prevZoom - scrollLeft
  return playheadX >= 0 && playheadX <= laneWidth ? playheadX : laneWidth / 2
}

/**
 * Multiplicative zoom step for a wheel notch. `deltaY > 0` (scroll down) zooms
 * out, `deltaY < 0` zooms in. Exponential rather than linear so the same
 * notch feels consistent across the whole 0.02–50 zoom range — a fixed ±0.5
 * step is a 25x jump at the low end and noise at the high end.
 */
export function wheelZoomStep(prevZoom: number, deltaY: number): number {
  return prevZoom * Math.exp(-deltaY * 0.0015)
}
