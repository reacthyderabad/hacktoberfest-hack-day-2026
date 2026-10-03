import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import {
  saveMediaBlob,
  getMediaBlob,
  deleteMediaBlob,
  getAllStoredMediaIds,
} from './media-file-storage'

describe('media-file-storage', () => {
  describe('when indexedDB is unavailable (e.g. SSR / Node)', () => {
    it('returns null gracefully on getMediaBlob', async () => {
      const result = await getMediaBlob('test-id')
      expect(result).toBeNull()
    })

    it('handles saveMediaBlob without throwing', async () => {
      await expect(
        saveMediaBlob('test-id', new Blob(['test'], { type: 'text/plain' })),
      ).resolves.toBeUndefined()
    })

    it('handles deleteMediaBlob without throwing', async () => {
      await expect(deleteMediaBlob('test-id')).resolves.toBeUndefined()
    })

    it('returns empty array on getAllStoredMediaIds', async () => {
      const ids = await getAllStoredMediaIds()
      expect(ids).toEqual([])
    })
  })

  describe('with mock indexedDB', () => {
    const store = new Map<string, any>()

    beforeEach(() => {
      store.clear()

      const mockDb = {
        objectStoreNames: {
          contains: vi.fn().mockReturnValue(true),
        },
        createObjectStore: vi.fn(),
        transaction: vi.fn().mockReturnValue({
          objectStore: vi.fn().mockReturnValue({
            put: vi.fn((record) => {
              store.set(record.id, record)
              const req: any = {}
              setTimeout(() => {
                req.result = record.id
                req.onsuccess?.()
              }, 0)
              return req
            }),
            get: vi.fn((id) => {
              const req: any = {}
              setTimeout(() => {
                req.result = store.get(id)
                req.onsuccess?.()
              }, 0)
              return req
            }),
            delete: vi.fn((id) => {
              store.delete(id)
              const req: any = {}
              setTimeout(() => {
                req.result = undefined
                req.onsuccess?.()
              }, 0)
              return req
            }),
            getAllKeys: vi.fn(() => {
              const req: any = {}
              setTimeout(() => {
                req.result = Array.from(store.keys())
                req.onsuccess?.()
              }, 0)
              return req
            }),
          }),
        }),
        close: vi.fn(),
      }

      vi.stubGlobal('indexedDB', {
        open: vi.fn(() => {
          const req: any = {}
          setTimeout(() => {
            req.result = mockDb
            req.onsuccess?.()
          }, 0)
          return req
        }),
      })
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('saves and retrieves a blob', async () => {
      const blob = new Blob(['sample-video-bytes'], { type: 'video/mp4' })
      await saveMediaBlob('asset-123', blob, { name: 'sample.mp4' })

      const retrieved = await getMediaBlob('asset-123')
      expect(retrieved).toBe(blob)
    })

    it('deletes a stored blob', async () => {
      const blob = new Blob(['data'], { type: 'audio/mp3' })
      await saveMediaBlob('asset-456', blob)

      await deleteMediaBlob('asset-456')
      const retrieved = await getMediaBlob('asset-456')
      expect(retrieved).toBeNull()
    })

    it('lists all stored media IDs', async () => {
      const blob = new Blob(['data'])
      await saveMediaBlob('id-1', blob)
      await saveMediaBlob('id-2', blob)

      const ids = await getAllStoredMediaIds()
      expect(ids).toEqual(['id-1', 'id-2'])
    })
  })
})
