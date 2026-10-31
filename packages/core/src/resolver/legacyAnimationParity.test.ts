/**
 * Bit-for-bit parity for the ENUM animation path.
 *
 * `TextAnimation.in` / `.out` are `TextAnimationKind` strings already written
 * into saved projects. When the sampler was rewritten to resolve layered
 * `MotionSpec`s, the enum path became sugar over that new machinery — a safe
 * refactor only if it is numerically identical, frame for frame, to what
 * shipped. Drift here silently restyles every text clip anyone has authored.
 *
 * Compared against `__fixtures__/legacyTextAnimation.ts`, a frozen verbatim copy
 * of the pre-rewrite sampler. Exact equality, not `toBeCloseTo`: this caught two
 * real regressions that were pure float-ordering, where the values differed only
 * in the last ULP —
 *
 *   - `lerp(1, 0, 1 - remaining)` round-trips a subtraction, and
 *     `1 - (1 - r) !== r` in IEEE754;
 *   - `lerp(extreme, 0, t)` is not the same value as `extreme * (1 - t)`.
 *
 * Neither would have been caught by an approximate comparison or by a
 * hand-written expectation.
 *
 * If this fails, the change under test is wrong — unless you have deliberately
 * decided to restyle stored documents, in which case update the frozen reference
 * in the same commit and say so.
 */

import { describe, it, expect } from 'vitest'
import { sampleTextAnimation, DEFAULT_TEXT_TRANSFORM } from './textAnimation'
import { legacySampleTextAnimation } from './__fixtures__/legacyTextAnimation'
import type { TextAnimationKind, Transform } from '../types'

const KINDS: (TextAnimationKind | undefined)[] = [
  undefined,
  'fade',
  'spin',
  'slide-up',
  'slide-down',
  'slide-left',
  'slide-right',
]

/** Clip lengths: 1 frame, shorter than the ramp, and comfortably longer. */
const DURATIONS = [1, 5, 12, 30, 91]
/** Ramps: minimum, short, default-ish, and longer than most clips above. */
const RAMPS = [1, 3, 15, 40]

/** A non-default authored transform, to prove rest is read rather than assumed. */
const AUTHORED: Transform = {
  x: 0.31,
  y: 0.72,
  scale: 1.75,
  rotation: 0.29,
  anchor: { x: 0.5, y: 0.5 },
  scaleX: 1.2,
  scaleY: 0.9,
}

describe('legacy enum animation parity', () => {
  for (const authored of [undefined, AUTHORED]) {
    const label = authored ? 'with an authored transform' : 'with no authored transform'

    it(`reproduces the pre-rewrite sampler exactly, ${label}`, () => {
      const mismatches: string[] = []
      let compared = 0

      for (const inKind of KINDS) {
        for (const outKind of KINDS) {
          for (const total of DURATIONS) {
            for (const ramp of RAMPS) {
              // One frame past each end too: the resolver can be asked for a
              // frame outside the clip during scrubbing.
              for (let frame = -1; frame <= total + 1; frame++) {
                const args = {
                  animation: { in: inKind, out: outKind, durationFrames: ramp },
                  localFrame: frame,
                  clipDurationFrames: total,
                  transform: authored,
                  defaultTransform: DEFAULT_TEXT_TRANSFORM,
                }
                const actual = sampleTextAnimation(args)
                const expected = legacySampleTextAnimation(args)
                compared++

                const where = `in=${inKind} out=${outKind} total=${total} ramp=${ramp} f=${frame}`

                if (actual.opacity !== expected.opacity) {
                  mismatches.push(`${where}: opacity ${actual.opacity} !== ${expected.opacity}`)
                }

                // Whether a transform is emitted at all is part of the contract:
                // a pure-opacity animation must emit none, so the renderer keeps
                // applying its own default (the transform-or-nothing rule).
                if ((actual.transform === undefined) !== (expected.transform === undefined)) {
                  mismatches.push(
                    `${where}: transform presence ${actual.transform !== undefined} !== ${expected.transform !== undefined}`,
                  )
                } else if (actual.transform && expected.transform) {
                  for (const key of ['x', 'y', 'rotation', 'scale'] as const) {
                    if (actual.transform[key] !== expected.transform[key]) {
                      mismatches.push(
                        `${where}: transform.${key} ${actual.transform[key]} !== ${expected.transform[key]}`,
                      )
                    }
                  }
                  // Untouched passthrough fields must survive too.
                  for (const key of ['scaleX', 'scaleY'] as const) {
                    if (actual.transform[key] !== expected.transform[key]) {
                      mismatches.push(
                        `${where}: transform.${key} ${actual.transform[key]} !== ${expected.transform[key]}`,
                      )
                    }
                  }
                }

                // Readable head rather than tens of thousands of lines.
                if (mismatches.length > 10) break
              }
            }
          }
        }
      }

      expect(compared).toBeGreaterThan(10_000)
      expect(mismatches).toEqual([])
    })
  }

  it('still emits no transform for a pure fade', () => {
    // Called out separately because it is the one case where "no output" is the
    // correct output, and an over-eager rewrite would quietly start emitting a
    // synthesized transform that changes how shape clips render.
    const sample = sampleTextAnimation({
      animation: { in: 'fade', out: 'fade', durationFrames: 5 },
      localFrame: 2,
      clipDurationFrames: 30,
      transform: undefined,
      defaultTransform: DEFAULT_TEXT_TRANSFORM,
    })
    expect(sample.transform).toBeUndefined()
  })
})
