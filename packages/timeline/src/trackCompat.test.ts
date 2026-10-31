import { describe, expect, it } from 'vitest'
import { isClipAllowedOnTrack } from './trackCompat'

/** Which clip types may live on which kind of track. */
describe('isClipAllowedOnTrack', () => {
  it('keeps each clip type on its own kind of lane', () => {
    expect(isClipAllowedOnTrack('video', 'video')).toBe(true)
    expect(isClipAllowedOnTrack('text', 'video')).toBe(false)
    expect(isClipAllowedOnTrack('audio', 'audio')).toBe(true)
    expect(isClipAllowedOnTrack('text', 'elements')).toBe(true)
    expect(isClipAllowedOnTrack('image', 'video')).toBe(true)
  })
})
