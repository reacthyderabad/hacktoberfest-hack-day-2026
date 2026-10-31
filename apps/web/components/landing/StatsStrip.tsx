import Link from 'next/link'
import { currentVersion, releases } from '@/config/changelog'
import type { SiteStatsDisplay } from '@/lib/stats'
import { GITHUB_URL } from './landingData'

/**
 * Four live-ish facts under the hero. Server component: the numbers arrive
 * pre-formatted from `toDisplay`, and there are no click handlers here (the
 * hero's stat links carry the analytics event).
 *
 * Geometry follows the spec strip this replaced: one bordered row of equal
 * cells, label over value. That strip stated four fixed architecture facts,
 * which the features grid below already covers; these four are live instead.
 */

function sinceLabel(iso: string): string {
  const [y, m] = iso.split('-').map(Number)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `since ${months[(m || 1) - 1]} ${y}`
}

const labelStyle = {
  fontFamily: 'var(--font-geist-mono)',
  fontSize: 10,
  letterSpacing: '.14em',
  color: 'var(--faint)',
} as const

const valueStyle = { fontSize: 14.5, fontWeight: 600, marginTop: 6, color: 'var(--text)' } as const

export function StatsStrip({ stats }: { stats: SiteStatsDisplay }) {
  const cells: { label: string; value: string; href: string; external?: boolean }[] = [
    { label: 'STARS', value: stats.stars ?? '—', href: GITHUB_URL, external: true },
    {
      label: `NPM DOWNLOADS · ${sinceLabel(stats.downloadsSince).toUpperCase()}`,
      value: stats.downloads ?? '—',
      href: 'https://www.npmjs.com/package/@elah/editor',
      external: true,
    },
    { label: 'LICENSE', value: '5 packages · Apache-2.0', href: '#libraries' },
    { label: `RELEASED ${releases[0].date}`, value: `v${currentVersion}`, href: '/changelog' },
  ]

  return (
    <section style={{ borderTop: '1px solid var(--line2)', borderBottom: '1px solid var(--line2)' }}>
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 28px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(215px,1fr))',
        }}
      >
        {cells.map((c, i) => {
          const style = {
            display: 'block',
            padding: i === 0 ? '22px 24px 22px 0' : i === cells.length - 1 ? '22px 0 22px 24px' : '22px 24px',
            borderRight: i === cells.length - 1 ? undefined : '1px solid var(--line2)',
          } as const
          const body = (
            <>
              <div style={labelStyle}>{c.label}</div>
              <div style={valueStyle}>{c.value}</div>
            </>
          )
          return c.external ? (
            <a key={c.label} href={c.href} target="_blank" rel="noopener noreferrer" className="lv-ghost" style={style}>
              {body}
            </a>
          ) : (
            <Link key={c.label} href={c.href} className="lv-ghost" style={style}>
              {body}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
