import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFrameSequence, type FrameLoopMode } from '../frameSequence'
import { FrameSequenceController } from '../FrameSequenceController'

/**
 * Core's vitest runs in Node, so the RAF the PlaybackEngine drives itself with
 * has to be supplied. Queue the callbacks rather than firing them, so tests
 * step the clock deliberately (same approach as PlaybackEngine.test.ts).
 */
let rafQueue: FrameRequestCallback[] = []

function flushFrames(): void {
  rafQueue.splice(0).forEach((cb) => cb(0))
}

const makeSequence = (count = 36, loop: FrameLoopMode = 'wrap') =>
  createFrameSequence({
    frames: Array.from({ length: count }, (_, i) => `frame-${i}.webp`),
    fps: 24,
    loop,
    seamless: loop === 'wrap',
  })

/** Deterministic clock so playback tests never depend on wall time. */
function fakeClock() {
  let t = 0
  return {
    now: () => t,
    advance: (seconds: number) => {
      t += seconds
    },
  }
}

let controllers: FrameSequenceController[] = []
function make(...args: ConstructorParameters<typeof FrameSequenceController>) {
  const c = new FrameSequenceController(...args)
  controllers.push(c)
  return c
}

beforeEach(() => {
  rafQueue = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafQueue.push(cb)
    return rafQueue.length
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
})

afterEach(() => {
  // Tear controllers down while the RAF stubs are still installed — destroy()
  // reaches cancelAnimationFrame, which does not exist in the Node env.
  for (const c of controllers.splice(0)) c.destroy()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('construction', () => {
  it('starts at index 0 by default', () => {
    expect(make({ sequence: makeSequence() }).index).toBe(0)
  })

  it('normalizes an out-of-range initialIndex', () => {
    const c = make({ sequence: makeSequence(10, 'wrap'), initialIndex: 12 })
    expect(c.index).toBe(2)
  })

  it('lets options.loop override the sequence loop without mutating it', () => {
    const sequence = makeSequence(10, 'wrap')
    const c = make({ sequence, loop: 'none' })
    c.seek(-5)
    expect(c.index).toBe(0) // clamped, so 'none' took effect
    expect(sequence.loop).toBe('wrap') // caller's object untouched
  })
})

describe('snapshot', () => {
  it('is reference-stable between changes (useSyncExternalStore contract)', () => {
    const c = make({ sequence: makeSequence() })
    expect(c.getSnapshot()).toBe(c.getSnapshot())
  })

  it('returns a new reference after a change', () => {
    const c = make({ sequence: makeSequence() })
    const before = c.getSnapshot()
    c.seek(4)
    expect(c.getSnapshot()).not.toBe(before)
    expect(c.getSnapshot().index).toBe(4)
  })
})

describe('transport', () => {
  it('seek emits exactly once per change', () => {
    const c = make({ sequence: makeSequence() })
    const listener = vi.fn()
    c.subscribe(listener)
    c.seek(5)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0]?.[0].index).toBe(5)
  })

  it('seek to the current index emits nothing', () => {
    const c = make({ sequence: makeSequence(), initialIndex: 3 })
    const listener = vi.fn()
    c.subscribe(listener)
    c.seek(3)
    expect(listener).not.toHaveBeenCalled()
  })

  it('next/prev step through wrap boundaries', () => {
    const c = make({ sequence: makeSequence(4, 'wrap') })
    c.prev()
    expect(c.index).toBe(3)
    c.next()
    expect(c.index).toBe(0)
  })

  it('next/prev stop at the ends under loop: none', () => {
    const c = make({ sequence: makeSequence(4, 'none') })
    c.prev()
    expect(c.index).toBe(0)
    c.seek(3)
    c.next()
    expect(c.index).toBe(3)
  })

  it('play/pause report through the snapshot', () => {
    const c = make({ sequence: makeSequence(), now: fakeClock().now })
    expect(c.getSnapshot().isPlaying).toBe(false)
    c.play()
    expect(c.getSnapshot().isPlaying).toBe(true)
    c.pause()
    expect(c.getSnapshot().isPlaying).toBe(false)
  })

  it('repeated play() does not re-emit', () => {
    const c = make({ sequence: makeSequence(), now: fakeClock().now })
    c.play()
    const listener = vi.fn()
    c.subscribe(listener)
    c.play()
    expect(listener).not.toHaveBeenCalled()
  })

  it('setLoop re-normalizes an index the new mode disallows', () => {
    const c = make({ sequence: makeSequence(5, 'wrap'), initialIndex: 4 })
    c.setLoop('none')
    expect(c.index).toBe(4)
    c.seek(99)
    expect(c.index).toBe(4)
  })
})

describe('setSequence', () => {
  it('resets to frame 0 by default', () => {
    const c = make({ sequence: makeSequence(36), initialIndex: 20 })
    c.setSequence(makeSequence(12))
    expect(c.index).toBe(0)
  })

  it('preserves and normalizes the index when asked', () => {
    const c = make({ sequence: makeSequence(36, 'wrap'), initialIndex: 20 })
    c.setSequence(makeSequence(12, 'wrap'), { preserveIndex: true })
    expect(c.index).toBe(8) // 20 wrapped into 12 frames
  })
})

describe('drag', () => {
  /** 36 frames across a 360px viewport at sensitivity 1 → 10px per frame. */
  function draggable(loop: FrameLoopMode = 'wrap') {
    const c = make({ sequence: makeSequence(36, loop) })
    c.setViewportWidth(360)
    return c
  }

  it('maps a full-width drag to exactly one pass through the sequence', () => {
    // Under wrap, one full pass lands back on frame 0 — a weaker assertion
    // (clamping under 'none') would also pass if the mapping were too fast.
    const c = draggable('wrap')
    c.beginDrag(0)
    c.drag(360)
    c.endDrag()
    expect(c.index).toBe(0)

    // Half a width is half the sequence, confirming the mapping is linear and
    // not merely overshooting into a wrap.
    const half = draggable('wrap')
    half.beginDrag(0)
    half.drag(180)
    expect(half.index).toBe(18)
  })

  it('drag right increases the index', () => {
    const c = draggable()
    c.beginDrag(0)
    c.drag(50)
    expect(c.index).toBe(5)
  })

  it('drag left decreases the index', () => {
    const c = draggable()
    c.seek(10)
    c.beginDrag(0)
    c.drag(-30)
    expect(c.index).toBe(7)
  })

  it('accumulates sub-frame movement instead of rounding it away', () => {
    const c = draggable()
    c.beginDrag(0)
    // Four 4px steps = 16px = 1.6 frames. Each step alone rounds to 0 frames;
    // only a float accumulator gets the index moving at all.
    for (const x of [4, 8, 12, 16]) c.drag(x)
    expect(c.index).toBe(2)
  })

  it('emits only when the integer index changes, not on every pointer sample', () => {
    const c = draggable()
    c.beginDrag(0)
    const listener = vi.fn()
    c.subscribe(listener)
    // Ten 1px samples = 1 frame of travel → at most one emit.
    for (let x = 1; x <= 10; x++) c.drag(x)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('pauses autoplay when a drag takes over', () => {
    const c = make({ sequence: makeSequence(), now: fakeClock().now })
    c.play()
    c.beginDrag(0)
    expect(c.getSnapshot().isPlaying).toBe(false)
    expect(c.getSnapshot().isDragging).toBe(true)
  })

  it('reports isDragging across the gesture', () => {
    const c = draggable()
    expect(c.isDragging).toBe(false)
    c.beginDrag(0)
    expect(c.isDragging).toBe(true)
    c.endDrag()
    expect(c.isDragging).toBe(false)
  })

  it('ignores drag() and endDrag() outside a gesture', () => {
    const c = draggable()
    const listener = vi.fn()
    c.subscribe(listener)
    c.drag(100)
    c.endDrag()
    expect(listener).not.toHaveBeenCalled()
    expect(c.index).toBe(0)
  })

  it('wraps around the ends mid-drag under loop: wrap', () => {
    const c = draggable('wrap')
    c.beginDrag(0)
    c.drag(-50) // 5 frames back from 0
    expect(c.index).toBe(31)
  })

  it('scales with viewport width so the gesture feels the same at any size', () => {
    const wide = make({ sequence: makeSequence(36, 'none') })
    wide.setViewportWidth(1440)
    wide.beginDrag(0)
    wide.drag(720) // half the width

    const narrow = make({ sequence: makeSequence(36, 'none') })
    narrow.setViewportWidth(360)
    narrow.beginDrag(0)
    narrow.drag(180) // also half the width

    expect(wide.index).toBe(narrow.index)
  })

  it('honours dragSensitivity', () => {
    const fast = make({ sequence: makeSequence(36, 'wrap'), dragSensitivity: 2 })
    fast.setViewportWidth(360)
    fast.beginDrag(0)
    fast.drag(90) // a quarter width

    const normal = draggable('wrap')
    normal.beginDrag(0)
    normal.drag(90)

    // Sensitivity 2 covers the sequence in half the travel, so the same
    // gesture moves twice as far.
    expect(normal.index).toBe(9)
    expect(fast.index).toBe(18)
  })
})

describe('playback', () => {
  it('advances the index as the clock runs', () => {
    const clock = fakeClock()
    const c = make({ sequence: makeSequence(36, 'wrap'), fps: 24, now: clock.now })
    c.play()

    clock.advance(0.5) // 12 frames at 24fps
    flushFrames()

    expect(c.index).toBe(12)
  })

  it('resumes from where a drag ended, not from a stale anchor', () => {
    const clock = fakeClock()
    const c = make({ sequence: makeSequence(36, 'wrap'), now: clock.now })
    c.setViewportWidth(360)
    c.beginDrag(0)
    c.drag(100)
    c.endDrag()
    const landed = c.index
    c.play()
    expect(c.index).toBe(landed)
  })
})

describe('destroy', () => {
  it('stops notifying listeners', () => {
    const c = new FrameSequenceController({ sequence: makeSequence() })
    const listener = vi.fn()
    c.subscribe(listener)
    c.destroy()
    c.seek(5)
    expect(listener).not.toHaveBeenCalled()
  })
})
