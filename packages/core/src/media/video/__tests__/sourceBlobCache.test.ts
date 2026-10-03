import { describe, it, expect, vi } from 'vitest'
import { createSourceBlobCache } from '../demuxer/sourceBlobCache'

const blobFor = (text: string): Blob => new Blob([text])

describe('sourceBlobCache', () => {
  it('downloads a source once and hands the same promise to every caller', async () => {
    const fetcher = vi.fn(async (src: string) => blobFor(src))
    const cache = createSourceBlobCache({ fetcher })

    const a = cache.resolve('a.mp4')
    const b = cache.resolve('a.mp4')

    expect(a).toBe(b)
    expect(fetcher).toHaveBeenCalledTimes(1)
    await expect(a).resolves.toBeInstanceOf(Blob)

    // Still a hit after it has settled.
    cache.resolve('a.mp4')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('evicts the least recently used source past maxEntries', async () => {
    const fetcher = vi.fn(async (src: string) => blobFor(src))
    const cache = createSourceBlobCache({ fetcher, maxEntries: 2 })

    await cache.resolve('a.mp4')
    await cache.resolve('b.mp4')
    // Touching 'a' makes 'b' the least recently used.
    await cache.resolve('a.mp4')
    await cache.resolve('c.mp4')

    expect(cache.size).toBe(2)
    expect(fetcher).toHaveBeenCalledTimes(3)

    await cache.resolve('a.mp4') // still held — no new download
    expect(fetcher).toHaveBeenCalledTimes(3)
    await cache.resolve('b.mp4') // evicted by 'c' — downloads again
    expect(fetcher).toHaveBeenCalledTimes(4)
  })

  it('defaults maxEntries to 4', async () => {
    const fetcher = vi.fn(async (src: string) => blobFor(src))
    const cache = createSourceBlobCache({ fetcher })

    await cache.resolve('1.mp4')
    await cache.resolve('2.mp4')
    await cache.resolve('3.mp4')
    await cache.resolve('4.mp4')
    expect(cache.size).toBe(4)

    await cache.resolve('5.mp4')
    expect(cache.size).toBe(4)

    // '1.mp4' should have been evicted
    await cache.resolve('1.mp4')
    expect(fetcher).toHaveBeenCalledTimes(6)
  })

  it('forgets a failed download so the next caller can retry', async () => {
    const fetcher = vi
      .fn<(src: string) => Promise<Blob>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(blobFor('ok'))
    const cache = createSourceBlobCache({ fetcher })

    await expect(cache.resolve('a.mp4')).rejects.toThrow('offline')
    expect(cache.size).toBe(0)

    await expect(cache.resolve('a.mp4')).resolves.toBeInstanceOf(Blob)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('warm starts the download without throwing on failure', async () => {
    const fetcher = vi
      .fn<(src: string) => Promise<Blob>>()
      .mockRejectedValue(new Error('offline'))
    const cache = createSourceBlobCache({ fetcher })

    expect(() => cache.warm('a.mp4')).not.toThrow()
    expect(fetcher).toHaveBeenCalledTimes(1)
    // Let the rejection settle; an unhandled rejection would fail the run.
    await new Promise((r) => setTimeout(r, 0))
  })

  it('evict and clear drop held sources', async () => {
    const fetcher = vi.fn(async (src: string) => blobFor(src))
    const cache = createSourceBlobCache({ fetcher })

    await cache.resolve('a.mp4')
    await cache.resolve('b.mp4')
    cache.evict('a.mp4')
    expect(cache.size).toBe(1)
    cache.clear()
    expect(cache.size).toBe(0)

    await cache.resolve('b.mp4')
    expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it('resolve works detached from the cache object', async () => {
    // createMediabunnyBackend does `opts.blobResolver ?? sourceBlobCache.resolve`,
    // so the method must not depend on `this`.
    const fetcher = vi.fn(async (src: string) => blobFor(src))
    const cache = createSourceBlobCache({ fetcher })
    const { resolve } = cache

    await expect(resolve('a.mp4')).resolves.toBeInstanceOf(Blob)
    expect(cache.size).toBe(1)
  })
})
