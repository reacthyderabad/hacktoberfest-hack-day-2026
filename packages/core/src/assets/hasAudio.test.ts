import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  __resetHasAudioDeterminations,
  determineAssetHasAudio,
  hasAudioDetermined,
  probeHasAudio,
} from './hasAudio'
import { mediaLibraryStore } from './store'
import type { MediaAsset } from './types'

const mbSpies = vi.hoisted(() => ({
  UrlSource: vi.fn(),
  BlobSource: vi.fn(),
}))

vi.mock('mediabunny', () => ({
  ALL_FORMATS: [],
  UrlSource: class {
    constructor(src: string) {
      mbSpies.UrlSource(src)
    }
  },
  BlobSource: class {
    constructor(blob: Blob) {
      mbSpies.BlobSource(blob)
    }
  },
  Input: class {
    getPrimaryAudioTrack() {
      return Promise.resolve({})
    }
    dispose() {}
  },
}))

function addAsset(overrides: Partial<MediaAsset> & Pick<MediaAsset, 'id' | 'kind'>): MediaAsset {
  const asset: MediaAsset = {
    name: `${overrides.id}.mp4`,
    src: `https://cdn.example.com/${overrides.id}.mp4`,
    durationSec: 5,
    byteSize: 0,
    lastModified: 0,
    addedAt: 0,
    ...overrides,
  }
  mediaLibraryStore.getState().addAsset(asset)
  return asset
}

const stored = (id: string) => mediaLibraryStore.getState().getAsset(id)

describe('determineAssetHasAudio', () => {
  beforeEach(() => {
    mediaLibraryStore.setState({ assets: {}, order: [] })
    __resetHasAudioDeterminations()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('writes the container probe result onto the asset, overriding the import-time seed', async () => {
    // `hasAudio: false` is what the element probe reports for every video in
    // Chromium — the container read is what actually decides.
    addAsset({ id: 'v1', kind: 'video', hasAudio: false })
    const probe = vi.fn(async () => true)

    await expect(determineAssetHasAudio('v1', probe)).resolves.toBe(true)

    expect(probe).toHaveBeenCalledWith('https://cdn.example.com/v1.mp4')
    expect(stored('v1')?.hasAudio).toBe(true)
    expect(hasAudioDetermined('v1')).toBe(true)
  })

  it('records a silent video as hasAudio: false', async () => {
    addAsset({ id: 'v2', kind: 'video', hasAudio: true })

    await expect(determineAssetHasAudio('v2', async () => false)).resolves.toBe(false)

    expect(stored('v2')?.hasAudio).toBe(false)
  })

  it('runs the probe once per asset and shares the result with later callers', async () => {
    addAsset({ id: 'v3', kind: 'video' })
    const probe = vi.fn(async () => true)

    const [first, second] = await Promise.all([
      determineAssetHasAudio('v3', probe),
      determineAssetHasAudio('v3', probe),
    ])
    const third = await determineAssetHasAudio('v3', probe)

    expect(probe).toHaveBeenCalledTimes(1)
    expect([first, second, third]).toEqual([true, true, true])
  })

  it('keeps the current hasAudio when the container cannot be read', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    addAsset({ id: 'v4', kind: 'video', hasAudio: true })

    const probe = vi.fn(async () => {
      throw new Error('CORS')
    })
    await expect(determineAssetHasAudio('v4', probe)).resolves.toBe(true)

    expect(stored('v4')?.hasAudio).toBe(true)
    // An unreadable container is not an answer — weaker signals stay free to write.
    expect(hasAudioDetermined('v4')).toBe(false)
  })

  it('resolves false without probing for non-video assets and unknown ids', async () => {
    addAsset({ id: 'a1', kind: 'audio' })
    const probe = vi.fn(async () => true)

    await expect(determineAssetHasAudio('a1', probe)).resolves.toBe(false)
    await expect(determineAssetHasAudio('missing', probe)).resolves.toBe(false)

    expect(probe).not.toHaveBeenCalled()
  })
})

describe('probeHasAudio', () => {
  beforeEach(() => {
    mbSpies.UrlSource.mockClear()
    mbSpies.BlobSource.mockClear()
  })

  it('range-reads an absolute http(s) source without materialising it', async () => {
    const resolveBlob = vi.fn(async () => new Blob(['never']))

    await expect(probeHasAudio('https://cdn.example.com/v.mp4', resolveBlob)).resolves.toBe(true)

    expect(mbSpies.UrlSource).toHaveBeenCalledWith('https://cdn.example.com/v.mp4')
    expect(resolveBlob).not.toHaveBeenCalled()
  })

  it.each([
    ['blob:', 'blob:http://localhost/abc'],
    // The gallery proxy path — same-origin and relative, and it answers
    // `Accept-Ranges: none`, so it cannot be range-read.
    ['the gallery proxy path', '/api/gallery/asset?url=x'],
  ])('resolves %s through the shared blob cache', async (_label, src) => {
    const blob = new Blob(['bytes'])
    const resolveBlob = vi.fn(async () => blob)

    await expect(probeHasAudio(src, resolveBlob)).resolves.toBe(true)

    expect(resolveBlob).toHaveBeenCalledWith(src)
    expect(mbSpies.BlobSource).toHaveBeenCalledWith(blob)
    expect(mbSpies.UrlSource).not.toHaveBeenCalled()
  })
})
