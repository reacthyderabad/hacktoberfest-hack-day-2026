import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ActiveFreehandClip, ActiveShapeClip } from '../../../resolver/scene'
import type { LayerContext } from '../layers/types'
import { ShapeLayer } from '../layers/ShapeLayer'
import { FreehandLayer } from '../layers/FreehandLayer'

function createMockGL(): WebGL2RenderingContext {
  const textures = new Set<object>()
  const vaos = new Set<object>()
  const programs = new Set<object>()
  const shaders = new Set<object>()

  const gl = {
    TEXTURE_2D: 0x0de1,
    RGBA: 0x1908,
    UNSIGNED_BYTE: 0x1401,
    LINEAR: 0x2601,
    CLAMP_TO_EDGE: 0x812f,
    TEXTURE_MIN_FILTER: 0x2801,
    TEXTURE_MAG_FILTER: 0x2800,
    TEXTURE_WRAP_S: 0x2802,
    TEXTURE_WRAP_T: 0x2803,
    TEXTURE0: 0x84c0,
    TRIANGLE_STRIP: 0x0005,
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    COMPILE_STATUS: 0x8b81,
    LINK_STATUS: 0x8b82,
    UNPACK_PREMULTIPLY_ALPHA_WEBGL: 0x9241,

    createTexture: vi.fn(() => {
      const tex = {}
      textures.add(tex)
      return tex
    }),
    deleteTexture: vi.fn((tex: object) => textures.delete(tex)),
    bindTexture: vi.fn(),
    texParameteri: vi.fn(),
    texImage2D: vi.fn(),
    pixelStorei: vi.fn(),

    createVertexArray: vi.fn(() => {
      const vao = {}
      vaos.add(vao)
      return vao
    }),
    deleteVertexArray: vi.fn((vao: object) => vaos.delete(vao)),
    bindVertexArray: vi.fn(),

    createProgram: vi.fn(() => {
      const prog = {}
      programs.add(prog)
      return prog
    }),
    deleteProgram: vi.fn((p: object) => programs.delete(p)),
    createShader: vi.fn(() => {
      const s = {}
      shaders.add(s)
      return s
    }),
    deleteShader: vi.fn((s: object) => shaders.delete(s)),
    attachShader: vi.fn(),
    detachShader: vi.fn(),
    linkProgram: vi.fn(),
    compileShader: vi.fn(),
    shaderSource: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    getProgramParameter: vi.fn(() => true),
    getShaderInfoLog: vi.fn(() => ''),
    getProgramInfoLog: vi.fn(() => ''),
    getUniformLocation: vi.fn(() => ({})),
    useProgram: vi.fn(),
    uniform1i: vi.fn(),
    uniform1f: vi.fn(),
    uniformMatrix3fv: vi.fn(),
    activeTexture: vi.fn(),
    drawArrays: vi.fn(),
  } as unknown as WebGL2RenderingContext

  return gl
}

function createMockCanvas(): HTMLCanvasElement {
  const ctx2d = {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineCap: '',
    lineJoin: '',
  }
  return {
    width: 0,
    height: 0,
    getContext: vi.fn((type: string) => (type === '2d' ? ctx2d : null)),
  } as unknown as HTMLCanvasElement
}

function makeCtx(gl: WebGL2RenderingContext, width: number, height: number): LayerContext {
  return {
    gl,
    frame: 0,
    fps: 30,
    stage: { width, height },
    viewport: { width, height },
  }
}

describe('ShapeLayer and FreehandLayer shared scratch canvas (CORE-15)', () => {
  let createdCanvases: HTMLCanvasElement[]
  let mockGL: WebGL2RenderingContext

  beforeEach(() => {
    createdCanvases = []
    mockGL = createMockGL()

    vi.stubGlobal('Path2D', class Path2D {})
    vi.stubGlobal('document', {
      createElement: vi.fn((tagName: string) => {
        if (tagName === 'canvas') {
          const el = createMockCanvas()
          createdCanvases.push(el)
          return el
        }
        throw new Error(`Unexpected createElement tag: ${tagName}`)
      }),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('ShapeLayer', () => {
    it('does not allocate a 2D canvas on acquire, only on first draw', () => {
      const layer = new ShapeLayer()
      const ctx = makeCtx(mockGL, 1920, 1080)
      const shape1: ActiveShapeClip = {
        id: 'shape-1',
        trackId: 'track-1',
        name: 'Shape 1',
        sourceFrame: 0,
        opacity: 1,
        type: 'shape',
        shapeKind: 'rect',
        shapeFill: '#ff0000',
        shapeStroke: '#000000',
        shapeStrokeWidth: 2,
        zIndex: 1,
      }
      const shape2: ActiveShapeClip = {
        id: 'shape-2',
        trackId: 'track-1',
        name: 'Shape 2',
        sourceFrame: 0,
        opacity: 1,
        type: 'shape',
        shapeKind: 'circle',
        shapeFill: '#00ff00',
        shapeStroke: '#000000',
        shapeStrokeWidth: 1,
        zIndex: 2,
      }

      // Acquiring multiple shapes must NOT create canvas elements
      layer.acquire(shape1, ctx)
      layer.acquire(shape2, ctx)
      expect(createdCanvases).toHaveLength(0)

      // Drawing first shape lazily creates the single scratch canvas
      layer.draw(shape1, ctx)
      expect(createdCanvases).toHaveLength(1)
      expect(createdCanvases[0].width).toBe(1920)
      expect(createdCanvases[0].height).toBe(1080)

      // Drawing second shape reuses the EXACT same scratch canvas
      layer.draw(shape2, ctx)
      expect(createdCanvases).toHaveLength(1)

      // Stage resize adjusts dimensions on the same scratch canvas
      const resizedCtx = makeCtx(mockGL, 1280, 720)
      layer.draw(shape1, resizedCtx)
      expect(createdCanvases).toHaveLength(1)
      expect(createdCanvases[0].width).toBe(1280)
      expect(createdCanvases[0].height).toBe(720)

      layer.dispose()
    })
  })

  describe('FreehandLayer', () => {
    it('does not allocate a 2D canvas on acquire, and reuses one scratch canvas across strokes', () => {
      const layer = new FreehandLayer()
      const ctx = makeCtx(mockGL, 1920, 1080)
      const stroke1: ActiveFreehandClip = {
        id: 'stroke-1',
        trackId: 'track-1',
        name: 'Stroke 1',
        sourceFrame: 0,
        opacity: 1,
        type: 'freehand',
        pathData: 'M 0 0 L 100 100',
        strokeColor: '#0000ff',
        strokeWidth: 4,
        zIndex: 1,
      }
      const stroke2: ActiveFreehandClip = {
        id: 'stroke-2',
        trackId: 'track-1',
        name: 'Stroke 2',
        sourceFrame: 0,
        opacity: 1,
        type: 'freehand',
        pathData: 'M 50 50 L 150 150',
        strokeColor: '#ffff00',
        strokeWidth: 2,
        zIndex: 2,
      }

      // Acquiring multiple strokes must NOT create canvas elements
      layer.acquire(stroke1, ctx)
      layer.acquire(stroke2, ctx)
      expect(createdCanvases).toHaveLength(0)

      // Drawing first stroke creates the scratch canvas
      layer.draw(stroke1, ctx)
      expect(createdCanvases).toHaveLength(1)
      expect(createdCanvases[0].width).toBe(1920)
      expect(createdCanvases[0].height).toBe(1080)

      // Drawing second stroke reuses the same scratch canvas
      layer.draw(stroke2, ctx)
      expect(createdCanvases).toHaveLength(1)

      // Resized stage updates the existing canvas dimensions
      const resizedCtx = makeCtx(mockGL, 800, 600)
      layer.draw(stroke2, resizedCtx)
      expect(createdCanvases).toHaveLength(1)
      expect(createdCanvases[0].width).toBe(800)
      expect(createdCanvases[0].height).toBe(600)

      layer.dispose()
    })
  })
})
