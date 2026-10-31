import { describe, expect, it } from 'vitest'
import {
  createFrameSequence,
  frameAt,
  frameCount,
  normalizeFrameIndex,
  type FrameLoopMode,
} from '../frameSequence'

const seq = (count: number, loop: FrameLoopMode) =>
  createFrameSequence({
    frames: Array.from({ length: count }, (_, i) => `frame-${i}.webp`),
    loop,
  })

describe('createFrameSequence', () => {
  it('normalizes bare src strings into indexed frames', () => {
    const s = createFrameSequence({ frames: ['a.webp', 'b.webp', 'c.webp'] })
    expect(s.frames.map((f) => f.index)).toEqual([0, 1, 2])
    expect(s.frames.map((f) => f.src)).toEqual(['a.webp', 'b.webp', 'c.webp'])
    expect(s.frames.map((f) => f.id)).toEqual(['frame-001', 'frame-002', 'frame-003'])
  })

  it('keeps caller-supplied ids and responsive sources', () => {
    const s = createFrameSequence({
      frames: [
        { id: 'hero', src: 'a.webp', sources: [{ src: 'a.avif', width: 1440, type: 'image/avif' }] },
      ],
    })
    expect(s.frames[0]?.id).toBe('hero')
    expect(s.frames[0]?.sources?.[0]?.width).toBe(1440)
  })

  it('defaults loop from seamless — a closed orbit wraps, an open arc bounces', () => {
    expect(createFrameSequence({ frames: ['a'], seamless: true }).loop).toBe('wrap')
    expect(createFrameSequence({ frames: ['a'], seamless: false }).loop).toBe('pingpong')
  })

  it('lets an explicit loop override the seamless default', () => {
    expect(createFrameSequence({ frames: ['a'], seamless: true, loop: 'none' }).loop).toBe('none')
  })
})

describe('normalizeFrameIndex', () => {
  describe("loop: 'none' (clamp)", () => {
    const s = seq(5, 'none')
    it('clamps below zero', () => expect(normalizeFrameIndex(s, -3)).toBe(0))
    it('clamps past the end', () => expect(normalizeFrameIndex(s, 9)).toBe(4))
    it('passes through in-range', () => expect(normalizeFrameIndex(s, 3)).toBe(3))
  })

  describe("loop: 'wrap' (modulo)", () => {
    const s = seq(5, 'wrap')
    it('wraps past the end', () => expect(normalizeFrameIndex(s, 5)).toBe(0))
    it('wraps several laps past the end', () => expect(normalizeFrameIndex(s, 12)).toBe(2))
    it('wraps negatives forward, not to zero', () => {
      expect(normalizeFrameIndex(s, -1)).toBe(4)
      expect(normalizeFrameIndex(s, -6)).toBe(4)
    })
  })

  describe("loop: 'pingpong' (bounce)", () => {
    const s = seq(4, 'pingpong') // period 6: 0 1 2 3 2 1 | 0 1 2 3 ...
    it('runs forward then reverses at the end', () => {
      expect([0, 1, 2, 3, 4, 5, 6, 7].map((i) => normalizeFrameIndex(s, i))).toEqual([
        0, 1, 2, 3, 2, 1, 0, 1,
      ])
    })
    it('visits each endpoint once per period, so the turn does not stutter', () => {
      const visited = [0, 1, 2, 3, 4, 5].map((i) => normalizeFrameIndex(s, i))
      expect(visited.filter((v) => v === 3)).toHaveLength(1)
      expect(visited.filter((v) => v === 0)).toHaveLength(1)
    })
    it('bounces negatives symmetrically', () => {
      expect(normalizeFrameIndex(s, -1)).toBe(1)
      expect(normalizeFrameIndex(s, -2)).toBe(2)
    })
  })

  describe('degenerate sequences', () => {
    it('returns 0 for an empty sequence', () => {
      expect(normalizeFrameIndex(seq(0, 'wrap'), 7)).toBe(0)
    })
    it('returns 0 for a single-frame sequence in every mode', () => {
      for (const loop of ['none', 'wrap', 'pingpong'] as const) {
        expect(normalizeFrameIndex(seq(1, loop), 5)).toBe(0)
      }
    })
    it('survives non-finite input', () => {
      expect(normalizeFrameIndex(seq(5, 'wrap'), Number.NaN)).toBe(0)
      expect(normalizeFrameIndex(seq(5, 'wrap'), Number.POSITIVE_INFINITY)).toBe(0)
    })
  })

  it('rounds fractional indices, so a slow drag lands on a real frame', () => {
    const s = seq(5, 'none')
    expect(normalizeFrameIndex(s, 2.4)).toBe(2)
    expect(normalizeFrameIndex(s, 2.6)).toBe(3)
  })
})

describe('frameAt', () => {
  it('normalizes before indexing', () => {
    const s = seq(4, 'wrap')
    expect(frameAt(s, 5).index).toBe(1)
  })

  it('throws only on an empty sequence', () => {
    expect(() => frameAt(seq(0, 'none'), 0)).toThrow(/no frames/)
  })
})

describe('frameCount', () => {
  it('reports the number of frames', () => {
    expect(frameCount(seq(36, 'wrap'))).toBe(36)
  })
})
