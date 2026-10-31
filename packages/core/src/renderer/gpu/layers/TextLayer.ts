/**
 * TextLayer — GPU layer for ActiveTextClip items.
 *
 * Each active text clip is painted onto a per-item 2D canvas (sized to the
 * stage) and uploaded as a texture through the same quad shader pipeline
 * VideoLayer uses. Because positioning happens in 2D-canvas space, the quad is
 * drawn with an identity transform that fills the whole stage — no transform
 * matrix math needed here.
 *
 * Structurally this mirrors FrameProbeLayer (canvas → texImage2D → quad). The
 * one extra concern is alpha: text has transparent pixels around the glyphs, so
 * the texture must be uploaded with UNPACK_PREMULTIPLY_ALPHA so it composites
 * correctly against the premultiplied blend func set in WebGLContext
 * (gl.blendFunc(ONE, ONE_MINUS_SRC_ALPHA)). Video frames are opaque so they
 * never needed this.
 */

import type { ActiveTextClip } from '../../../resolver/scene'
import { ShaderProgram } from '../ShaderProgram'
import { QUAD_FRAG_SRC } from '../shaders/quad.frag'
import { QUAD_VERT_SRC } from '../shaders/quad.vert'
import { computeTextLayout } from './textLayout'
import type { Layer, LayerContext } from './types'

/**
 * Full-stage column-major 3×3 — maps normalized stage coords (0..1) to clip
 * space (-1..1). Equivalent to buildTransformMatrixFromRect with a rect that
 * covers the whole stage. The text canvas is always full-stage-sized; text
 * positioning is done inside the 2D canvas, not by the shader.
 *
 * Derivation: scale x2, translate -1 in both axes:
 *   [2, 0, 0, 0, 2, 0, -1, -1, 1]  (column-major)
 */
const FULL_STAGE_MAT3 = new Float32Array([2, 0, 0, 0, 2, 0, -1, -1, 1])

/** Traces a rounded-rect path (radius clamped to half the shorter side) without relying on `ctx.roundRect`. */
function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

/** Factory for the offscreen paint canvas; injectable so tests can mock the DOM. */
export type TextCanvasFactory = () => HTMLCanvasElement

/**
 * Per-clip resources: the GL texture holding the last painted content.
 *
 * Rasterization goes through ONE class-level scratch canvas shared by all
 * clips (paint → texImage2D is synchronous per item, so no two items need the
 * canvas at once). Per-clip full-stage canvases were an unbounded memory sink:
 * every subtitle/text clip pinned stage.width × stage.height × 4 bytes of
 * canvas backing store for its whole lifetime.
 */
interface ItemResources {
  texture: WebGLTexture
  /** Stage dimensions at last paint — repaint forced when the stage resizes. */
  width: number
  height: number
  /** Signature of the last painted content+style; skips re-upload when unchanged. */
  lastSignature: string
}

/** Stringified key of everything that affects the painted pixels (not opacity — that's a uniform). */
function paintSignature(item: ActiveTextClip, stage: { width: number; height: number }): string {
  return JSON.stringify([
    item.content,
    item.fontSize,
    item.color,
    item.fontFamily,
    item.fontWeight,
    item.textAlign,
    item.backgroundColor,
    item.backgroundOpacity,
    item.padding,
    item.borderRadius,
    item.borderWidth,
    item.borderColor,
    item.transform?.x,
    item.transform?.y,
    // scale is baked into the painted fontSize, so it changes the pixels.
    item.transform?.scale,
    // rotation is applied at paint time (ctx.rotate, mirroring
    // ExportWorker.drawText) — rotating in the shader instead would clip the
    // glyph run at the UNROTATED stage bounds before the rotation ever ran,
    // truncating text whose rotated placement is fully on-stage.
    item.transform?.rotation,
    stage.width,
    stage.height,
  ])
}

export class TextLayer implements Layer<ActiveTextClip> {
  private _program: ShaderProgram | null = null
  private _vao: WebGLVertexArrayObject | null = null
  private _gl: WebGL2RenderingContext | null = null
  private readonly _resources = new Map<string, ItemResources>()
  private readonly _createCanvas: TextCanvasFactory
  /** Shared rasterization canvas — see ItemResources doc. */
  private _scratchCanvas: HTMLCanvasElement | null = null
  private _scratchCtx: CanvasRenderingContext2D | null = null

  constructor(createCanvas?: TextCanvasFactory) {
    this._createCanvas = createCanvas ?? (() => document.createElement('canvas'))
  }

  acquire(item: ActiveTextClip, ctx: LayerContext): void {
    const { gl } = ctx
    this._gl = gl
    this._ensurePipeline(gl)

    const texture = gl.createTexture()
    if (!texture) {
      throw new Error('TextLayer: gl.createTexture() returned null')
    }

    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.bindTexture(gl.TEXTURE_2D, null)

    this._resources.set(item.id, {
      texture,
      width: ctx.stage.width,
      height: ctx.stage.height,
      lastSignature: '',
    })
  }

  release(itemId: string): void {
    const res = this._resources.get(itemId)
    if (!res) return
    if (this._gl) {
      this._gl.deleteTexture(res.texture)
    }
    this._resources.delete(itemId)
  }

  draw(item: ActiveTextClip, ctx: LayerContext): void {
    this._gl = ctx.gl
    const res = this._resources.get(item.id)
    if (!res || !this._program || !this._vao) return

    const { gl } = ctx

    // The stage can change (e.g. project aspect edit / resize). Force a
    // repaint (the shared scratch canvas is resized in _paint as needed).
    if (res.width !== ctx.stage.width || res.height !== ctx.stage.height) {
      res.width = ctx.stage.width
      res.height = ctx.stage.height
      res.lastSignature = ''
    }

    const sig = paintSignature(item, ctx.stage)
    if (res.lastSignature !== sig) {
      const canvas = this._paint(item, ctx.stage)
      gl.bindTexture(gl.TEXTURE_2D, res.texture)
      // Premultiply on upload so antialiased glyph edges blend correctly against
      // the premultiplied blend func; restore the default immediately so the
      // opaque video upload path is unaffected regardless of draw order.
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        canvas as TexImageSource,
      )
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
      gl.bindTexture(gl.TEXTURE_2D, null)
      res.lastSignature = sig
    }

    const opacity = item.opacity ?? 1

    this._program.use(gl)
    gl.bindVertexArray(this._vao)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, res.texture)

    this._program.setUniform1i(gl, 'uTexture', 0)
    this._program.setUniform1f(gl, 'uOpacity', opacity)
    this._program.setUniformMatrix3fv(gl, 'uTransform', false, FULL_STAGE_MAT3)

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.bindVertexArray(null)
  }

  dispose(): void {
    if (this._gl) {
      for (const res of this._resources.values()) {
        this._gl.deleteTexture(res.texture)
      }
      if (this._vao) this._gl.deleteVertexArray(this._vao)
      if (this._program) this._program.dispose(this._gl)
    }
    this._resources.clear()
    this._program = null
    this._vao = null
    this._gl = null
    this._scratchCanvas = null
    this._scratchCtx = null
  }

  /** Drop GL object references after a context loss (no GL calls — context is gone). */
  notifyContextLost(): void {
    this._resources.clear()
    this._program = null
    this._vao = null
    this._gl = null
    // The scratch canvas itself is plain 2D-canvas state, not a GL object —
    // safe to keep across context loss; _ensurePipeline rebuilds the GL side.
  }

  /** Exposed for testing: number of per-clip texture handles. */
  getTextureCount(): number {
    return this._resources.size
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Rasterize `item` into the shared scratch canvas (resized as needed) and return it. */
  private _paint(
    item: ActiveTextClip,
    stage: { width: number; height: number },
  ): HTMLCanvasElement {
    if (!this._scratchCanvas) {
      this._scratchCanvas = this._createCanvas()
      const ctx2d = this._scratchCanvas.getContext('2d')
      if (!ctx2d) {
        throw new Error('TextLayer: 2D context unavailable')
      }
      this._scratchCtx = ctx2d
    }
    const canvas = this._scratchCanvas
    const ctx2d = this._scratchCtx!

    if (canvas.width !== stage.width || canvas.height !== stage.height) {
      canvas.width = stage.width
      canvas.height = stage.height
    }

    ctx2d.clearRect(0, 0, stage.width, stage.height)

    // computeTextLayout sets ctx2d.font as a side effect, so the metrics it used
    // to place the lines are exactly the ones we paint with. The same call backs
    // the editor overlay's selection box, keeping handles glued to the glyphs.
    const layout = computeTextLayout(ctx2d, item, stage)
    const { backgroundColor, backgroundOpacity, borderWidth, borderColor, borderRadius } = layout.style

    // Pixel-space rotation about the block centre, identical to
    // ExportWorker.drawText — the painted canvas IS the rotated result, so the
    // quad ships to the shader untransformed and glyphs clip only at the true
    // stage bounds (never at the unrotated run's bounds).
    const rotation = item.transform?.rotation ?? 0
    ctx2d.save()
    if (rotation !== 0) {
      const cx = layout.center.x * stage.width
      const cy = layout.center.y * stage.height
      ctx2d.translate(cx, cy)
      ctx2d.rotate(rotation)
      ctx2d.translate(-cx, -cy)
    }

    if (backgroundColor) {
      ctx2d.save()
      ctx2d.globalAlpha = backgroundOpacity
      ctx2d.fillStyle = backgroundColor
      roundRectPath(ctx2d, layout.box.x, layout.box.y, layout.box.width, layout.box.height, borderRadius)
      ctx2d.fill()
      ctx2d.restore()
    }

    if (borderWidth > 0) {
      ctx2d.save()
      ctx2d.strokeStyle = borderColor
      ctx2d.lineWidth = borderWidth
      const inset = borderWidth / 2
      roundRectPath(
        ctx2d,
        layout.box.x + inset,
        layout.box.y + inset,
        layout.box.width - borderWidth,
        layout.box.height - borderWidth,
        Math.max(0, borderRadius - inset),
      )
      ctx2d.stroke()
      ctx2d.restore()
    }

    ctx2d.fillStyle = layout.style.color
    ctx2d.textBaseline = 'middle'
    ctx2d.textAlign = layout.style.textAlign

    layout.lines.forEach((line, i) => {
      ctx2d.fillText(line, layout.anchorX, layout.firstLineY + i * layout.lineAdvance)
    })

    ctx2d.restore()
    return canvas
  }

  private _ensurePipeline(gl: WebGL2RenderingContext): void {
    if (this._program && this._vao) return

    this._program = ShaderProgram.create(gl, QUAD_VERT_SRC, QUAD_FRAG_SRC)

    const vao = gl.createVertexArray()
    if (!vao) {
      throw new Error('TextLayer: gl.createVertexArray() returned null')
    }
    this._vao = vao
  }
}
