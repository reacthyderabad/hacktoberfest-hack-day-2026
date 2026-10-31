import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatCompact, getSiteStats, npmPointUrl, sumDownloads, toDisplay } from './stats'

const ok = (value: number): PromiseSettledResult<number> => ({ status: 'fulfilled', value })
const bad = (): PromiseSettledResult<number> => ({ status: 'rejected', reason: new Error('x') })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('sumDownloads', () => {
  it('returns null when every request failed', () => {
    expect(sumDownloads([bad(), bad()])).toBeNull()
  })
  it('returns the partial sum when some failed', () => {
    expect(sumDownloads([ok(100), bad(), ok(23)])).toBe(123)
  })
  it('returns null for an empty set', () => {
    expect(sumDownloads([])).toBeNull()
  })
  it('keeps a genuine zero', () => {
    expect(sumDownloads([ok(0)])).toBe(0)
  })
})

describe('formatCompact', () => {
  it('compacts thousands to one decimal', () => {
    expect(formatCompact(4059)).toBe('4.1K')
  })
  it('leaves small numbers alone', () => {
    expect(formatCompact(58)).toBe('58')
  })
  it('passes null through', () => {
    expect(formatCompact(null)).toBeNull()
  })
})

describe('toDisplay', () => {
  it('formats on the server and keeps nulls', () => {
    expect(toDisplay({ stars: 58, forks: null, downloads: 7542, downloadsSince: '2026-06-01' })).toEqual({
      stars: '58',
      forks: null,
      downloads: '7.5K',
      downloadsSince: '2026-06-01',
    })
  })
})

describe('npmPointUrl', () => {
  it('percent-encodes the scoped name and formats the range', () => {
    expect(npmPointUrl('@elah/core', '2026-06-01', '2026-10-02')).toBe(
      'https://api.npmjs.org/downloads/point/2026-06-01:2026-10-02/%40elah%2Fcore',
    )
  })
})

describe('getSiteStats', () => {
  it('returns all-null on a 403 without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('rate limited', { status: 403 })))
    const stats = await getSiteStats()
    expect(stats.stars).toBeNull()
    expect(stats.forks).toBeNull()
    expect(stats.downloads).toBeNull()
    expect(stats.downloadsSince).toBe('2026-06-01')
  })

  it('returns all-null when fetch rejects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed')
      }),
    )
    await expect(getSiteStats()).resolves.toMatchObject({ stars: null, forks: null, downloads: null })
  })

  it('reads stars and forks and sums downloads on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.includes('api.github.com')
          ? Response.json({ stargazers_count: 58, forks_count: 3 })
          : Response.json({ downloads: 1000 }),
      ),
    )
    const stats = await getSiteStats()
    expect(stats).toMatchObject({ stars: 58, forks: 3, downloads: 5000 })
  })
})
