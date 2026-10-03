import Link from 'next/link'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { CardHeader } from './CardHeader'
import { badgeColors } from './landingData'
import { Spotlight } from './motion/Spotlight'
import { kindLabel, type ShowcaseEntry, type ShowcaseKind } from '@/config/showcase'

const ctaLabel: Record<ShowcaseKind, string> = {
  app: 'Visit site',
  playground: 'Launch playground',
  example: 'View on GitHub',
  server: 'Read the docs',
}

const pill = {
  fontFamily: 'var(--font-geist-mono)',
  fontSize: 10.5,
  borderRadius: 99,
  padding: '2px 10px',
  border: '1px solid var(--line)',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
} as const

const ctaStyle = {
  marginTop: 4,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  color: 'var(--accent)',
  fontWeight: 600,
  fontSize: 13.5,
  transition: 'gap .18s',
} as const

/** One showcase card: shared by the /showcase grid and the landing teaser. */
export function ShowcaseCard({ entry, showTags = true }: { entry: ShowcaseEntry; showTags?: boolean }) {
  const color = badgeColors[entry.status]
  const cta = (
    <>
      {ctaLabel[entry.kind]}
      {entry.external ? <ArrowUpRight size={15} /> : <ArrowRight size={15} />}
    </>
  )
  return (
    <Spotlight
      lift={4}
      className="lv-pgcard"
      style={{
        height: '100%',
        border: '1px solid var(--line)',
        borderRadius: 12,
        background: 'var(--card)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color .18s, box-shadow .18s',
      }}
    >
      <CardHeader kind={entry.header} />
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ ...pill, color }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
            {entry.status}
          </span>
          <span style={{ ...pill, color: 'var(--muted)' }}>{kindLabel[entry.kind]}</span>
        </div>
        <h3 style={{ fontSize: 17, margin: 0, fontWeight: 600, letterSpacing: '-0.015em' }}>{entry.name}</h3>
        {entry.by && (
          <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 11, color: 'var(--faint)' }}>by {entry.by}</span>
        )}
        <p style={{ color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.62, margin: 0, flex: 1, textWrap: 'pretty' }}>
          {entry.description}
        </p>
        {showTags && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {entry.tags.map((t) => (
              <span
                key={t}
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: 10.5,
                  color: 'var(--accent)',
                  background: 'color-mix(in oklab, var(--accent) 9%, transparent)',
                  borderRadius: 5,
                  padding: '2px 8px',
                }}
              >
                {t}
              </span>
            ))}
          </div>
        )}
        {entry.external ? (
          <a href={entry.href} target="_blank" rel="noopener noreferrer" className="lv-launch" style={ctaStyle}>
            {cta}
          </a>
        ) : (
          <Link href={entry.href} className="lv-launch" style={ctaStyle}>
            {cta}
          </Link>
        )}
      </div>
    </Spotlight>
  )
}
