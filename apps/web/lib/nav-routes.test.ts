import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { footerColumns, navLinks, CONTACT_URL, GET_STARTED_URL, EDITOR_URL } from '@/config/nav'

const appDir = fileURLToPath(new URL('../app', import.meta.url))

/** Every URL pattern that has an `app/**\/page.tsx` or `route.ts`, derived from the filesystem. */
function collectRoutes(dir = appDir, segments: string[] = []): RegExp[] {
  const routes: RegExp[] = []
  const entries = readdirSync(dir, { withFileTypes: true })
  if (entries.some((e) => e.isFile() && /^(page|route)\.(tsx?|jsx?)$/.test(e.name))) {
    const path = '/' + segments.join('/')
    routes.push(new RegExp('^' + path.replace(/[.*+?^${}()|\]/g, '\$&').replace(/\\[[^/]+?\\]/g, '[^/]+') + '$'))
  }
  for (const e of entries) {
    if (!e.isDirectory() || e.name.startsWith('_') || e.name.startsWith('@')) continue
    const isGroup = /^\(.+\)$/.test(e.name)
    routes.push(...collectRoutes(join(dir, e.name), isGroup ? segments : [...segments, e.name]))
  }
  return routes
}

const routes = collectRoutes()
const isRoute = (path: string) => routes.some((re) => re.test(path))

const allLinks = [...navLinks, ...footerColumns.flatMap((c) => c.links)]
const internal = allLinks.filter((l) => l.href.startsWith('/'))

describe('config/nav hrefs', () => {
  it('finds the app directory and a sane number of routes', () => {
    expect(existsSync(appDir)).toBe(true)
    expect(isRoute('/')).toBe(true)
    expect(isRoute('/docs/getting-started')).toBe(true)
    expect(isRoute('/definitely-not-a-page')).toBe(false)
  })

  it('every internal link resolves to a real route (anchors checked on the path part)', () => {
    const dead = internal.filter((l) => !isRoute(l.href.split('#')[0].split('?')[0]))
    expect(dead.map((l) => `${l.label} -> ${l.href}`)).toEqual([])
  })

  it('exported shortcut URLs resolve too', () => {
    expect(isRoute(GET_STARTED_URL)).toBe(true)
    expect(isRoute(EDITOR_URL)).toBe(true)
  })

  it('external links are absolute https or mailto, never bare paths', () => {
    const external = allLinks.filter((l) => !l.href.startsWith('/'))
    for (const l of external) expect(l.href, l.label).toMatch(/^(https:\/\/|mailto:)/)
    expect(CONTACT_URL).toMatch(/^mailto:/)
  })

  it('has no duplicate hrefs inside one list', () => {
    const dupes = (links: typeof allLinks) =>
      links.map((l) => l.href).filter((h, i, a) => a.indexOf(h) !== i)
    expect(dupes(navLinks)).toEqual([])
    for (const col of footerColumns) expect(dupes(col.links), col.heading).toEqual([])
  })
})
