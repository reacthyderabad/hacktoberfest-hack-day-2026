/**
 * Live site stats (GitHub stars/forks, total npm downloads) for the landing page.
 *
 * Server-only: imported by `app/page.tsx`, never by a client component.
 *
 * - One npm request per package. npm's bulk downloads endpoint rejects scoped
 *   names (`@elah/core`), so we hit the point endpoint once per package with
 *   the name percent-encoded and sum the results.
 * - Formatting happens here, on the server (`toDisplay`). Client components
 *   must not format numbers: Intl output can differ between server and browser
 *   locale (a hydration mismatch), and doing it here ships zero extra JS.
 * - Optional `GITHUB_TOKEN` env var. The unauthenticated GitHub API allows 60
 *   requests/hour per IP, and shared Vercel build IPs can get a 403. That is
 *   fine: every failure resolves to nulls and the UI renders its fallback copy.
 * - The npm point API caps a date range at 18 months, so `DOWNLOADS_SINCE`
 *   must become a rolling window before December 2027.
 *
 * `getSiteStats` never throws, so a production build with no network succeeds.
 */

export const NPM_PACKAGES = ['@elah/core', '@elah/react', '@elah/timeline', '@elah/editor', '@elah/cli'] as const

/** First public release. */
export const DOWNLOADS_SINCE = '2026-06-01'

const GITHUB_API = 'https://api.github.com/repos/elahlabs/elah'
const REVALIDATE_SECONDS = 3600
const TIMEOUT_MS = 5000

export interface SiteStats {
  stars: number | null
  forks: number | null
  downloads: number | null
  downloadsSince: string
}

export interface SiteStatsDisplay {
  stars: string | null
  forks: string | null
  downloads: string | null
  downloadsSince: string
}

export function npmPointUrl(pkg: string, since: string, until: string): string {
  return `https://api.npmjs.org/downloads/point/${since}:${until}/${encodeURIComponent(pkg)}`
}

/** Null only when every request failed; a partial set returns the partial sum. */
export function sumDownloads(results: PromiseSettledResult<number>[]): number | null {
  let total = 0
  let any = false
  for (const r of results) {
    if (r.status === 'fulfilled' && Number.isFinite(r.value)) {
      total += r.value
      any = true
    }
  }
  return any ? total : null
}

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })

export function formatCompact(n: number | null): string | null {
  return n === null ? null : compact.format(n)
}

export function toDisplay(stats: SiteStats): SiteStatsDisplay {
  return {
    stars: formatCompact(stats.stars),
    forks: formatCompact(stats.forks),
    downloads: formatCompact(stats.downloads),
    downloadsSince: stats.downloadsSince,
  }
}

async function fetchRepo(): Promise<{ stars: number | null; forks: number | null }> {
  try {
    const res = await fetch(GITHUB_API, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'elah.dev',
        ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
      },
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) return { stars: null, forks: null }
    const json = (await res.json()) as { stargazers_count?: unknown; forks_count?: unknown }
    return {
      stars: typeof json.stargazers_count === 'number' ? json.stargazers_count : null,
      forks: typeof json.forks_count === 'number' ? json.forks_count : null,
    }
  } catch {
    return { stars: null, forks: null }
  }
}

async function fetchPackageDownloads(pkg: string, since: string, until: string): Promise<number> {
  const res = await fetch(npmPointUrl(pkg, since, until), {
    next: { revalidate: REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`npm ${res.status}`)
  const json = (await res.json()) as { downloads?: unknown }
  if (typeof json.downloads !== 'number') throw new Error('npm: no downloads field')
  return json.downloads
}

export async function getSiteStats(): Promise<SiteStats> {
  try {
    const until = new Date().toISOString().slice(0, 10)
    const [repo, downloads] = await Promise.all([
      fetchRepo(),
      Promise.allSettled(NPM_PACKAGES.map((p) => fetchPackageDownloads(p, DOWNLOADS_SINCE, until))).then(sumDownloads),
    ])
    return { ...repo, downloads, downloadsSince: DOWNLOADS_SINCE }
  } catch {
    return { stars: null, forks: null, downloads: null, downloadsSince: DOWNLOADS_SINCE }
  }
}
