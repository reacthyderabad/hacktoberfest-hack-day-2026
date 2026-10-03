/**
 * computeExportDimensions covers the export resolution presets
 * (360p/480p/720p/1080p) across all three stage aspect ratios the app
 * exposes (16:9, 9:16, 1:1) — the PR checklist this backs:
 *
 *   - 9:16 stage @ 1080p  → 1080x1920 (not 608x1080, the pre-fix regression)
 *   - 16:9 stage @ 1080p  → 1920x1080 (must not regress)
 *   - 1:1 stage @ 1080p   → 1080x1080
 *   - 9:16 stage @ 480p/720p → proportional scaling holds
 */
import { describe, it, expect } from 'vitest'
import { computeExportDimensions } from '../outputDimensions'

describe('computeExportDimensions', () => {
  it('9:16 portrait stage at 1080p short-edge → 1080x1920, not the pre-fix 608x1080', () => {
    expect(computeExportDimensions(1080, 1920, 1080)).toEqual({ width: 1080, height: 1920 })
  })

  it('16:9 landscape stage at 1080p short-edge → 1920x1080 (no regression)', () => {
    expect(computeExportDimensions(1920, 1080, 1080)).toEqual({ width: 1920, height: 1080 })
  })

  it('1:1 square stage at 1080p short-edge → 1080x1080', () => {
    expect(computeExportDimensions(1080, 1080, 1080)).toEqual({ width: 1080, height: 1080 })
  })

  it('9:16 portrait stage at 480p short-edge → 480x854 (proportional, even dims)', () => {
    expect(computeExportDimensions(1080, 1920, 480)).toEqual({ width: 480, height: 854 })
  })

  it('9:16 portrait stage at 720p short-edge → 720x1280', () => {
    expect(computeExportDimensions(1080, 1920, 720)).toEqual({ width: 720, height: 1280 })
  })

  it('defaults to the stage native resolution when outputHeight is omitted', () => {
    expect(computeExportDimensions(1080, 1920, undefined)).toEqual({ width: 1080, height: 1920 })
    expect(computeExportDimensions(1920, 1080, undefined)).toEqual({ width: 1920, height: 1080 })
  })
})
