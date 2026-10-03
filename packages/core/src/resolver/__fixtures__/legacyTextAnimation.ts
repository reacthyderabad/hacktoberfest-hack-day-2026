/**
 * FROZEN reference implementation of `sampleTextAnimation` as it shipped before
 * the layered `MotionSpec` model existed.
 *
 * This is a verbatim copy of the enum-only sampler (commit a3cd90d), kept solely
 * so `legacyAnimationParity.test.ts` can prove the current sampler still
 * reproduces it bit for bit. `TextAnimation.in` / `.out` are written into saved
 * projects, so any drift here silently restyles work people have already done.
 *
 * DO NOT "fix", tidy, or refactor this file, and do not import it from
 * production code. Its only correct state is "identical to what shipped" — even
 * the float-ordering matters, because `extreme * (1 - t)` and
 * `lerp(extreme, 0, t)` are not the same IEEE754 value, which is a real
 * regression this reference caught.
 *
 * A frozen reference rather than a recorded fixture: the equivalent JSON dump of
 * ~30k samples was 1.4 MB of unreadable numbers, whereas this states the old
 * behaviour in a form a reviewer can actually check.
 */

import type { TextAnimation, TextAnimationKind, Transform } from '../../types'
import { SLIDE_TRAVEL_NORMALIZED, SPIN_TRAVEL_RADIANS, resolveRampFrames } from '../textAnimation'

interface LegacySample {
  opacity: number
  transform?: Transform
}

interface LegacyArgs {
  animation: TextAnimation | undefined
  localFrame: number
  clipDurationFrames: number
  transform: Transform | undefined
  defaultTransform: Transform
}

interface KindEffect {
  dx: number
  dy: number
  dRotation: number
  fades: boolean
}

const NO_EFFECT: KindEffect = { dx: 0, dy: 0, dRotation: 0, fades: false }

function effectForKind(kind: TextAnimationKind): KindEffect {
  switch (kind) {
    case 'fade':
      return { dx: 0, dy: 0, dRotation: 0, fades: true }
    case 'spin':
      return { dx: 0, dy: 0, dRotation: SPIN_TRAVEL_RADIANS, fades: false }
    case 'slide-up':
      return { dx: 0, dy: -SLIDE_TRAVEL_NORMALIZED, dRotation: 0, fades: false }
    case 'slide-down':
      return { dx: 0, dy: SLIDE_TRAVEL_NORMALIZED, dRotation: 0, fades: false }
    case 'slide-left':
      return { dx: -SLIDE_TRAVEL_NORMALIZED, dy: 0, dRotation: 0, fades: false }
    case 'slide-right':
      return { dx: SLIDE_TRAVEL_NORMALIZED, dy: 0, dRotation: 0, fades: false }
    default:
      return NO_EFFECT
  }
}

function movesOrRotates(effect: KindEffect): boolean {
  return effect.dx !== 0 || effect.dy !== 0 || effect.dRotation !== 0
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback
}

function easeOut(t: number): number {
  return t * (2 - t)
}

function easeIn(t: number): number {
  return t * t
}

/** The pre-rewrite sampler, unchanged. */
export function legacySampleTextAnimation(args: LegacyArgs): LegacySample {
  const { animation } = args

  if (!animation || (!animation.in && !animation.out)) {
    return { opacity: 1 }
  }

  const ramp = resolveRampFrames(animation.durationFrames)
  const localFrame = finiteOr(args.localFrame, 0)
  const total = Math.max(0, finiteOr(args.clipDurationFrames, 0))

  const inEffect = animation.in ? effectForKind(animation.in) : null
  const outEffect = animation.out ? effectForKind(animation.out) : null

  const arrived = clamp01(localFrame / ramp)
  const remaining = clamp01((total - localFrame) / ramp)

  let opacity = 1
  if (inEffect?.fades) opacity = Math.min(opacity, arrived)
  if (outEffect?.fades) opacity = Math.min(opacity, remaining)

  let dx = 0
  let dy = 0
  let dRotation = 0
  let geometric = false

  if (inEffect && movesOrRotates(inEffect)) {
    geometric = true
    const toGo = 1 - easeOut(arrived)
    dx -= inEffect.dx * toGo
    dy -= inEffect.dy * toGo
    dRotation -= inEffect.dRotation * toGo
  }

  if (outEffect && movesOrRotates(outEffect)) {
    geometric = true
    const gone = easeIn(1 - remaining)
    dx += outEffect.dx * gone
    dy += outEffect.dy * gone
    dRotation += outEffect.dRotation * gone
  }

  if (!geometric) {
    return { opacity }
  }

  const rest = args.transform ?? args.defaultTransform

  return {
    opacity,
    transform: {
      ...rest,
      anchor: { ...rest.anchor },
      x: finiteOr(rest.x, 0.5) + dx,
      y: finiteOr(rest.y, 0.5) + dy,
      rotation: finiteOr(rest.rotation, 0) + dRotation,
    },
  }
}
