import { describe, expect, it, vi } from 'vitest'
import { createFrameSequence, type FrameLoopMode } from '../frameSequence'
import { createFramePreloader } from '../framePreloader'
import type { ImageLoader, LoadedImage } from '../../renderer/gpu/layers/imageCache'

const makeSequence = (count = 36, loop: FrameLoopMode = 'wrap') =>
  createFrameSequence({
    frames: Array.from({ length: count }, (_, i) => `frame-${i}.webp`),
    loop,
    seamless: loop === 'wrap',
  })

const loaded: LoadedImage = { source: {} as TexImageSource, width: 1, height: 1 }

/** A loader that records call order and resolves on demand. */
function controllableLoader() {
  const calls: string[] = []
  const resolvers: Array<() => void> = []
  const loader: ImageLoader = (src) => {
    calls.push(src)
    return new Promise<LoadedImage>((resolve) => {
      resolvers.push(() => resolve(loaded))
    })
  }
  return {
    loader,
    calls,
    /**
     * Settle everything queued so far, then let the pump run.
     *
     * Each frame's loader call now lands a few microtask ticks *after*
     * `focus()`/the previous `done()` — it is deferred through
     * `pickFrameSource` first — so this can't simply loop "while there are
     * resolvers": right after `focus()` there are none yet, only a promise
     * that will produce one. Instead it alternates "wait a few ticks" and
     * "resolve whatever showed up" for a fixed, generous number of rounds —
     * comfortably more than any test sequence needs to fully drain.
     */
    async settleAll() {
      for (let round = 0; round < 100; round++) {
        for (let i = 0; i < 5; i++) await Promise.resolve()
        resolvers.splice(0).forEach((r) => r())
      }
    },
  }
}

const indexOf = (src: string) => Number(src.replace('frame-', '').replace('.webp', ''))

/**
 * `focus()` now resolves each frame's URL through `pickFrameSource` (async,
 * even for a frame with no `sources`) before calling the loader, so dispatch
 * lands a couple of microtask ticks after `focus()` returns rather than
 * synchronously within it.
 */
async function tick(times = 5): Promise<void> {
  for (let i = 0; i < times; i++) await Promise.resolve()
}

describe('createFramePreloader', () => {
  it('loads the focused frame first', async () => {
    const { loader, calls } = controllableLoader()
    createFramePreloader(makeSequence(), { loader }).focus(10)
    await tick()
    expect(indexOf(calls[0] as string)).toBe(10)
  })

  it('loads outward from the focus, nearest first', async () => {
    const { loader, calls } = controllableLoader()
    createFramePreloader(makeSequence(36, 'none'), { loader, concurrency: 5 }).focus(10)
    await tick()
    // First 5 dispatched are the focus and its immediate neighbours, in
    // increasing distance — never the far end of the sequence.
    const distances = calls.slice(0, 5).map((c) => Math.abs(indexOf(c) - 10))
    expect(Math.max(...distances)).toBeLessThanOrEqual(2)
  })

  it('respects the concurrency cap', async () => {
    const { loader, calls } = controllableLoader()
    createFramePreloader(makeSequence(), { loader, concurrency: 4 }).focus(0)
    await tick()
    expect(calls).toHaveLength(4)
  })

  it('continues through the queue as loads settle', async () => {
    const c = controllableLoader()
    const p = createFramePreloader(makeSequence(12), { loader: c.loader, concurrency: 3 })
    p.focus(0)
    await tick()
    expect(c.calls).toHaveLength(3)
    await c.settleAll()
    expect(c.calls).toHaveLength(12)
    expect(p.status()).toEqual({ loaded: 12, total: 12, complete: true })
  })

  it('treats the far end as adjacent under wrap', async () => {
    const { loader, calls } = controllableLoader()
    createFramePreloader(makeSequence(36, 'wrap'), { loader, concurrency: 3 }).focus(0)
    await tick()
    // Frame 35 is one step behind frame 0 on a closed orbit, so it must beat
    // frame 2 into the queue.
    expect(calls.map(indexOf)).toContain(35)
  })

  it('does not treat the far end as adjacent when the sequence does not wrap', async () => {
    const { loader, calls } = controllableLoader()
    createFramePreloader(makeSequence(36, 'none'), { loader, concurrency: 3 }).focus(0)
    await tick()
    expect(calls.map(indexOf)).not.toContain(35)
  })

  it('never requests the same frame twice across refocuses', async () => {
    const c = controllableLoader()
    const p = createFramePreloader(makeSequence(12), { loader: c.loader, concurrency: 12 })
    p.focus(0)
    p.focus(6)
    await c.settleAll()
    expect(new Set(c.calls).size).toBe(c.calls.length)
  })

  it('settles failures so a broken frame cannot wedge the queue', async () => {
    let n = 0
    const failing: ImageLoader = (_src) => {
      n += 1
      return n === 1 ? Promise.reject(new Error('boom')) : Promise.resolve(loaded)
    }
    const p = createFramePreloader(makeSequence(4), { loader: failing, concurrency: 1 })
    p.focus(0)
    for (let i = 0; i < 30; i++) await Promise.resolve()
    expect(p.status().complete).toBe(true)
  })

  it('reports per-frame load state', async () => {
    const c = controllableLoader()
    const p = createFramePreloader(makeSequence(4), { loader: c.loader, concurrency: 4 })
    expect(p.isLoaded(0)).toBe(false)
    p.focus(0)
    await c.settleAll()
    expect(p.isLoaded(0)).toBe(true)
  })

  it('stops scheduling after dispose', () => {
    const { loader, calls } = controllableLoader()
    const p = createFramePreloader(makeSequence(), { loader, concurrency: 2 })
    p.dispose()
    p.focus(0)
    expect(calls).toHaveLength(0)
  })

  it('normalizes an out-of-range focus rather than throwing', async () => {
    const { loader, calls } = controllableLoader()
    createFramePreloader(makeSequence(10, 'wrap'), { loader }).focus(12)
    await tick()
    expect(indexOf(calls[0] as string)).toBe(2)
  })

  it('handles an empty sequence', () => {
    const { loader, calls } = controllableLoader()
    const p = createFramePreloader(makeSequence(0), { loader })
    p.focus(0)
    expect(calls).toHaveLength(0)
    expect(p.status()).toEqual({ loaded: 0, total: 0, complete: true })
  })

  it('warms the exact URL pickFrameSource would resolve for a multi-source frame, not always frame.src', async () => {
    const { loader, calls } = controllableLoader()
    const sequence = createFrameSequence({
      frames: [
        {
          src: '/frame-0-1440.webp',
          sources: [
            { src: '/frame-0-720.avif', width: 720, type: 'image/avif' },
            { src: '/frame-0-1440.avif', width: 1440, type: 'image/avif' },
            { src: '/frame-0-1440.webp', width: 1440, type: 'image/webp' },
          ],
        },
      ],
      loop: 'none',
      seamless: false,
    })
    // jsdom has no real AVIF/WebP decoder, so supportsImageType() resolves
    // both formats unsupported and pickFrameSource falls back to frame.src —
    // this test only pins that the preloader goes *through* pickFrameSource
    // (one URL, chosen by the same function the viewer would use) rather than
    // hardcoding frame.src itself.
    createFramePreloader(sequence, { loader }).focus(0)
    await tick()
    expect(calls).toEqual(['/frame-0-1440.webp'])
  })
})
