import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TimelineEngine } from './TimelineEngine'

/**
 * Covers TimelineEngine.setClipSpeed() — the atomic speed+duration mutation
 * backing per-clip fast-forward (2x/4x) and slow-down. Video only: clips on
 * this timeline are audio-stripped, so there is no audio time-stretch
 * concern and non-video clips never expose a speed control.
 */
describe('TimelineEngine — setClipSpeed', () => {
  let engine: TimelineEngine
  let trackId: string

  beforeEach(() => {
    engine = new TimelineEngine({ fps: 30 })
    trackId = engine.addTrack('video').id
  })

  function addVideoClip(overrides: {
    startFrame?: number
    durationFrames?: number
    sourceDurationFrames?: number
  } = {}) {
    const clip = engine.addClip({
      trackId,
      type: 'video',
      name: 'V1',
      src: 'fake.mp4',
      startFrame: overrides.startFrame ?? 0,
      durationFrames: overrides.durationFrames ?? 30,
    })
    // addClip seeds sourceDurationFrames = durationFrames; bump it directly
    // when the test needs more source than the initial timeline duration
    // (simulating a clip whose source is longer than what's currently placed).
    if (overrides.sourceDurationFrames !== undefined) {
      engine.updateClip(clip.id, trackId, { sourceDurationFrames: overrides.sourceDurationFrames })
    }
    return clip.id
  }

  it('speeding up to 2x halves durationFrames and sets speed', () => {
    const clipId = addVideoClip({ durationFrames: 30, sourceDurationFrames: 60 })

    engine.setClipSpeed(clipId, trackId, 2)

    const clip = engine.findClip(clipId)!.clip
    expect(clip.speed).toBe(2)
    expect(clip.durationFrames).toBe(15)
  })

  it('slowing to 0.5x doubles durationFrames when there is room', () => {
    // sourceDurationFrames=100 leaves ample trimmed-but-unused source to grow
    // into (floor(100/0.5)=200, far above the 40 frames this test wants).
    const clipId = addVideoClip({ durationFrames: 20, sourceDurationFrames: 100 })

    engine.setClipSpeed(clipId, trackId, 0.5)

    const clip = engine.findClip(clipId)!.clip
    expect(clip.speed).toBe(0.5)
    expect(clip.durationFrames).toBe(40)
  })

  it('going from 2x back to 1x restores the original duration', () => {
    const clipId = addVideoClip({ durationFrames: 30, sourceDurationFrames: 60 })

    engine.setClipSpeed(clipId, trackId, 2)
    expect(engine.findClip(clipId)!.clip.durationFrames).toBe(15)

    engine.setClipSpeed(clipId, trackId, 1)
    const clip = engine.findClip(clipId)!.clip
    expect(clip.speed).toBe(1)
    expect(clip.durationFrames).toBe(30)
  })

  it('clamps speed to the [0.25, 4] range', () => {
    const clipId = addVideoClip({ durationFrames: 40, sourceDurationFrames: 400 })

    engine.setClipSpeed(clipId, trackId, 100)
    expect(engine.findClip(clipId)!.clip.speed).toBe(4)

    engine.setClipSpeed(clipId, trackId, 0.001)
    expect(engine.findClip(clipId)!.clip.speed).toBe(0.25)
  })

  it('clamps durationFrames so it never exceeds floor(sourceDurationFrames / speed)', () => {
    // sourceDurationFrames=25 at speed=4 → floor(25/4) = 6, well below the
    // naive round(30*1/4)=8 the ratio formula alone would produce.
    const clipId = addVideoClip({ durationFrames: 30, sourceDurationFrames: 25 })

    engine.setClipSpeed(clipId, trackId, 4)

    const clip = engine.findClip(clipId)!.clip
    expect(clip.durationFrames).toBe(6)
    expect(clip.durationFrames * 4).toBeLessThanOrEqual(clip.sourceDurationFrames)
  })

  it('never produces a zero or negative duration even at extreme speed', () => {
    const clipId = addVideoClip({ durationFrames: 4, sourceDurationFrames: 4 })

    engine.setClipSpeed(clipId, trackId, 4)

    expect(engine.findClip(clipId)!.clip.durationFrames).toBeGreaterThanOrEqual(1)
  })

  it('growing (slow-down) clamps to the gap before the next clip instead of overlapping it', () => {
    // c1: [0, 20) at 20-frame duration, sourceDurationFrames large enough that
    // slowing to 0.25x would WANT 80 frames — but c2 starts at frame 25, only
    // leaving a 25-frame gap.
    const clipId = addVideoClip({ startFrame: 0, durationFrames: 20, sourceDurationFrames: 20 })
    engine.addClip({
      trackId,
      type: 'video',
      name: 'V2',
      src: 'fake2.mp4',
      startFrame: 25,
      durationFrames: 10,
    })

    engine.setClipSpeed(clipId, trackId, 0.25)

    const clip = engine.findClip(clipId)!.clip
    expect(clip.speed).toBe(0.25)
    expect(clip.durationFrames).toBe(25) // clamped to the gap, not the full 80
    expect(clip.startFrame + clip.durationFrames).toBeLessThanOrEqual(25)
  })

  it('is a no-op on non-video clips', () => {
    const textTrack = engine.addTrack('elements').id
    const clip = engine.addClip({
      trackId: textTrack,
      type: 'text',
      name: 'Text',
      text: { content: 'Hi' },
      startFrame: 0,
      durationFrames: 30,
    })

    engine.setClipSpeed(clip.id, textTrack, 2)

    expect(engine.findClip(clip.id)!.clip.speed).toBeUndefined()
    expect(engine.findClip(clip.id)!.clip.durationFrames).toBe(30)
  })

  it('is a no-op on a locked track', () => {
    const clipId = addVideoClip({ durationFrames: 30, sourceDurationFrames: 60 })
    engine.updateTrack(trackId, { locked: true })

    engine.setClipSpeed(clipId, trackId, 2)

    const clip = engine.findClip(clipId)!.clip
    expect(clip.speed).toBeUndefined()
    expect(clip.durationFrames).toBe(30)
  })

  it('setting the same speed again is a no-op (no change event, no history entry)', () => {
    const clipId = addVideoClip({ durationFrames: 30, sourceDurationFrames: 60 })
    engine.setClipSpeed(clipId, trackId, 2)

    const change = vi.fn()
    engine.on('change', change)
    engine.setClipSpeed(clipId, trackId, 2)

    expect(change).not.toHaveBeenCalled()
  })

  it('undo reverts both speed and durationFrames together as one entry', () => {
    const clipId = addVideoClip({ durationFrames: 30, sourceDurationFrames: 60 })

    engine.setClipSpeed(clipId, trackId, 2)
    expect(engine.findClip(clipId)!.clip.speed).toBe(2)
    expect(engine.findClip(clipId)!.clip.durationFrames).toBe(15)

    engine.undo()

    const clip = engine.findClip(clipId)!.clip
    expect(clip.speed).toBeUndefined()
    expect(clip.durationFrames).toBe(30)
  })

  it('redo re-applies a committed speed change', () => {
    const clipId = addVideoClip({ durationFrames: 30, sourceDurationFrames: 60 })

    engine.setClipSpeed(clipId, trackId, 2)
    engine.undo()
    engine.redo()

    const clip = engine.findClip(clipId)!.clip
    expect(clip.speed).toBe(2)
    expect(clip.durationFrames).toBe(15)
  })
})
