/**
 * GeometryParity — Export ↔ Preview placement math parity harness (Phase 3b).
 *
 * The two renderers place clips differently at the API level:
 *
 *   GPU renderer  (Preview)  — buildDrawTransformMatrix → GL clip-space 3×3 matrix.
 *   2D canvas     (Export)   — resolveDrawRect + canvas translate/rotate/drawImage.
 *
 * Both call resolveDrawRect with the same inputs, so geometric parity is
 * guaranteed by shared code. This test suite is a *regression guard*: if either
 * renderer ever diverges from the shared helper (or if the helper changes), at
 * least one assertion here will break before pixels do.
 *
 * What IS tested here (no GPU or real video required):
 *   - resolveDrawRect produces the expected rect for all transform modes
 *   - The GPU matrix derived from that rect maps the quad centre (0.5, 0.5)
 *     to the same NDC point as the 2D canvas centre formula
 *   - Both paths apply the same rotation (radians) about the same pixel centre
 *
 * What is NOT tested (requires a real browser with WebGL2):
 *   - Actual pixel output equality (needs preserveDrawingBuffer readback)
 *   - Shader blending / opacity compositing
 *   Use a Playwright golden-frame spec for full pixel comparison.
 */

import { describe, it, expect } from 'vitest'
import { resolveDrawRect, buildTransformMatrixFromRect, type CropRect } from '../layers/drawRect'
import type { Transform } from '../../../types'

const STAGE_W = 1920
const STAGE_H = 1080

// ---------------------------------------------------------------------------
// Helper: apply the 3×3 column-major matrix to a 2D point (homogeneous coords).
// ---------------------------------------------------------------------------
function applyMatrix(m: Float32Array, x: number, y: number): { x: number; y: number } {
  // Column-major layout: m[col * 3 + row]
  // [m0 m3 m6]   [x]
  // [m1 m4 m7] × [y]
  // [m2 m5 m8]   [1]
  return {
    x: m[0] * x + m[3] * y + m[6],
    y: m[1] * x + m[4] * y + m[7],
  }
}

/** Convert pixel (px, py) on the stage to NDC (clip space) coordinates. */
function pixelToNdc(px: number, py: number): { x: number; y: number } {
  return {
    x: (px / STAGE_W) * 2 - 1,
    y: (py / STAGE_H) * 2 - 1,
  }
}

// ---------------------------------------------------------------------------
// Core invariant: GPU matrix centre == 2D canvas centre
// ---------------------------------------------------------------------------

/**
 * For any rect, the GPU matrix should map the UV centre (0.5, 0.5) to the
 * same NDC coordinate as the 2D canvas centre formula:
 *   NDC_x = 2 * (rect.x + rect.width/2) / stageWidth - 1
 *   NDC_y = 2 * (rect.y + rect.height/2) / stageHeight - 1
 *
 * This verifies that both paths rotate about the same stage pixel.
 */
function assertCentresParity(
  transform: Transform | undefined,
  contentW: number,
  contentH: number,
  crop?: CropRect,
) {
  const rect = resolveDrawRect(transform, STAGE_W, STAGE_H, contentW, contentH, crop)
  const matrix = buildTransformMatrixFromRect(rect, STAGE_W, STAGE_H)

  // UV centre of the quad (the point both paths rotate around)
  const gpuCentre = applyMatrix(matrix, 0.5, 0.5)

  // 2D canvas: translate to (cx, cy), rotate, drawImage at (-w/2, -h/2, w, h)
  // → the rotation pivot is (cx, cy) in stage pixels
  const cx = rect.x + rect.width / 2
  const cy = rect.y + rect.height / 2
  const canvasCentre = pixelToNdc(cx, cy)

  expect(gpuCentre.x).toBeCloseTo(canvasCentre.x, 5)
  expect(gpuCentre.y).toBeCloseTo(canvasCentre.y, 5)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GeometryParity — resolveDrawRect shared by both renderers', () => {
  it('no-transform + known content size → contain rect (letterbox)', () => {
    // 16:9 content (1280×720) in 1920×1080 stage → fills width, centred vertically.
    const rect = resolveDrawRect(undefined, STAGE_W, STAGE_H, 1280, 720)
    expect(rect.x).toBe(0)
    expect(rect.y).toBe(0)
    expect(rect.width).toBe(STAGE_W)
    expect(rect.height).toBe(STAGE_H)
    expect(rect.rotation).toBe(0)
  })

  it('no-transform + 4:3 content (1024×768) → pillarbox with letterbox', () => {
    // Content narrower than stage: should be contained inside stage
    const rect = resolveDrawRect(undefined, STAGE_W, STAGE_H, 1024, 768)
    // Aspect: 1024/768 ≈ 1.333; stage: 1920/1080 ≈ 1.777 → height-constrained
    const expectedH = STAGE_H
    const expectedW = Math.round((1024 / 768) * STAGE_H)
    const expectedX = Math.round((STAGE_W - expectedW) / 2)
    expect(rect.height).toBeCloseTo(expectedH, 0)
    expect(rect.width).toBeCloseTo(expectedW, 0)
    expect(rect.x).toBeCloseTo(expectedX, 0)
    expect(rect.y).toBe(0)
  })

  it('no-transform + unknown content size → fills stage', () => {
    const rect = resolveDrawRect(undefined, STAGE_W, STAGE_H)
    expect(rect).toEqual({ x: 0, y: 0, width: STAGE_W, height: STAGE_H, rotation: 0 })
  })

  it('explicit transform at stage centre, scale 1 → content fills stage', () => {
    const transform: Transform = {
      x: 0.5, y: 0.5, scale: 1, rotation: 0,
      anchor: { x: 0.5, y: 0.5 },
    }
    const rect = resolveDrawRect(transform, STAGE_W, STAGE_H, STAGE_W, STAGE_H)
    expect(rect.x).toBeCloseTo(0, 5)
    expect(rect.y).toBeCloseTo(0, 5)
    expect(rect.width).toBeCloseTo(STAGE_W, 5)
    expect(rect.height).toBeCloseTo(STAGE_H, 5)
  })

  it('explicit transform at top-left corner → clip anchored at (0, 0)', () => {
    const transform: Transform = {
      x: 0, y: 0, scale: 1, rotation: 0,
      anchor: { x: 0, y: 0 },
    }
    const rect = resolveDrawRect(transform, STAGE_W, STAGE_H, 400, 300)
    expect(rect.x).toBe(0)
    expect(rect.y).toBe(0)
    expect(rect.width).toBe(400)
    expect(rect.height).toBe(300)
  })

  it('scale 0.5 halves content dimensions', () => {
    const transform: Transform = {
      x: 0.5, y: 0.5, scale: 0.5, rotation: 0,
      anchor: { x: 0.5, y: 0.5 },
    }
    const rect = resolveDrawRect(transform, STAGE_W, STAGE_H, 1920, 1080)
    expect(rect.width).toBeCloseTo(960, 5)
    expect(rect.height).toBeCloseTo(540, 5)
  })
})

describe('GeometryParity — GPU matrix centre == 2D canvas centre', () => {
  it('no-transform full-fill (1920×1080 content)', () => {
    assertCentresParity(undefined, STAGE_W, STAGE_H)
  })

  it('no-transform 4:3 content (pillarboxed)', () => {
    assertCentresParity(undefined, 1024, 768)
  })

  it('explicit centre transform, scale 1', () => {
    const t: Transform = { x: 0.5, y: 0.5, scale: 1, rotation: 0, anchor: { x: 0.5, y: 0.5 } }
    assertCentresParity(t, STAGE_W, STAGE_H)
  })

  it('off-centre transform (top-left quadrant)', () => {
    const t: Transform = { x: 0.25, y: 0.25, scale: 0.5, rotation: 0, anchor: { x: 0.5, y: 0.5 } }
    assertCentresParity(t, STAGE_W, STAGE_H)
  })

  it('rotated clip — centre is the rotation pivot in both paths', () => {
    const t: Transform = {
      x: 0.5, y: 0.5, scale: 0.8, rotation: Math.PI / 4, anchor: { x: 0.5, y: 0.5 },
    }
    assertCentresParity(t, 640, 360)
  })

  it('clip positioned at bottom-right corner', () => {
    const t: Transform = { x: 0.9, y: 0.9, scale: 0.3, rotation: 0, anchor: { x: 0.5, y: 0.5 } }
    assertCentresParity(t, 400, 300)
  })

  it('cropped clip — GPU and 2D canvas still rotate about the same pixel centre', () => {
    const t: Transform = {
      x: 0.4, y: 0.6, scale: 0.7, rotation: Math.PI / 5, anchor: { x: 0.5, y: 0.5 },
    }
    const crop: CropRect = { x: 0.1, y: 0.2, width: 0.5, height: 0.4 }
    assertCentresParity(t, 1920, 1080, crop)
  })

  it('cropped clip with no explicit transform (contain fallback)', () => {
    const crop: CropRect = { x: 0, y: 0, width: 0.5, height: 0.5 }
    assertCentresParity(undefined, 1024, 768, crop)
  })
})

// ---------------------------------------------------------------------------
// Corner parity — the invariant the centre check above cannot see
// ---------------------------------------------------------------------------

/**
 * Where the 2D canvas puts a quad corner, in stage pixels.
 *
 * `ExportWorker.drawMedia` does `translate(cx, cy); rotate(θ); drawImage(-w/2,
 * -h/2, w, h)` — i.e. it rotates the rect's own half-extents in PIXEL space and
 * offsets from the centre. That is the reference every other path has to match:
 * the preview overlay's CSS `rotate()` is the same rotation, and the exported
 * file is the artifact the user actually keeps.
 */
function canvasCorner(rect: ReturnType<typeof resolveDrawRect>, u: number, v: number) {
  const c = Math.cos(rect.rotation)
  const s = Math.sin(rect.rotation)
  const lx = (u - 0.5) * rect.width
  const ly = (v - 0.5) * rect.height
  return {
    x: rect.x + rect.width / 2 + (lx * c - ly * s),
    y: rect.y + rect.height / 2 + (lx * s + ly * c),
  }
}

/** Every corner of the quad, GPU matrix vs 2D canvas, in stage pixels. */
function assertCornersParity(
  transform: Transform | undefined,
  contentW: number,
  contentH: number,
  stageW = STAGE_W,
  stageH = STAGE_H,
) {
  const rect = resolveDrawRect(transform, stageW, stageH, contentW, contentH)
  const matrix = buildTransformMatrixFromRect(rect, stageW, stageH)

  for (const [u, v] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
    const ndc = applyMatrix(matrix, u, v)
    // Undo the NDC mapping to compare in the pixel space both paths think in.
    const gpu = { x: ((ndc.x + 1) / 2) * stageW, y: ((ndc.y + 1) / 2) * stageH }
    const canvas = canvasCorner(rect, u, v)
    expect(gpu.x).toBeCloseTo(canvas.x, 4)
    expect(gpu.y).toBeCloseTo(canvas.y, 4)
  }
}

describe('GeometryParity — rotation is identical in both paths', () => {
  it('unrotated clip lands on the same four corners', () => {
    const t: Transform = { x: 0.5, y: 0.5, scale: 0.5, rotation: 0, anchor: { x: 0.5, y: 0.5 } }
    assertCornersParity(t, 800, 450)
  })

  it('30° rotation lands on the same four corners', () => {
    const t: Transform = {
      x: 0.5, y: 0.5, scale: 0.5, rotation: Math.PI / 6, anchor: { x: 0.5, y: 0.5 },
    }
    assertCornersParity(t, 800, 450)
  })

  it('off-centre + cropped-aspect rotation still agrees corner for corner', () => {
    const t: Transform = {
      x: 0.3, y: 0.7, scale: 0.4, rotation: -Math.PI / 3, anchor: { x: 0.5, y: 0.5 },
    }
    assertCornersParity(t, 1024, 768)
  })

  /**
   * The regression this file exists for. Rotating in normalized stage space
   * scales a rotated clip by the stage aspect, which is invisible on a square
   * stage and invisible at the centre point — so it has to be asserted on a
   * NON-square stage, at the corners.
   */
  it('90° turn on a 9:16 stage keeps the clip the same size (no aspect stretch)', () => {
    const PORTRAIT_W = 1080
    const PORTRAIT_H = 1920
    const t: Transform = {
      x: 0.5, y: 0.5, scale: 1, rotation: Math.PI / 2, anchor: { x: 0.5, y: 0.5 },
    }
    // A square clip: after a quarter turn it must still be square, and the same
    // size. Under the normalized-space rotation it came out 1920/1080 wide and
    // 1080/1920 tall instead.
    const rect = resolveDrawRect(t, PORTRAIT_W, PORTRAIT_H, 600, 600)
    const matrix = buildTransformMatrixFromRect(rect, PORTRAIT_W, PORTRAIT_H)

    const toPx = (u: number, v: number) => {
      const ndc = applyMatrix(matrix, u, v)
      return { x: ((ndc.x + 1) / 2) * PORTRAIT_W, y: ((ndc.y + 1) / 2) * PORTRAIT_H }
    }
    const tl = toPx(0, 0)
    const tr = toPx(1, 0)
    const bl = toPx(0, 1)

    const widthEdge = Math.hypot(tr.x - tl.x, tr.y - tl.y)
    const heightEdge = Math.hypot(bl.x - tl.x, bl.y - tl.y)
    expect(widthEdge).toBeCloseTo(600, 4)
    expect(heightEdge).toBeCloseTo(600, 4)

    assertCornersParity(t, 600, 600, PORTRAIT_W, PORTRAIT_H)
  })

  it('a quarter turn maps the width edge onto the vertical axis (clockwise)', () => {
    // Positive rotation is clockwise on screen (stage Y is top-down here;
    // quad.vert negates Y on the way to GL's Y-up NDC).
    const rect = { x: 0, y: 0, width: 400, height: 200, rotation: Math.PI / 2 }
    const matrix = buildTransformMatrixFromRect(rect, STAGE_W, STAGE_H)
    const tl = applyMatrix(matrix, 0, 0)
    const tr = applyMatrix(matrix, 1, 0)
    // The width edge now runs straight down the screen, 400px long.
    expect(((tr.x - tl.x) / 2) * STAGE_W).toBeCloseTo(0, 4)
    expect(((tr.y - tl.y) / 2) * STAGE_H).toBeCloseTo(400, 4)
  })
})
