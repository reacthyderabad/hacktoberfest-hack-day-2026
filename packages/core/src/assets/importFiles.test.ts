import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mediaLibraryStore } from './store'
import {
  computeWaveform,
  importBlob,
  importFiles,
  importUrl,
  makeImageThumbnail,
  makeVideoThumbnail,
  makeVideoThumbnailStrip,
  probeAudio,
  probeImage,
  probeVideo,
  releaseMediaElement,
  resolveDuration,
} from './importFiles'

type MediaEventHandler = (() => void) | null

interface StubMediaElement {
  tagName: string
  preload: string
  muted: boolean
  src: string
  duration: number
  videoWidth: number
  videoHeight: number
  currentTime: number
  readyState: number
  pause: ReturnType<typeof vi.fn>
  removeAttribute: ReturnType<typeof vi.fn>
  load: ReturnType<typeof vi.fn>
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
  _handlers: Record<string, MediaEventHandler>
  _emit: (event: string) => void
}

interface StubImageElement {
  tagName: string
  src: string
  naturalWidth: number
  naturalHeight: number
  onload: (() => void) | null
  onerror: (() => void) | null
}

interface StubCanvasContext {
  drawImage: ReturnType<typeof vi.fn>
}

interface StubCanvasElement {
  tagName: string
  width: number
  height: number
  getContext: ReturnType<typeof vi.fn>
  toDataURL: ReturnType<typeof vi.fn>
  _ctx: StubCanvasContext
}

function createStubMediaElement(tag: 'video' | 'audio'): StubMediaElement {
  const handlers: Record<string, MediaEventHandler> = {}

  return {
    tagName: tag.toUpperCase(),
    preload: '',
    muted: false,
    src: '',
    duration: 12.5,
    videoWidth: 1920,
    videoHeight: 1080,
    currentTime: 0,
    readyState: 0,
    pause: vi.fn(),
    removeAttribute: vi.fn(),
    load: vi.fn(),
    addEventListener: vi.fn((event: string, handler: () => void) => {
      handlers[event] = handler
    }),
    removeEventListener: vi.fn((event: string) => {
      handlers[event] = null
    }),
    _handlers: handlers,
    _emit(event: string) {
      handlers[event]?.()
    },
  }
}

function createStubImage(): StubImageElement {
  return {
    tagName: 'IMG',
    src: '',
    naturalWidth: 800,
    naturalHeight: 600,
    onload: null,
    onerror: null,
  }
}

function createStubCanvas(): StubCanvasElement {
  const ctx: StubCanvasContext = {
    drawImage: vi.fn(),
  }

  return {
    tagName: 'CANVAS',
    width: 0,
    height: 0,
    getContext: vi.fn(() => ctx),
    toDataURL: vi.fn(() => 'data:image/jpeg;base64,thumb'),
    _ctx: ctx,
  }
}

function makeFile(
  name: string,
  type: string,
  size = 1024,
  lastModified = 1_700_000_000_000,
): File {
  return new File(['x'.repeat(size)], name, { type, lastModified })
}

describe('importFiles', () => {
  let createdMedia: StubMediaElement[]
  let createdImages: StubImageElement[]
  let createdCanvases: StubCanvasElement[]
  let objectUrlCounter: number

  beforeEach(() => {
    createdMedia = []
    createdImages = []
    createdCanvases = []
    objectUrlCounter = 0

    mediaLibraryStore.setState({ assets: {}, order: [] })

    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => {
        objectUrlCounter += 1
        return `blob:mock-${objectUrlCounter}`
      }),
    })

    vi.stubGlobal('document', {
      createElement: vi.fn((tag: string) => {
        if (tag === 'video' || tag === 'audio') {
          const el = createStubMediaElement(tag)
          createdMedia.push(el)
          return el
        }

        if (tag === 'img') {
          const img = createStubImage()
          createdImages.push(img)
          return img
        }

        if (tag === 'canvas') {
          const canvas = createStubCanvas()
          createdCanvases.push(canvas)
          return canvas
        }

        throw new Error(`Unexpected createElement tag: ${tag}`)
      }),
    })

    vi.stubGlobal('HTMLMediaElement', {
      HAVE_CURRENT_DATA: 2,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('registers video and image assets in the media library store', async () => {
    const importPromise = importFiles([
      makeFile('clip.mp4', 'video/mp4'),
      makeFile('photo.png', 'image/png'),
    ])

    await Promise.resolve()

    const videoEl = createdMedia.find((el) => el.tagName === 'VIDEO')
    expect(videoEl).toBeDefined()
    videoEl!._emit('loadedmetadata')

    await Promise.resolve()

    const imageEl = createdImages[0]
    expect(imageEl).toBeDefined()
    imageEl.onload?.()

    const result = await importPromise

    expect(result.imported).toHaveLength(2)
    expect(result.skipped).toEqual([])
    expect(result.imported[0]).toMatchObject({
      kind: 'video',
      name: 'clip.mp4',
      durationSec: 12.5,
      width: 1920,
      height: 1080,
      src: 'blob:mock-1',
      lastModified: 1_700_000_000_000,
    })
    expect(result.imported[1]).toMatchObject({
      kind: 'image',
      name: 'photo.png',
      durationSec: 0,
      width: 800,
      height: 600,
      src: 'blob:mock-2',
      lastModified: 1_700_000_000_000,
    })

    const store = mediaLibraryStore.getState()
    expect(Object.keys(store.assets)).toHaveLength(2)
    expect(store.order).toEqual([result.imported[0].id, result.imported[1].id])
  })

  it('skips unsupported mime types with a warning', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await importFiles([makeFile('notes.txt', 'text/plain')])

    expect(result.imported).toEqual([])
    expect(result.skipped).toEqual([
      expect.objectContaining({
        reason: 'unsupported',
        file: expect.objectContaining({ name: 'notes.txt' }),
      }),
    ])
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Skipping unsupported file type'),
    )
  })

  it('imports audio assets without thumbnails', async () => {
    const importPromise = importFiles([makeFile('voice.mp3', 'audio/mpeg')])

    await Promise.resolve()

    const audioEl = createdMedia.find((el) => el.tagName === 'AUDIO')
    audioEl!._emit('loadedmetadata')

    const result = await importPromise

    expect(result.imported).toHaveLength(1)
    expect(result.imported[0]).toMatchObject({
      kind: 'audio',
      name: 'voice.mp3',
      durationSec: 12.5,
    })
    expect(result.imported[0].thumbnailUrl).toBeUndefined()
  })

  it('updates thumbnailStrip + thumbnailUrl asynchronously for video imports', async () => {
    const importPromise = importFiles([makeFile('clip.mp4', 'video/mp4')])

    await Promise.resolve()
    createdMedia[0]._emit('loadedmetadata') // resolve the metadata probe

    const result = await importPromise
    expect(result.imported[0].thumbnailUrl).toBeUndefined()

    // The strip generator created a second video element; drive its seeks.
    expect(createdMedia.length).toBeGreaterThanOrEqual(2)
    const stripVideo = createdMedia[1]
    stripVideo._emit('loadedmetadata')
    // THUMBNAIL_STRIP_COUNT (4) sequential seeks.
    for (let i = 0; i < 4; i++) {
      await Promise.resolve()
      await Promise.resolve()
      stripVideo._emit('seeked')
    }

    await vi.waitFor(() => {
      const updated = mediaLibraryStore.getState().getAsset(result.imported[0].id)
      expect(updated?.thumbnailStrip).toHaveLength(4)
      expect(updated?.thumbnailUrl).toBe('data:image/jpeg;base64,thumb')
    })
  })

  it('imports multiple files in parallel', async () => {
    const importPromise = importFiles([
      makeFile('a.mp4', 'video/mp4'),
      makeFile('b.mp3', 'audio/mpeg'),
      makeFile('c.png', 'image/png'),
    ])

    await Promise.resolve()

    for (const el of createdMedia) {
      el._emit('loadedmetadata')
    }
    for (const img of createdImages) {
      img.onload?.()
    }

    const result = await importPromise

    expect(result.imported).toHaveLength(3)
    expect(result.skipped).toEqual([])
    expect(result.imported.map((asset) => asset.kind)).toEqual(['video', 'audio', 'image'])
  })

  it('skips duplicate files within the same import batch', async () => {
    const file = makeFile('clip.mp4', 'video/mp4')
    const importPromise = importFiles([file, file])

    await Promise.resolve()
    createdMedia[0]._emit('loadedmetadata')

    const result = await importPromise

    expect(result.imported).toHaveLength(1)
    expect(result.skipped).toHaveLength(1)
    expect(result.skipped[0]).toMatchObject({
      reason: 'duplicate',
      file,
    })
    expect(result.skipped[0].existingAssetId).toBeUndefined()
    expect(Object.keys(mediaLibraryStore.getState().assets)).toHaveLength(1)
  })

  it('skips files that match an asset already in the store', async () => {
    const file = makeFile('clip.mp4', 'video/mp4', 1024, 1_700_000_000_001)
    const importPromise = importFiles([file])

    await Promise.resolve()
    createdMedia[0]._emit('loadedmetadata')

    const first = await importPromise
    expect(first.imported).toHaveLength(1)

    const duplicatePromise = importFiles([makeFile('clip.mp4', 'video/mp4', 1024, 1_700_000_000_001)])

    const duplicate = await duplicatePromise

    expect(duplicate.imported).toEqual([])
    expect(duplicate.skipped).toHaveLength(1)
    expect(duplicate.skipped[0]).toMatchObject({
      reason: 'duplicate',
      existingAssetId: first.imported[0].id,
    })
    expect(Object.keys(mediaLibraryStore.getState().assets)).toHaveLength(1)
  })
})

describe('importUrl', () => {
  let createdMedia: StubMediaElement[]
  let objectUrlCounter: number

  beforeEach(() => {
    createdMedia = []
    objectUrlCounter = 0
    mediaLibraryStore.setState({ assets: {}, order: [] })

    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => {
        objectUrlCounter += 1
        return `blob:mock-${objectUrlCounter}`
      }),
    })
    vi.stubGlobal('document', {
      createElement: vi.fn((tag: string) => {
        if (tag === 'video' || tag === 'audio') {
          const el = createStubMediaElement(tag)
          createdMedia.push(el)
          return el
        }
        if (tag === 'canvas') return createStubCanvas()
        throw new Error(`Unexpected createElement tag: ${tag}`)
      }),
    })
    vi.stubGlobal('HTMLMediaElement', { HAVE_CURRENT_DATA: 2 })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('infers video kind from the URL extension and uses the URL as src', async () => {
    const url = 'https://cdn.example.com/path/to/clip.mp4'
    const importPromise = importUrl(url)

    await Promise.resolve()
    createdMedia[0]._emit('loadedmetadata')

    const asset = await importPromise

    expect(asset).toMatchObject({
      kind: 'video',
      name: 'clip.mp4',
      src: url, // NOT an object URL
      durationSec: 12.5,
      width: 1920,
      height: 1080,
      byteSize: 0,
    })
    expect(mediaLibraryStore.getState().getAsset(asset.id)).toBeDefined()
  })

  it('returns the existing asset when the same URL is imported twice', async () => {
    const url = 'https://cdn.example.com/path/to/clip.mp4'

    const firstPromise = importUrl(url)
    await Promise.resolve()
    createdMedia[0]._emit('loadedmetadata')
    const first = await firstPromise

    // Second import dedupes on src and returns the existing asset.
    const second = await importUrl(url)

    expect(second).toBe(first)
    expect(Object.keys(mediaLibraryStore.getState().assets)).toHaveLength(1)
  })

  it('honors an explicit kind override and name', async () => {
    const url = 'https://cdn.example.com/asset-with-no-extension'
    const importPromise = importUrl(url, { kind: 'video', name: 'My Clip' })

    await Promise.resolve()
    createdMedia[0]._emit('loadedmetadata')

    const asset = await importPromise
    expect(asset).toMatchObject({ kind: 'video', name: 'My Clip', src: url })
  })

  it('falls back to a HEAD content-type probe when the extension is unknown', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      headers: { get: () => 'video/mp4' },
    })))

    const url = 'https://cdn.example.com/asset-with-no-extension'
    const importPromise = importUrl(url)

    await Promise.resolve()
    await Promise.resolve()
    createdMedia[0]._emit('loadedmetadata')

    const asset = await importPromise
    expect(asset.kind).toBe('video')
  })

  it('rejects when the media kind cannot be determined', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      headers: { get: () => 'text/html' },
    })))

    await expect(importUrl('https://cdn.example.com/page')).rejects.toThrow(
      /Could not determine media kind/,
    )
    expect(Object.keys(mediaLibraryStore.getState().assets)).toHaveLength(0)
  })
})

describe('importBlob', () => {
  let createdMedia: StubMediaElement[]
  let objectUrlCounter: number

  beforeEach(() => {
    createdMedia = []
    objectUrlCounter = 0
    mediaLibraryStore.setState({ assets: {}, order: [] })

    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => {
        objectUrlCounter += 1
        return `blob:mock-${objectUrlCounter}`
      }),
    })
    vi.stubGlobal('document', {
      createElement: vi.fn((tag: string) => {
        if (tag === 'video' || tag === 'audio') {
          const el = createStubMediaElement(tag)
          createdMedia.push(el)
          return el
        }
        if (tag === 'canvas') return createStubCanvas()
        throw new Error(`Unexpected createElement tag: ${tag}`)
      }),
    })
    vi.stubGlobal('HTMLMediaElement', { HAVE_CURRENT_DATA: 2 })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('infers kind from the blob MIME type and registers via an object URL', async () => {
    const blob = new Blob(['x'.repeat(2048)], { type: 'video/mp4' })
    const importPromise = importBlob(blob)

    await Promise.resolve()
    createdMedia[0]._emit('loadedmetadata')

    const asset = await importPromise
    expect(asset).toMatchObject({
      kind: 'video',
      src: 'blob:mock-1',
      byteSize: blob.size,
    })
    expect(asset.name).toContain('mp4')
  })

  it('honors an explicit name', async () => {
    const blob = new Blob(['x'], { type: 'audio/mpeg' })
    const importPromise = importBlob(blob, { name: 'voiceover.mp3' })

    await Promise.resolve()
    createdMedia[0]._emit('loadedmetadata')

    const asset = await importPromise
    expect(asset).toMatchObject({ kind: 'audio', name: 'voiceover.mp3' })
  })

  it('rejects unsupported blob types', async () => {
    const blob = new Blob(['x'], { type: 'text/plain' })
    await expect(importBlob(blob)).rejects.toThrow(/Unsupported blob type/)
    expect(Object.keys(mediaLibraryStore.getState().assets)).toHaveLength(0)
  })
})

describe('media probe helpers', () => {
  beforeEach(() => {
    mediaLibraryStore.setState({ assets: {}, order: [] })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('probeVideo resolves metadata from loadedmetadata', async () => {
    const el = createStubMediaElement('video')

    vi.stubGlobal('document', {
      createElement: vi.fn(() => el),
    })

    const probePromise = probeVideo('blob:test-video')
    el._emit('loadedmetadata')

    await expect(probePromise).resolves.toEqual({
      durationSec: 12.5,
      width: 1920,
      height: 1080,
      hasAudio: false,
    })
  })

  it('probeVideo reports hasAudio when an audio track is present', async () => {
    const el = createStubMediaElement('video')
    ;(el as unknown as { audioTracks: { length: number } }).audioTracks = {
      length: 1,
    }

    vi.stubGlobal('document', {
      createElement: vi.fn(() => el),
    })

    const probePromise = probeVideo('blob:test-video')
    el._emit('loadedmetadata')

    await expect(probePromise).resolves.toMatchObject({ hasAudio: true })
  })

  it('sets crossOrigin=anonymous for http(s) sources so canvases stay untainted', async () => {
    const el = createStubMediaElement('video')

    vi.stubGlobal('document', {
      createElement: vi.fn(() => el),
    })

    const probePromise = probeVideo('https://cdn.example.com/path/clip.mp4')
    el._emit('loadedmetadata')
    await probePromise

    expect((el as unknown as { crossOrigin?: string }).crossOrigin).toBe('anonymous')
  })

  it('leaves crossOrigin unset for blob/object URLs', async () => {
    const el = createStubMediaElement('video')

    vi.stubGlobal('document', {
      createElement: vi.fn(() => el),
    })

    const probePromise = probeVideo('blob:local-video')
    el._emit('loadedmetadata')
    await probePromise

    expect((el as unknown as { crossOrigin?: string }).crossOrigin).toBeUndefined()
  })

  it('probeAudio resolves duration from loadedmetadata', async () => {
    const el = createStubMediaElement('audio')

    vi.stubGlobal('document', {
      createElement: vi.fn(() => el),
    })

    const probePromise = probeAudio('blob:test-audio')
    el._emit('loadedmetadata')

    await expect(probePromise).resolves.toEqual({
      durationSec: 12.5,
    })
  })

  describe('resolveDuration', () => {
    it('resolves immediately when duration is finite', async () => {
      const el = createStubMediaElement('audio')
      el.duration = 18.4

      const duration = await resolveDuration(el as unknown as HTMLMediaElement)
      expect(duration).toBe(18.4)
    })

    it('seeks to 1e101 and waits for durationchange when duration is Infinity (Chromium fallback)', async () => {
      const el = createStubMediaElement('audio')
      el.duration = Infinity

      const promise = resolveDuration(el as unknown as HTMLMediaElement)

      // Workaround should seek past end to trigger Chromium container calculation
      expect(el.currentTime).toBe(1e101)
      expect(el.addEventListener).toHaveBeenCalledWith('durationchange', expect.any(Function))

      // Simulate Chromium firing durationchange after computing stream duration
      el.duration = 45.2
      el._emit('durationchange')

      const resolved = await promise
      expect(resolved).toBe(45.2)
      expect(el.currentTime).toBe(0) // Resets back to 0
    })

    it('falls back to 0 if duration remains Infinity after timeout', async () => {
      vi.useFakeTimers()
      try {
        const el = createStubMediaElement('audio')
        el.duration = Infinity

        const promise = resolveDuration(el as unknown as HTMLMediaElement)
        expect(el.currentTime).toBe(1e101)

        // Advance past the 2s timeout
        vi.advanceTimersByTime(2000)

        const resolved = await promise
        expect(resolved).toBe(0)
      } finally {
        vi.useRealTimers()
      }
    })

    it('falls back to 0 if duration is NaN', async () => {
      vi.useFakeTimers()
      try {
        const el = createStubMediaElement('audio')
        el.duration = NaN

        const promise = resolveDuration(el as unknown as HTMLMediaElement)

        vi.advanceTimersByTime(2000)

        const resolved = await promise
        expect(resolved).toBe(0)
      } finally {
        vi.useRealTimers()
      }
    })

    it('probeAudio resolves finite duration when el.duration is Infinity', async () => {
      const el = createStubMediaElement('audio')
      el.duration = Infinity

      vi.stubGlobal('document', {
        createElement: vi.fn(() => el),
      })

      const probePromise = probeAudio('blob:test-streamed-audio')
      el._emit('loadedmetadata')
      await Promise.resolve()

      expect(el.currentTime).toBe(1e101)
      el.duration = 60.5
      el._emit('durationchange')

      await expect(probePromise).resolves.toEqual({
        durationSec: 60.5,
      })
    })

    it('probeVideo resolves finite duration when el.duration is Infinity', async () => {
      const el = createStubMediaElement('video')
      el.duration = Infinity

      vi.stubGlobal('document', {
        createElement: vi.fn(() => el),
      })

      const probePromise = probeVideo('blob:test-webm-stream')
      el._emit('loadedmetadata')
      await Promise.resolve()

      expect(el.currentTime).toBe(1e101)
      el.duration = 120.0
      el._emit('durationchange')

      await expect(probePromise).resolves.toEqual({
        durationSec: 120.0,
        width: 1920,
        height: 1080,
        hasAudio: false,
      })
    })
  })

  describe('releaseMediaElement', () => {
    it('pauses, removes src, and reloads the element to release hardware decoder', () => {
      const el = createStubMediaElement('video')
      el.src = 'blob:video-url'

      releaseMediaElement(el as unknown as HTMLMediaElement)

      expect(el.pause).toHaveBeenCalledTimes(1)
      expect(el.removeAttribute).toHaveBeenCalledWith('src')
      expect(el.load).toHaveBeenCalledTimes(1)
    })

    it('does not throw when pause() or load() throws (best-effort teardown)', () => {
      const el = createStubMediaElement('video')
      el.pause.mockImplementation(() => {
        throw new Error('Pause failed')
      })
      el.load.mockImplementation(() => {
        throw new Error('Load failed')
      })

      expect(() => releaseMediaElement(el as unknown as HTMLMediaElement)).not.toThrow()
    })

    it('releases media element after probeVideo completes', async () => {
      const el = createStubMediaElement('video')
      vi.stubGlobal('document', { createElement: vi.fn(() => el) })

      const probePromise = probeVideo('blob:video-to-probe')
      el._emit('loadedmetadata')
      await probePromise

      expect(el.pause).toHaveBeenCalledTimes(1)
      expect(el.removeAttribute).toHaveBeenCalledWith('src')
      expect(el.load).toHaveBeenCalledTimes(1)
    })

    it('releases media element after probeAudio completes', async () => {
      const el = createStubMediaElement('audio')
      vi.stubGlobal('document', { createElement: vi.fn(() => el) })

      const probePromise = probeAudio('blob:audio-to-probe')
      el._emit('loadedmetadata')
      await probePromise

      expect(el.pause).toHaveBeenCalledTimes(1)
      expect(el.removeAttribute).toHaveBeenCalledWith('src')
      expect(el.load).toHaveBeenCalledTimes(1)
    })

    it('releases media element when loadMediaElement fails with error event', async () => {
      const el = createStubMediaElement('video')
      vi.stubGlobal('document', { createElement: vi.fn(() => el) })

      const probePromise = probeVideo('blob:broken-video')
      el._emit('error')

      await expect(probePromise).rejects.toThrow('Failed to load video metadata')
      expect(el.pause).toHaveBeenCalledTimes(1)
      expect(el.removeAttribute).toHaveBeenCalledWith('src')
      expect(el.load).toHaveBeenCalledTimes(1)
    })

    it('releases media element after multiple video imports sequentially', async () => {
      const elements: StubMediaElement[] = []
      vi.stubGlobal('document', {
        createElement: vi.fn(() => {
          const el = createStubMediaElement('video')
          elements.push(el)
          return el
        }),
      })

      for (let i = 0; i < 5; i++) {
        const probePromise = probeVideo(`blob:video-${i}`)
        elements[i]._emit('loadedmetadata')
        await probePromise

        expect(elements[i].pause).toHaveBeenCalledTimes(1)
        expect(elements[i].removeAttribute).toHaveBeenCalledWith('src')
        expect(elements[i].load).toHaveBeenCalledTimes(1)
      }

      expect(elements).toHaveLength(5)
    })
  })

  it('probeImage resolves dimensions from onload', async () => {
    const img = createStubImage()

    vi.stubGlobal('document', {
      createElement: vi.fn(() => img),
    })

    const probePromise = probeImage('blob:test-image')
    img.onload?.()

    await expect(probePromise).resolves.toEqual({
      durationSec: 0,
      width: 800,
      height: 600,
    })
  })
})

describe('thumbnail helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('makeVideoThumbnail draws a scaled frame after seeked', async () => {
    const el = createStubMediaElement('video')

    vi.stubGlobal('document', {
      createElement: vi.fn((tag: string) => {
        if (tag === 'video') return el
        return createStubCanvas()
      }),
    })

    vi.stubGlobal('HTMLMediaElement', {
      HAVE_CURRENT_DATA: 2,
    })

    const thumbPromise = makeVideoThumbnail('blob:test-video', 240)
    el._emit('loadedmetadata')
    await Promise.resolve()
    el._emit('seeked')

    await expect(thumbPromise).resolves.toBe('data:image/jpeg;base64,thumb')
    expect(el.pause).toHaveBeenCalledTimes(1)
    expect(el.removeAttribute).toHaveBeenCalledWith('src')
    expect(el.load).toHaveBeenCalledTimes(1)
  })

  it('makeVideoThumbnail releases media element even if seek fails', async () => {
    const el = createStubMediaElement('video')

    vi.stubGlobal('document', {
      createElement: vi.fn((tag: string) => {
        if (tag === 'video') return el
        return createStubCanvas()
      }),
    })

    vi.stubGlobal('HTMLMediaElement', {
      HAVE_CURRENT_DATA: 2,
    })

    const thumbPromise = makeVideoThumbnail('blob:test-video', 240)
    el._emit('loadedmetadata')
    await Promise.resolve()
    el._emit('error')

    await expect(thumbPromise).rejects.toThrow('Failed to seek video for thumbnail')
    expect(el.pause).toHaveBeenCalledTimes(1)
    expect(el.removeAttribute).toHaveBeenCalledWith('src')
    expect(el.load).toHaveBeenCalledTimes(1)
  })

  it('makeImageThumbnail draws a scaled image on load', async () => {
    const img = createStubImage()

    vi.stubGlobal('document', {
      createElement: vi.fn((tag: string) => {
        if (tag === 'img') return img
        return createStubCanvas()
      }),
    })

    const thumbPromise = makeImageThumbnail('blob:test-image', 240)
    img.onload?.()

    await expect(thumbPromise).resolves.toBe('data:image/jpeg;base64,thumb')
  })

  it('makeVideoThumbnailStrip decodes one frame per requested sample and releases element', async () => {
    const el = createStubMediaElement('video')

    vi.stubGlobal('document', {
      createElement: vi.fn((tag: string) => {
        if (tag === 'video') return el
        return createStubCanvas()
      }),
    })
    vi.stubGlobal('HTMLMediaElement', { HAVE_CURRENT_DATA: 2 })

    const stripPromise = makeVideoThumbnailStrip('blob:test-video', 3, 160)
    el._emit('loadedmetadata')
    for (let i = 0; i < 3; i++) {
      await Promise.resolve()
      await Promise.resolve()
      el._emit('seeked')
    }

    await expect(stripPromise).resolves.toEqual([
      'data:image/jpeg;base64,thumb',
      'data:image/jpeg;base64,thumb',
      'data:image/jpeg;base64,thumb',
    ])
    expect(el.pause).toHaveBeenCalledTimes(1)
    expect(el.removeAttribute).toHaveBeenCalledWith('src')
    expect(el.load).toHaveBeenCalledTimes(1)
  })

  it('makeVideoThumbnailStrip releases media element even if seek fails', async () => {
    const el = createStubMediaElement('video')

    vi.stubGlobal('document', {
      createElement: vi.fn((tag: string) => {
        if (tag === 'video') return el
        return createStubCanvas()
      }),
    })
    vi.stubGlobal('HTMLMediaElement', { HAVE_CURRENT_DATA: 2 })

    const stripPromise = makeVideoThumbnailStrip('blob:test-video', 3, 160)
    el._emit('loadedmetadata')
    await Promise.resolve()
    el._emit('error')

    await expect(stripPromise).rejects.toThrow('Failed to seek video for thumbnail strip')
    expect(el.pause).toHaveBeenCalledTimes(1)
    expect(el.removeAttribute).toHaveBeenCalledWith('src')
    expect(el.load).toHaveBeenCalledTimes(1)
  })
})

describe('computeWaveform', () => {
  const decodeAudioData = vi.fn()

  beforeEach(() => {
    decodeAudioData.mockReset()
    vi.stubGlobal('window', { AudioContext: vi.fn(() => ({ decodeAudioData })) })
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    })))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('downsamples and normalizes peaks to 0..1', async () => {
    const channel = new Float32Array(1024).fill(0.1)
    channel[500] = -2 // loudest sample; abs max = 2
    decodeAudioData.mockResolvedValue({
      length: channel.length,
      getChannelData: () => channel,
    })

    const peaks = await computeWaveform('blob:audio')

    expect(peaks).not.toBeNull()
    expect(peaks!.length).toBe(256)
    // Loudest bucket normalizes to 1; quiet buckets to 0.1/2 = 0.05.
    expect(Math.max(...peaks!)).toBeCloseTo(1)
    expect(Math.min(...peaks!)).toBeCloseTo(0.05)
  })

  it('returns null when the source has no audio samples', async () => {
    decodeAudioData.mockResolvedValue({
      length: 0,
      getChannelData: () => new Float32Array(),
    })

    await expect(computeWaveform('blob:silent')).resolves.toBeNull()
  })
})
