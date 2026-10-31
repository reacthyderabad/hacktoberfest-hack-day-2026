import { describe, it, expect } from 'vitest'
import { formatRulerLabel } from './Ruler'

/**
 * The ruler used to format its own labels, hardcoding the minutes segment as
 * "00" and never rolling seconds over, so a 90-second project showed "00:90"
 * while every other timecode in the UI showed "00:01:30:00". These cases pin
 * the agreement with `framesToTimecode`.
 */
describe('formatRulerLabel', () => {
  const fps = 30

  it('rolls seconds into minutes', () => {
    expect(formatRulerLabel(90 * fps, fps, false)).toBe('01:30')
  })

  it('starts at zero', () => {
    expect(formatRulerLabel(0, fps, false)).toBe('00:00')
  })

  it('keeps the frames segment for sub-second ticks', () => {
    expect(formatRulerLabel(90 * fps + 7, fps, true)).toBe('01:30:07')
  })

  it('shows hours once they are non-zero, so the hour mark is not 00:00', () => {
    expect(formatRulerLabel(3600 * fps, fps, false)).toBe('01:00:00')
  })

  it('omits hours below one hour so short projects stay compact', () => {
    expect(formatRulerLabel(59 * 60 * fps, fps, false)).toBe('59:00')
  })
})
