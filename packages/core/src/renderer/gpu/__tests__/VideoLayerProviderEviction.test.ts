import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ActiveVideoClip } from '../../../resolver/scene'
import type { LayerContext } from '../layers/types'
import { TexturePool } from '../TexturePool'
import type { VideoFrameProvider } from '../../../media/video'
import { VideoLayer } from '../layers/VideoLayer'

// ---------------------------------------------------------------------------
// Provider lifecycle regression suite.
//
// VideoLayer used to strand every provider it ever created: release() called
// markIdle() (which only pauses decode) and left the entry in _providers until
// full editor teardown. Each stranded provider pins a live VideoDecoder plus up
// to FrameCache's 30 decoded frames, so a long scrub across a multi-clip
// timeline walked GPU memory up until the context was lost and the stage went
// black. These tests pin the two mechanisms that bound it: the idle deadline
// and the LRU cap on refCount-0 providers.
// ---------------------------------------------------------------------------

// Minimal WebGL2 mock — only the calls acquire()/draw() reach.
function createMockGL(): WebGL2RenderingContext {
  const gl = {
    TEXTURE_2D: 0x0de1,
    RGBA: 0x1908,
    UNSIGNED_BYTE: 0x1401,
    NEAREST: 0x2600,
    LINEAR: 0x2601,
    CLAMP_TO_EDGE: 0x812f,
    TEXTURE0: 0x84c0,
    TRIANGLE_STRIP: 0x0005,
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    COMPILE_STATUS: 0x8b81,
    LINK_STATUS: 0x8b82,

    createTexture: vi.fn(() => ({})),
    deleteTexture: vi.fn(),
    bindTexture: vi.fn(),
    texParameteri: vi.fn(),
    texImage2D: vi.fn(),

    createVertexArray: vi.fn(() => ({})),
    deleteVertexArray: vi.fn(),
    bindVertexArray: vi.fn(),

    createProgram: vi.fn(() => ({})),
    deleteProgram: vi.fn(),
    createShader: vi.fn(() => ({})),
    deleteShader: vi.fn(),
    attachShader: vi.fn(),
    detachShader: vi.fn(),
    linkProgram: vi.fn(),
    compileShader: vi.fn(),
    shaderSource: vi.fn(),
    useProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    getShaderParameter: vi.fn(() => true),
    getProgramInfoLog: vi.fn(() => ''),
    getShaderInfoLog: vi.fn(() => ''),
    getUniformLocation: vi.fn(() => ({})),
    uniform1i: vi.fn(),
    uniform1f: vi.fn(),
    uniform2f: vi.fn(),
    uniform4f: vi.fn(),
    uniformMatrix3fv: vi.fn(),
    activeTexture: vi.fn(),
    drawArrays: vi.fn(),
  }

  return gl as unknown as WebGL2RenderingContext
}

type MockProvider = VideoFrameProvider & {
  getCurrent: ReturnType<typeof vi.fn>
  setPlayhead: ReturnType<typeof vi.fn>
  markIdle: ReturnType<typeof vi.fn>
  markActive: ReturnType<typeof vi.fn>
  dispose: ReturnType<typeof vi.fn>
}

function makeMockProvider(): MockProvider {
  return {
    getCurrent: vi.fn(() => null),
    setPlayhead: vi.fn(),
    markIdle: vi.fn(),
    markActive: vi.fn(),
    dispose: vi.fn(),
  }
}

function makeClip(overrides: Partial<ActiveVideoClip> = {}): ActiveVideoClip {
  return {
    id: 'clip-a',
    trackId: 'track-1',
    name: 'Clip A',
    type: 'video',
    src: 'video://asset-1',
    sourceFrame: 0,
    opacity: 1,
    zIndex: 0,
    volume: 1,
    ...overrides,
  }
}

function makeCtx(gl: WebGL2RenderingContext): LayerContext {
  return {
    gl,
    frame: 0,
    stage: { width: 1280, height: 720 },
    viewport: { width: 1280, height: 720 },
    fps: 30,
  }
}

const IDLE_MS = 5_000

describe('VideoLayer provider eviction', () => {
  let gl: WebGL2RenderingContext
  let ctx: LayerContext
  let pool: TexturePool
  /** One provider per clip id, so a test can assert on a specific clip's decoder. */
  let providersByItemId: Map<string, MockProvider>
  let layer: VideoLayer

  /**
   * Builds a layer whose factory hands out a fresh provider per call. Every
   * clip must get its own provider here: VideoLayer keys providers by clip id
   * (copy-pasted clips share a src but must never share a playhead), so a
   * single shared mock would make "was this clip's decoder freed" unanswerable.
   */
  function makeLayer(options?: { maxIdleProviders?: number; idleDisposeMs?: number }): VideoLayer {
    return new VideoLayer(pool, () => makeMockProvider(), {
      idleDisposeMs: IDLE_MS,
      ...options,
    })
  }

  /** Acquire a clip and remember the provider VideoLayer created for it. */
  function acquire(itemId: string, l: VideoLayer = layer): MockProvider {
    l.acquire(makeClip({ id: itemId }), ctx)
    const provider = l.getProviderForItemId(itemId) as MockProvider
    providersByItemId.set(itemId, provider)
    return provider
  }

  /** Run one prewarm pass over the given clip ids and return their providers. */
  function prewarm(itemIds: string[], l: VideoLayer = layer): MockProvider[] {
    l.prewarm(
      itemIds.map((id) => makeClip({ id })),
      ctx,
    )
    return itemIds.map((id) => {
      const provider = l.getProviderForItemId(id) as MockProvider
      if (provider !== undefined) providersByItemId.set(id, provider)
      return provider
    })
  }

  /**
   * Independent recount of "providers at refCount 0", derived from the public
   * per-item accessors instead of whatever bookkeeping getIdleProviderCount()
   * happens to read. The point of the counter is to be checkable against the
   * real map; asserting it against itself is how the prewarm leak stayed
   * invisible.
   */
  function countIdleProviders(itemIds: string[], l: VideoLayer = layer): number {
    return itemIds.filter(
      (id) => l.getProviderForItemId(id) !== undefined && l.getProviderRefCount(id) === 0,
    ).length
  }

  beforeEach(() => {
    vi.useFakeTimers()
    gl = createMockGL()
    ctx = makeCtx(gl)
    pool = new TexturePool({ maxTextures: 64 })
    providersByItemId = new Map()
    layer = makeLayer()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('disposes and unmaps a released provider once the idle period elapses', () => {
    const provider = acquire('clip-a')

    layer.release('clip-a')
    // Still warm: a clip that comes straight back must not pay a cold open.
    expect(provider.dispose).not.toHaveBeenCalled()
    expect(layer.getProviderCount()).toBe(1)
    expect(layer.getIdleProviderCount()).toBe(1)

    vi.advanceTimersByTime(IDLE_MS)

    expect(provider.dispose).toHaveBeenCalledTimes(1)
    expect(layer.getProviderCount()).toBe(0)
    expect(layer.getProviderForItemId('clip-a')).toBeUndefined()
    expect(layer.getIdleProviderCount()).toBe(0)
  })

  it('cancels the pending eviction when the clip is re-acquired before the deadline', () => {
    const provider = acquire('clip-a')
    layer.release('clip-a')

    vi.advanceTimersByTime(IDLE_MS - 1)
    layer.acquire(makeClip({ id: 'clip-a' }), ctx)

    // The re-acquire must have cancelled the timer outright, not merely
    // deferred it — otherwise the decoder feeding the current frame is torn
    // out one millisecond later.
    expect(layer.getIdleProviderCount()).toBe(0)
    vi.advanceTimersByTime(IDLE_MS * 10)

    expect(provider.dispose).not.toHaveBeenCalled()
    expect(layer.getProviderForItemId('clip-a')).toBe(provider)
    expect(layer.getProviderRefCount('clip-a')).toBe(1)
  })

  it('never disposes a provider that is still being drawn', () => {
    const active = acquire('clip-active')

    // Churn far more idle clips than the cap allows, so both the LRU sweep and
    // the deadline run repeatedly while clip-active stays on screen.
    for (let i = 0; i < 20; i++) {
      const id = `clip-${i}`
      acquire(id)
      layer.release(id)
      vi.advanceTimersByTime(IDLE_MS / 4)
    }
    vi.advanceTimersByTime(IDLE_MS * 2)

    expect(active.dispose).not.toHaveBeenCalled()
    expect(layer.getProviderForItemId('clip-active')).toBe(active)
    expect(layer.getProviderRefCount('clip-active')).toBe(1)
    expect(layer.getProviderCount()).toBe(1)
  })

  it('disposes the least-recently-released provider when the idle cap is exceeded', () => {
    layer = makeLayer({ maxIdleProviders: 2 })

    const a = acquire('clip-a')
    const b = acquire('clip-b')
    const c = acquire('clip-c')

    // Released well inside one idle window: the deadline cannot save us here,
    // which is exactly the burst the cap exists for.
    layer.release('clip-a')
    layer.release('clip-b')
    expect(layer.getIdleProviderCount()).toBe(2)
    expect(a.dispose).not.toHaveBeenCalled()

    layer.release('clip-c')

    // clip-a was released first, so it is the one that goes.
    expect(a.dispose).toHaveBeenCalledTimes(1)
    expect(layer.getProviderForItemId('clip-a')).toBeUndefined()
    expect(b.dispose).not.toHaveBeenCalled()
    expect(c.dispose).not.toHaveBeenCalled()
    expect(layer.getIdleProviderCount()).toBe(2)
    expect(layer.getProviderCount()).toBe(2)
  })

  it('re-arms rather than grows the idle set when a released clip is prewarmed again', () => {
    layer = makeLayer({ maxIdleProviders: 2 })

    const a = acquire('clip-a')
    const b = acquire('clip-b')
    layer.release('clip-a')
    layer.release('clip-b')

    // Scrub back over clip-a: it re-enters the prewarm horizon without being
    // drawn yet. Its deadline should move to the tail of the LRU order.
    vi.advanceTimersByTime(IDLE_MS - 1)
    layer.prewarm([makeClip({ id: 'clip-a', sourceFrame: 12 })], ctx)

    expect(layer.getIdleProviderCount()).toBe(2)
    expect(a.setPlayhead).toHaveBeenCalledWith(12)

    // clip-b's original deadline arrives; clip-a's was pushed out.
    vi.advanceTimersByTime(1)
    expect(b.dispose).toHaveBeenCalledTimes(1)
    expect(a.dispose).not.toHaveBeenCalled()

    vi.advanceTimersByTime(IDLE_MS)
    expect(a.dispose).toHaveBeenCalledTimes(1)
    expect(layer.getProviderCount()).toBe(0)
  })

  it('keeps the live provider count bounded across a long editing session', () => {
    // The regression test for the original bug: before the fix this loop left
    // 200 providers (each with a decoder and up to 30 decoded frames) alive.
    layer = makeLayer({ maxIdleProviders: 4 })

    const disposed: MockProvider[] = []
    for (let i = 0; i < 200; i++) {
      const id = `clip-${i}`
      const provider = acquire(id)
      layer.draw(makeClip({ id }), ctx)
      layer.release(id)

      // A scrub advances the clock unevenly — some releases land inside one
      // idle window (cap territory), some outside it (deadline territory).
      vi.advanceTimersByTime(i % 5 === 0 ? IDLE_MS * 2 : IDLE_MS / 8)

      // Every provider is idle at this point (the clip was just released), so
      // the cap is the whole bound — no slack.
      expect(layer.getProviderCount()).toBeLessThanOrEqual(4)
      if (provider.dispose.mock.calls.length > 0) disposed.push(provider)
    }

    vi.advanceTimersByTime(IDLE_MS * 2)

    expect(layer.getProviderCount()).toBe(0)
    expect(layer.getIdleProviderCount()).toBe(0)
    // Every provider ever created was actually freed, not merely unmapped.
    for (const provider of providersByItemId.values()) {
      expect(provider.dispose).toHaveBeenCalledTimes(1)
    }
    expect(disposed.length).toBeGreaterThan(0)
  })

  // -------------------------------------------------------------------------
  // prewarm-created providers.
  //
  // These were the hole in the first fix: prewarm() creates providers at
  // refCount 0 that release() never sees, so neither the deadline nor the cap
  // reached them. Their only reclaim path was the scrub-away sweep inside
  // prewarm() itself — which stops running the moment the render loop does.
  // -------------------------------------------------------------------------

  it('disposes a prewarm-created provider once the idle deadline elapses', () => {
    const [provider] = prewarm(['clip-a'])

    // Warm and undrawn — exactly the state release() produces, and it must be
    // accounted for the same way.
    expect(layer.getProviderCount()).toBe(1)
    expect(layer.getIdleProviderCount()).toBe(1)
    expect(provider.dispose).not.toHaveBeenCalled()

    vi.advanceTimersByTime(IDLE_MS)

    expect(provider.dispose).toHaveBeenCalledTimes(1)
    expect(layer.getProviderCount()).toBe(0)
    expect(layer.getIdleProviderCount()).toBe(0)
  })

  it('does not strand prewarmed providers when prewarm() stops being called', () => {
    // The direct regression test. GpuRenderer.prewarm early-returns on !_mounted
    // and on a lost context, and the RAF loop that drives it stops when the tab
    // is hidden — so "prewarm() never runs again" is a routine state, not an
    // exotic one. Before the fix this left every prewarmed provider alive with a
    // live decoder and a full frame cache for the rest of the session.
    const providers = prewarm(['clip-a', 'clip-b', 'clip-c'])

    expect(layer.getProviderCount()).toBe(3)
    // Previously reported 0 here while three providers were live.
    expect(layer.getIdleProviderCount()).toBe(3)

    // Tab hidden: no further prewarm passes, no acquires, no releases. Nothing
    // but the clock.
    vi.advanceTimersByTime(IDLE_MS * 100)

    expect(layer.getProviderCount()).toBe(0)
    expect(layer.getIdleProviderCount()).toBe(0)
    for (const provider of providers) {
      expect(provider.dispose).toHaveBeenCalledTimes(1)
    }
  })

  it('keeps a prewarmed provider that acquire() promotes, and cancels its deadline', () => {
    const [provider] = prewarm(['clip-a'])
    expect(layer.getIdleProviderCount()).toBe(1)

    // The cut arrives: the clip is drawn, so the warm decoder is now the draw
    // lifecycle's to own. Disposing it on the deadline armed at prewarm time
    // would tear the decoder out from under the frame on screen.
    const promoted = acquire('clip-a')
    expect(promoted).toBe(provider)
    expect(layer.getProviderRefCount('clip-a')).toBe(1)
    expect(layer.getIdleProviderCount()).toBe(0)

    vi.advanceTimersByTime(IDLE_MS * 10)

    expect(provider.dispose).not.toHaveBeenCalled()
    expect(layer.getProviderForItemId('clip-a')).toBe(provider)
    expect(layer.getProviderRefCount('clip-a')).toBe(1)
  })

  it('exempts the clips in the current prewarm horizon from the idle cap', () => {
    layer = makeLayer({ maxIdleProviders: 2 })

    // A horizon wider than the cap. These are NOT scrub history — they are
    // decoding ahead of a cut and will all be refCount > 0 shortly, which the
    // cap has never bounded. Evicting them would only make prewarm() recreate
    // them on the next RAF, i.e. a 60Hz decoder open/dispose storm.
    const providers = prewarm(['p-0', 'p-1', 'p-2'])

    expect(layer.getProviderCount()).toBe(3)
    for (const provider of providers) {
      expect(provider.dispose).not.toHaveBeenCalled()
    }

    // The exemption is a cap exemption only — the deadline still bounds them.
    vi.advanceTimersByTime(IDLE_MS)
    expect(layer.getProviderCount()).toBe(0)
  })

  it('subjects prewarm-created providers to the idle cap once a sweep reaches them', () => {
    layer = makeLayer({ maxIdleProviders: 2 })

    const [a, b] = prewarm(['p-a', 'p-b'])
    expect(layer.getIdleProviderCount()).toBe(2)

    // A drawn clip is released. That sweep carries no horizon, so the prewarmed
    // providers are ordinary eviction candidates and the oldest goes — before
    // the fix they were invisible to the cap entirely and this released clip
    // would have been the third live provider under a cap of two.
    acquire('clip-drawn')
    layer.release('clip-drawn')

    expect(a.dispose).toHaveBeenCalledTimes(1)
    expect(b.dispose).not.toHaveBeenCalled()
    expect(layer.getProviderForItemId('p-a')).toBeUndefined()
    expect(layer.getIdleProviderCount()).toBe(2)
    expect(layer.getProviderCount()).toBe(2)
  })

  it('reports every refCount-0 provider, prewarm-created ones included', () => {
    const ids = ['clip-drawn', 'p-a', 'p-b']
    acquire('clip-drawn')

    // A realistic tick: one clip on screen, two warming ahead of the cut.
    layer.prewarm(
      [
        makeClip({ id: 'clip-drawn', sourceFrame: 60 }),
        makeClip({ id: 'p-a' }),
        makeClip({ id: 'p-b' }),
      ],
      ctx,
    )

    // The drawn clip is not idle; the two prewarmed ones are. The old counter
    // read the eviction-timer map and answered 0 here.
    expect(layer.getIdleProviderCount()).toBe(2)
    expect(layer.getIdleProviderCount()).toBe(countIdleProviders(ids))

    layer.release('clip-drawn')
    expect(layer.getIdleProviderCount()).toBe(3)
    expect(layer.getIdleProviderCount()).toBe(countIdleProviders(ids))

    acquire('p-a')
    expect(layer.getIdleProviderCount()).toBe(2)
    expect(layer.getIdleProviderCount()).toBe(countIdleProviders(ids))

    vi.advanceTimersByTime(IDLE_MS)
    expect(layer.getIdleProviderCount()).toBe(0)
    expect(layer.getIdleProviderCount()).toBe(countIdleProviders(ids))
  })

  it('re-arms an in-horizon deadline only once it is meaningfully consumed', () => {
    prewarm(['clip-a'])

    // prewarm() runs per RAF. A pass 100ms after the deadline was armed must not
    // pay clearTimeout + setTimeout + a cap sweep to restate a decision nothing
    // has changed — so the original deadline still stands.
    vi.advanceTimersByTime(100)
    prewarm(['clip-a'])

    vi.advanceTimersByTime(IDLE_MS - 100)
    expect(layer.getProviderCount()).toBe(0)
  })

  it('re-arms an in-horizon deadline that is close to firing', () => {
    const [provider] = prewarm(['clip-a'])

    // Past the re-arm threshold: this pass must push the deadline out, or a clip
    // sitting in the horizon while the user reads the script gets its decoder
    // torn down and reopened.
    vi.advanceTimersByTime(IDLE_MS * 0.75)
    prewarm(['clip-a'])

    vi.advanceTimersByTime(IDLE_MS * 0.5)
    expect(provider.dispose).not.toHaveBeenCalled()
    expect(layer.getProviderCount()).toBe(1)

    vi.advanceTimersByTime(IDLE_MS)
    expect(provider.dispose).toHaveBeenCalledTimes(1)
  })

  it('keeps an idle-in-horizon provider marked active while it re-warms', () => {
    // markIdle()/markActive() only juggle a timer into an unset callback today,
    // so a producer left reporting 'idle' while prewarm drives its playhead is
    // inert — but that is a property of the current provider, not a contract.
    const provider = acquire('clip-a')
    layer.release('clip-a')
    expect(provider.markIdle).toHaveBeenCalledTimes(1)

    layer.prewarm([makeClip({ id: 'clip-a', sourceFrame: 12 })], ctx)

    // markActive: once at acquire, once now that prewarm is re-warming it.
    expect(provider.markActive).toHaveBeenCalledTimes(2)
    expect(provider.setPlayhead).toHaveBeenCalledWith(12)
  })

  it('applies its shipped defaults when constructed without options', () => {
    // Every other test injects both knobs, so nothing else would notice if the
    // defaults regressed. This pins the values a production VideoLayer runs on:
    // a 20s deadline (long enough that a re-scrub stays warm) and a cap of 4.
    const DEFAULT_IDLE_MS = 20_000
    const DEFAULT_CAP = 4

    layer = new VideoLayer(pool, () => makeMockProvider())

    const provider = acquire('clip-a')
    layer.release('clip-a')

    vi.advanceTimersByTime(DEFAULT_IDLE_MS - 1)
    expect(provider.dispose).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(provider.dispose).toHaveBeenCalledTimes(1)

    // Cap: release one more than the default allows, oldest goes first.
    const held = []
    for (let i = 0; i < DEFAULT_CAP + 1; i++) {
      const id = `capped-${i}`
      held.push(acquire(id))
      layer.release(id)
    }

    expect(layer.getIdleProviderCount()).toBe(DEFAULT_CAP)
    expect(held[0].dispose).toHaveBeenCalledTimes(1)
    expect(held[DEFAULT_CAP].dispose).not.toHaveBeenCalled()
  })

  it('dispose() cancels pending evictions instead of letting them fire post-teardown', () => {
    const provider = acquire('clip-a')
    layer.release('clip-a')

    layer.dispose()
    expect(provider.dispose).toHaveBeenCalledTimes(1)
    expect(layer.getIdleProviderCount()).toBe(0)

    // A surviving timer would re-enter a torn-down layer.
    vi.advanceTimersByTime(IDLE_MS * 2)
    expect(provider.dispose).toHaveBeenCalledTimes(1)
  })
})
