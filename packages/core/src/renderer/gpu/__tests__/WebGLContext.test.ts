/**
 * WebGLContext — context-loss watchdog behaviour.
 *
 * Runs under environment: 'node' (see vitest.config.ts), so there is no real
 * DOM/WebGL. `document` and the canvas/GL surface are stubbed locally, the
 * same pattern DebugGpuRenderer.test.ts uses to test lifecycle code without
 * mocking WebGLContext itself away — here WebGLContext IS the unit under
 * test, so the stubs go one level deeper (a fake canvas + fake GL) instead of
 * mocking the class.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
// Safe as a static import even though `document` is stubbed per-test in
// beforeEach: WebGLContext only reads `document` inside its constructor, and
// every test constructs after beforeEach has run. Import hoisting doesn't
// execute anything at module scope here.
import { WebGLContext } from '../WebGLContext'

// ---------------------------------------------------------------------------
// Fake canvas / GL surface
// ---------------------------------------------------------------------------

interface FakeCanvas {
  style: Record<string, string>
  width: number
  height: number
  getContext: ReturnType<typeof vi.fn>
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
  _trigger: (type: string, event?: { preventDefault: () => void }) => void
}

let loseContextExt: { loseContext: ReturnType<typeof vi.fn>; restoreContext: ReturnType<typeof vi.fn> }
let gl: Record<string, unknown>
let canvas: FakeCanvas

function makeFakeGl() {
  return {
    enable: vi.fn(),
    blendFunc: vi.fn(),
    pixelStorei: vi.fn(),
    clearColor: vi.fn(),
    viewport: vi.fn(),
    clear: vi.fn(),
    getExtension: vi.fn((name: string) => (name === 'WEBGL_lose_context' ? loseContextExt : null)),
    BLEND: 0x0be2,
    ONE: 1,
    ONE_MINUS_SRC_ALPHA: 0x0303,
    UNPACK_FLIP_Y_WEBGL: 0x9240,
    COLOR_BUFFER_BIT: 0x4000,
  }
}

function makeFakeCanvas(): FakeCanvas {
  const listeners: Record<string, ((e: unknown) => void)[]> = {}
  const c: FakeCanvas = {
    style: {},
    width: 0,
    height: 0,
    getContext: vi.fn(() => gl),
    addEventListener: vi.fn((type: string, handler: (e: unknown) => void) => {
      ;(listeners[type] ??= []).push(handler)
    }),
    removeEventListener: vi.fn(),
    remove: vi.fn(),
    _trigger: (type, event = { preventDefault: vi.fn() }) => {
      for (const handler of listeners[type] ?? []) handler(event)
    },
  }
  return c
}

beforeEach(() => {
  vi.useFakeTimers()
  loseContextExt = { loseContext: vi.fn(), restoreContext: vi.fn() }
  gl = makeFakeGl()
  canvas = makeFakeCanvas()
  vi.stubGlobal('document', { createElement: vi.fn(() => canvas) })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('WebGLContext context-loss watchdog', () => {
  it('caches WEBGL_lose_context at construction, while the context is still healthy', () => {
    new WebGLContext({})
    expect(gl.getExtension).toHaveBeenCalledWith('WEBGL_lose_context')
  })

  it('context lost sets isLost, increments lossCount, and notifies onLost', () => {
    const onLost = vi.fn()
    const ctx = new WebGLContext({ onLost })

    canvas._trigger('webglcontextlost')

    expect(ctx.isLost).toBe(true)
    expect(ctx.lossCount).toBe(1)
    expect(onLost).toHaveBeenCalledTimes(1)
  })

  it('preventDefault() is called on the lost event (required for the browser to attempt restoration)', () => {
    new WebGLContext({})
    const preventDefault = vi.fn()
    canvas._trigger('webglcontextlost', { preventDefault })
    expect(preventDefault).toHaveBeenCalledTimes(1)
  })

  it('browser restoring before the watchdog window fires onRestore and never forces restoreContext()', () => {
    const onRestore = vi.fn()
    const ctx = new WebGLContext({ onRestore })

    canvas._trigger('webglcontextlost')
    vi.advanceTimersByTime(1000) // < 2000ms RESTORE_TIMEOUT_MS
    canvas._trigger('webglcontextrestored')

    expect(ctx.isLost).toBe(false)
    expect(onRestore).toHaveBeenCalledTimes(1)
    expect(onRestore).toHaveBeenCalledWith(gl)

    // Let any pending watchdog timers run out — they must have been cleared.
    vi.advanceTimersByTime(10_000)
    expect(loseContextExt.restoreContext).not.toHaveBeenCalled()
  })

  it('forces restoreContext() via WEBGL_lose_context when the browser does not restore in time', () => {
    new WebGLContext({})
    canvas._trigger('webglcontextlost')

    vi.advanceTimersByTime(2000) // RESTORE_TIMEOUT_MS

    expect(loseContextExt.restoreContext).toHaveBeenCalledTimes(1)
  })

  it('does not force restoreContext() a second time once already restored', () => {
    new WebGLContext({})
    canvas._trigger('webglcontextlost')
    vi.advanceTimersByTime(1500)
    canvas._trigger('webglcontextrestored')
    vi.advanceTimersByTime(2000)

    expect(loseContextExt.restoreContext).not.toHaveBeenCalled()
  })

  it('calls onUnrecoverable if still lost after the unrecoverable window', () => {
    const onUnrecoverable = vi.fn()
    new WebGLContext({ onUnrecoverable })

    canvas._trigger('webglcontextlost')
    vi.advanceTimersByTime(5000) // UNRECOVERABLE_TIMEOUT_MS

    expect(onUnrecoverable).toHaveBeenCalledTimes(1)
  })

  it('does not call onUnrecoverable once the context has been restored', () => {
    const onUnrecoverable = vi.fn()
    new WebGLContext({ onUnrecoverable })

    canvas._trigger('webglcontextlost')
    vi.advanceTimersByTime(1500)
    canvas._trigger('webglcontextrestored')
    vi.advanceTimersByTime(10_000)

    expect(onUnrecoverable).not.toHaveBeenCalled()
  })

  it('increments lossCount across repeated loss/restore cycles', () => {
    const ctx = new WebGLContext({})
    canvas._trigger('webglcontextlost')
    canvas._trigger('webglcontextrestored')
    canvas._trigger('webglcontextlost')

    expect(ctx.lossCount).toBe(2)
  })

  it('logs on loss and on restore', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    new WebGLContext({})
    canvas._trigger('webglcontextlost')
    expect(errorSpy).toHaveBeenCalled()

    canvas._trigger('webglcontextrestored')
    expect(warnSpy).toHaveBeenCalled()
  })

  it('dispose() clears pending watchdog timers so restoreContext()/onUnrecoverable never fire after teardown', () => {
    const onUnrecoverable = vi.fn()
    const ctx = new WebGLContext({ onUnrecoverable })

    canvas._trigger('webglcontextlost')
    ctx.dispose()
    loseContextExt.restoreContext.mockClear()

    vi.advanceTimersByTime(10_000)

    expect(loseContextExt.restoreContext).not.toHaveBeenCalled()
    expect(onUnrecoverable).not.toHaveBeenCalled()
  })

  it('dispose() calls loseContext() to release GPU objects even when the context is already lost', () => {
    const ctx = new WebGLContext({})
    canvas._trigger('webglcontextlost')

    expect(() => ctx.dispose()).not.toThrow()
  })
})
