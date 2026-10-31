import { describe, expect, it } from 'vitest'
import {
  MAX_DIMENSION,
  canResize,
  fitWithin,
  isImageFile,
  jpegName,
  needsJpegConversion,
} from './imageNormalize'

/** The canvas/wasm path needs a DOM; these cover the pure decisions around it. */

function file(name: string, type: string): File {
  return new File([new Uint8Array([0])], name, { type })
}

describe('isImageFile', () => {
  it('accepts anything the browser types as an image', () => {
    expect(isImageFile(file('a.png', 'image/png'))).toBe(true)
    expect(isImageFile(file('a.heic', 'image/heic'))).toBe(true)
  })

  it('accepts HEIC by extension when the browser reports no type', () => {
    // Android Chrome's behaviour — the case that dropped phone photos silently.
    expect(isImageFile(file('IMG_0042.HEIC', ''))).toBe(true)
    expect(isImageFile(file('IMG_0042.heif', ''))).toBe(true)
  })

  it('rejects non-images', () => {
    expect(isImageFile(file('notes.pdf', 'application/pdf'))).toBe(false)
    expect(isImageFile(file('clip.mp4', 'video/mp4'))).toBe(false)
    // An unknown type with no HEIF extension stays out.
    expect(isImageFile(file('archive.zip', ''))).toBe(false)
  })
})

describe('needsJpegConversion', () => {
  it('passes through formats every browser renders', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']) {
      expect(needsJpegConversion(file('a', type))).toBe(false)
    }
  })

  it('converts HEIC and unknown types', () => {
    expect(needsJpegConversion(file('a.heic', 'image/heic'))).toBe(true)
    expect(needsJpegConversion(file('a.heif', 'image/heif'))).toBe(true)
    expect(needsJpegConversion(file('a.heic', ''))).toBe(true)
  })
})

describe('canResize', () => {
  it('allows the two formats that cannot be animated', () => {
    expect(canResize(file('a.jpg', 'image/jpeg'))).toBe(true)
    expect(canResize(file('a.png', 'image/png'))).toBe(true)
  })

  it('refuses formats that may hold animation', () => {
    // Re-encoding any of these through a canvas would keep frame one and
    // silently drop the rest.
    for (const type of ['image/gif', 'image/webp', 'image/avif']) {
      expect(canResize(file('a', type))).toBe(false)
    }
  })

  it('refuses formats the browser cannot decode at all', () => {
    // HEIC goes down the conversion path instead, which always re-encodes.
    expect(canResize(file('a.heic', 'image/heic'))).toBe(false)
    expect(canResize(file('a.heic', ''))).toBe(false)
  })
})

describe('jpegName', () => {
  it('swaps the extension', () => {
    expect(jpegName('IMG_0042.HEIC')).toBe('IMG_0042.jpg')
    expect(jpegName('holiday.photo.heif')).toBe('holiday.photo.jpg')
  })

  it('appends when there is no extension', () => {
    expect(jpegName('photo')).toBe('photo.jpg')
  })

  it('keeps a leading-dot name whole rather than emptying it', () => {
    expect(jpegName('.heic')).toBe('.heic.jpg')
  })
})

describe('fitWithin', () => {
  it('leaves an image already inside the cap alone', () => {
    expect(fitWithin(800, 600, MAX_DIMENSION)).toEqual({ width: 800, height: 600 })
  })

  it('scales the longest edge down and keeps the ratio', () => {
    expect(fitWithin(4032, 3024, 2048)).toEqual({ width: 2048, height: 1536 })
    expect(fitWithin(3024, 4032, 2048)).toEqual({ width: 1536, height: 2048 })
  })

  it('never rounds a dimension to zero', () => {
    expect(fitWithin(10000, 1, 2048)).toEqual({ width: 2048, height: 1 })
  })
})
