import { describe, expect, it } from 'vitest'
import { computeAnchoredScrollLeft, resolveZoomAnchorX, wheelZoomStep } from './zoomAnchor'

describe('computeAnchoredScrollLeft', () => {
  it('keeps the anchored frame at the same on-screen x when zooming in', () => {
    // Frame under the anchor at prevZoom=1, scrollLeft=100, anchorX=50 is frame 150.
    const scrollLeft = computeAnchoredScrollLeft(1, 2, 100, 50)
    // At nextZoom=2, frame 150 sits at px 300; scrollLeft must be 300 - 50 = 250.
    expect(scrollLeft).toBe(250)
  })

  it('keeps the anchored frame at the same on-screen x when zooming out', () => {
    const scrollLeft = computeAnchoredScrollLeft(2, 1, 300, 50)
    // Frame under anchor: (300+50)/2 = 175. At zoom 1: 175*1 - 50 = 125.
    expect(scrollLeft).toBe(125)
  })

  it('is a no-op (returns the same effective scrollLeft) when zoom is unchanged', () => {
    const scrollLeft = computeAnchoredScrollLeft(1.5, 1.5, 200, 40)
    // anchorFrame = (200+40)/1.5; result = anchorFrame*1.5 - 40 = 200.
    expect(scrollLeft).toBeCloseTo(200, 10)
  })

  it('clamps to zero instead of returning a negative scrollLeft', () => {
    // Zooming out from an anchor near the left edge can otherwise go negative.
    const scrollLeft = computeAnchoredScrollLeft(4, 0.1, 5, 2)
    expect(scrollLeft).toBeGreaterThanOrEqual(0)
    // anchorFrame = (5+2)/4 = 1.75; raw = 1.75*0.1 - 2 = -1.825 → clamped to 0.
    expect(scrollLeft).toBe(0)
  })

  it('handles anchorX = 0 (anchor at the lane seam)', () => {
    const scrollLeft = computeAnchoredScrollLeft(1, 2, 100, 0)
    expect(scrollLeft).toBe(200)
  })

  it('handles a very small prevZoom without producing NaN/Infinity', () => {
    const scrollLeft = computeAnchoredScrollLeft(0.02, 0.04, 10, 5)
    expect(Number.isFinite(scrollLeft)).toBe(true)
  })
})

describe('resolveZoomAnchorX', () => {
  it('anchors on the playhead when it is within the visible lane', () => {
    // currentFrame=50, prevZoom=2 → content x = 100; scrollLeft=20 → on-screen x = 80.
    const anchorX = resolveZoomAnchorX(50, 2, 20, 400)
    expect(anchorX).toBe(80)
  })

  it('falls back to lane center when the playhead is scrolled off to the left', () => {
    // on-screen x = 10*2 - 100 = -80 (before the visible lane).
    const anchorX = resolveZoomAnchorX(10, 2, 100, 400)
    expect(anchorX).toBe(200)
  })

  it('falls back to lane center when the playhead is scrolled off to the right', () => {
    // on-screen x = 1000*2 - 0 = 2000, far past laneWidth=400.
    const anchorX = resolveZoomAnchorX(1000, 2, 0, 400)
    expect(anchorX).toBe(200)
  })

  it('treats the exact lane edges (0 and laneWidth) as in-view, not off-screen', () => {
    expect(resolveZoomAnchorX(0, 1, 0, 400)).toBe(0)
    expect(resolveZoomAnchorX(400, 1, 0, 400)).toBe(400)
  })
})

describe('wheelZoomStep', () => {
  it('zooms in on negative deltaY (scroll up)', () => {
    expect(wheelZoomStep(1, -100)).toBeGreaterThan(1)
  })

  it('zooms out on positive deltaY (scroll down)', () => {
    expect(wheelZoomStep(1, 100)).toBeLessThan(1)
  })

  it('is a no-op at deltaY = 0', () => {
    expect(wheelZoomStep(3.5, 0)).toBe(3.5)
  })

  it('produces a consistent multiplicative ratio regardless of the starting zoom', () => {
    const ratioAtLow = wheelZoomStep(0.02, -100) / 0.02
    const ratioAtHigh = wheelZoomStep(40, -100) / 40
    expect(ratioAtLow).toBeCloseTo(ratioAtHigh, 10)
  })
})
