import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const KEY = 'myeditor-playback'

function makeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: vi.fn((k: string) => data.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => void data.set(k, v)),
    removeItem: vi.fn((k: string) => void data.delete(k)),
  }
}

async function loadStore() {
  vi.resetModules()
  return (await import('./playback.store')).playbackStore
}

describe('playbackStore persistence', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('with localStorage', () => {
    let storage: ReturnType<typeof makeStorage>

    beforeEach(() => {
      storage = makeStorage()
      vi.stubGlobal('localStorage', storage)
    })

    it('persists exactly the transport preferences', async () => {
      const store = await loadStore()
      const s = store.getState()
      s.setZoom(8)
      s.setVolume(0.4)
      s.toggleMute()
      s.setPlaybackRate(2)
      s.toggleLoop()
      s.toggleSnap()

      const saved = JSON.parse(storage.data.get(KEY)!)
      expect(saved.state).toEqual({
        zoom: 8,
        volume: 0.4,
        muted: true,
        playbackRate: 2,
        loop: true,
        snapEnabled: false,
      })
      expect(Object.keys(saved.state).sort()).toEqual(
        ['loop', 'muted', 'playbackRate', 'snapEnabled', 'volume', 'zoom'],
      )
    })

    it('never writes transient state, and does not write at all for frame/play churn', async () => {
      const store = await loadStore()
      const s = store.getState()

      s.setCurrentFrame(120)
      s.play()
      s.pause()
      s.togglePlayPause()
      expect(storage.setItem).not.toHaveBeenCalled()

      // A preference change afterwards still must not smuggle the transient keys in.
      s.setZoom(10)
      const saved = JSON.parse(storage.data.get(KEY)!)
      expect(saved.state).not.toHaveProperty('currentFrame')
      expect(saved.state).not.toHaveProperty('currentFrameEpoch')
      expect(saved.state).not.toHaveProperty('isPlaying')
      expect(storage.setItem).toHaveBeenCalledTimes(1)
    })

    it('restores saved preferences but starts transient state fresh', async () => {
      storage.data.set(
        KEY,
        JSON.stringify({
          state: { zoom: 12, muted: true, currentFrame: 999, isPlaying: true, volume: 'loud' },
          version: 0,
        }),
      )
      const store = await loadStore()
      const s = store.getState()
      expect(s.zoom).toBe(12)
      expect(s.muted).toBe(true)
      expect(s.volume).toBe(1) // wrong type is ignored
      expect(s.currentFrame).toBe(0)
      expect(s.isPlaying).toBe(false)
    })

    it('survives a corrupt stored document and a throwing setItem', async () => {
      storage.data.set(KEY, '{nope')
      const store = await loadStore()
      expect(store.getState().zoom).toBe(4)

      storage.setItem.mockImplementation(() => {
        throw new Error('quota')
      })
      expect(() => store.getState().setZoom(6)).not.toThrow()
      expect(store.getState().zoom).toBe(6)
    })
  })

  describe('without localStorage (Node)', () => {
    it('loads with defaults and every action works', async () => {
      vi.stubGlobal('localStorage', undefined)
      const store = await loadStore()
      const s = store.getState()
      expect(s.zoom).toBe(4)
      expect(() => {
        s.setZoom(9)
        s.toggleMute()
        s.setCurrentFrame(5)
      }).not.toThrow()
      expect(store.getState().zoom).toBe(9)
      expect(store.getState().muted).toBe(true)
    })
  })
})
