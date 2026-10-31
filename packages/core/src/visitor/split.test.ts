import { produce } from 'immer'
import { describe, expect, it } from 'vitest'
import { splitClip } from './split'
import type { Clip, Project, Track } from '../types'

function makeTrack(overrides?: Partial<Track>): Track {
  return {
    id: 't1',
    name: 'T',
    kind: 'video',
    order: 0,
    height: 64,
    locked: false,
    disabled: false,
    muted: false,
    solo: false,
    ...overrides,
  }
}

function makeClip(overrides?: Partial<Clip>): Clip {
  return {
    id: 'c1',
    trackId: 't1',
    type: 'video',
    name: 'C',
    startFrame: 0,
    durationFrames: 30,
    sourceStartFrame: 0,
    sourceDurationFrames: 30,
    src: 'fake.mp4',
    ...overrides,
  }
}

function makeProject(clip: Clip, track: Track = makeTrack()): Project {
  return {
    id: 'p1',
    fps: 30,
    stage: { width: 1080, height: 1920 },
    tracks: [track],
    clips: { [track.id]: [clip] },
    transitions: [],
    version: 1,
  }
}

/**
 * splitClip mutates the draft AND returns [leftId, rightId] | null — Immer
 * forbids a producer from both mutating and returning a value, so the result
 * must be captured via an outer variable (the same pattern
 * TimelineEngine.splitClip itself uses), not by returning it from the recipe.
 */
function runSplit(
  project: Project,
  clipId: string,
  trackId: string,
  atFrame: number,
): { project: Project; ids: [string, string] | null } {
  let ids: [string, string] | null = null
  const next = produce(project, (draft) => {
    ids = splitClip(draft, clipId, trackId, atFrame)
  })
  return { project: next, ids }
}

describe('splitClip (visitor)', () => {
  it('speed=1: matches the original 1:1 split behavior exactly', () => {
    const clip = makeClip({ startFrame: 0, durationFrames: 30, sourceStartFrame: 10, sourceDurationFrames: 30 })
    const project = makeProject(clip)

    const { project: next, ids } = runSplit(project, 'c1', 't1', 12)
    expect(ids).toEqual(['c1', expect.any(String)])
    const [, rightId] = ids!

    const left = next.clips.t1.find((c) => c.id === 'c1')!
    const right = next.clips.t1.find((c) => c.id === rightId)!

    expect(left.durationFrames).toBe(12)
    expect(left.sourceDurationFrames).toBe(12)
    expect(left.sourceStartFrame).toBe(10) // unchanged

    expect(right.startFrame).toBe(12)
    expect(right.durationFrames).toBe(18)
    expect(right.sourceStartFrame).toBe(22) // 10 + 12
    expect(right.sourceDurationFrames).toBe(18)
  })

  it("speed=2: the right half's sourceStartFrame advances by 2x the left timeline duration", () => {
    // 20 timeline frames covering source frames 0..39 at 2x.
    const clip = makeClip({
      startFrame: 0,
      durationFrames: 20,
      sourceStartFrame: 0,
      sourceDurationFrames: 40,
      speed: 2,
    })
    const project = makeProject(clip)

    const { project: next, ids } = runSplit(project, 'c1', 't1', 8)
    const [, rightId] = ids!
    const left = next.clips.t1.find((c) => c.id === 'c1')!
    const right = next.clips.t1.find((c) => c.id === rightId)!

    // Left half: 8 timeline frames * speed 2 = 16 source frames consumed.
    expect(left.durationFrames).toBe(8)
    expect(left.sourceDurationFrames).toBe(16)
    expect(left.sourceStartFrame).toBe(0)
    expect(left.speed).toBe(2)

    // Right half starts where the left's source consumption left off.
    expect(right.startFrame).toBe(8)
    expect(right.durationFrames).toBe(12)
    expect(right.sourceStartFrame).toBe(16)
    expect(right.sourceDurationFrames).toBe(24) // 12 * 2
    expect(right.speed).toBe(2) // carried through the ...clip spread
  })

  it("speed=0.5: the right half's sourceStartFrame advances by half the left timeline duration", () => {
    const clip = makeClip({
      startFrame: 0,
      durationFrames: 20,
      sourceStartFrame: 0,
      sourceDurationFrames: 10,
      speed: 0.5,
    })
    const project = makeProject(clip)

    const { project: next, ids } = runSplit(project, 'c1', 't1', 10)
    const [, rightId] = ids!
    const left = next.clips.t1.find((c) => c.id === 'c1')!
    const right = next.clips.t1.find((c) => c.id === rightId)!

    expect(left.durationFrames).toBe(10)
    expect(left.sourceDurationFrames).toBe(5) // 10 * 0.5
    expect(right.sourceStartFrame).toBe(5)
    expect(right.durationFrames).toBe(10)
    expect(right.sourceDurationFrames).toBe(5) // 10 * 0.5
  })

  it('returns null and leaves the track untouched when the split point is not strictly inside the clip', () => {
    const clip = makeClip({ startFrame: 0, durationFrames: 30 })
    const project = makeProject(clip)

    const atStart = runSplit(project, 'c1', 't1', 0)
    const atEnd = runSplit(project, 'c1', 't1', 30)
    const outside = runSplit(project, 'c1', 't1', 999)

    expect(atStart.ids).toBeNull()
    expect(atEnd.ids).toBeNull()
    expect(outside.ids).toBeNull()
    expect(atStart.project.clips.t1.length).toBe(1)
    expect(atEnd.project.clips.t1.length).toBe(1)
    expect(outside.project.clips.t1.length).toBe(1)
  })
})
