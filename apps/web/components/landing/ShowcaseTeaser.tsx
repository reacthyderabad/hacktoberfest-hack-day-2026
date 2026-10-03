import Link from 'next/link'
import { showcase } from '@/config/showcase'
import { ShowcaseCard } from './ShowcaseCard'
import { Reveal } from './motion/Reveal'
import { Stagger, StaggerItem } from './motion/Stagger'

/** Landing teaser: the entries flagged `featured` in config/showcase.ts. */
export function ShowcaseTeaser() {
  const featured = showcase.filter((e) => e.featured).slice(0, 3)
  return (
    <section id="showcase" style={{ borderTop: '1px solid var(--line2)', scrollMarginTop: 60 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(60px, 9vw, 100px) 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 11, letterSpacing: '.16em', color: 'var(--accent)' }}>
              SHOWCASE
            </div>
            <Reveal
              as="h2"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(25px, 4.6vw, 40px)',
                letterSpacing: '-0.02em',
                fontWeight: 600,
                margin: '14px 0 8px',
              }}
            >
              Built on elah.
            </Reveal>
            <p style={{ color: 'var(--muted)', fontSize: 16, maxWidth: 540, margin: 0, lineHeight: 1.6 }}>
              A hosted product, the reference editor, and a render server. Every one is something you can open today.
            </p>
          </div>
          <Link
            href="/showcase"
            className="lv-ghost"
            style={{ color: 'var(--accent)', fontFamily: 'var(--font-geist-mono)', fontSize: 13, fontWeight: 600 }}
          >
            See all →
          </Link>
        </div>
        <Stagger
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px,100%),1fr))',
            gap: 18,
            marginTop: 40,
          }}
        >
          {featured.map((entry) => (
            <StaggerItem key={entry.slug} style={{ display: 'flex', flexDirection: 'column' }}>
              <ShowcaseCard entry={entry} showTags={false} />
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
