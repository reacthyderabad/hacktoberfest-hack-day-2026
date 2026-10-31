import type { Metadata } from 'next'
import { JsonLd } from '@/components/seo/JsonLd'
import { siteConfig } from '@/config/site'
import { showcase } from '@/config/showcase'
import { SiteNav } from '@/components/site/SiteNav'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { ShowcaseCard } from '@/components/landing/ShowcaseCard'
import { ArrowUpRight } from 'lucide-react'
import { PageHeader } from '@/components/site/PageHeader'
import { Stagger, StaggerItem } from '@/components/landing/motion/Stagger'
import { Spotlight } from '@/components/landing/motion/Spotlight'

export const metadata: Metadata = {
  title: 'Showcase',
  description: 'Projects and tools built with elah.',
  alternates: { canonical: '/showcase' },
  // Hidden from navigation, sitemap and the agents index; reachable by direct link only.
  robots: { index: false, follow: false },
}

// No `?template=` query: the repo's ISSUE_TEMPLATE folder has no showcase template.
const SUBMIT_URL = `${siteConfig.links.github}/issues/new`

const absolute = (href: string) => (href.startsWith('http') ? href : `${siteConfig.url}${href}`)

const itemListJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Built with elah',
  itemListElement: showcase.map((entry, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: entry.name,
    description: entry.description,
    url: absolute(entry.href),
  })),
}

export default function ShowcasePage() {
  return (
    <div className="landing-root" style={{ minHeight: '100vh' }}>
      <JsonLd data={itemListJsonLd} />
      <SiteNav variant="floating" />
      <main>
        <PageHeader
          eyebrow="Showcase"
          title="Built with elah."
          lede="A hosted product, reference editors, example apps, and a render server. Every card below opens something real."
        />

        <section style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(36px, 6vw, 56px) 24px clamp(60px, 9vw, 100px)' }}>
          <Stagger
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px,100%),1fr))',
              gap: 18,
            }}
          >
            {showcase.map((entry) => (
              <StaggerItem key={entry.slug} style={{ display: 'flex', flexDirection: 'column' }}>
                <ShowcaseCard entry={entry} />
              </StaggerItem>
            ))}
          </Stagger>

          <Spotlight
            style={{
              marginTop: 48,
              border: '1px solid var(--line)',
              borderRadius: 12,
              background: 'var(--card)',
              padding: 'clamp(22px, 4vw, 32px)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 11, letterSpacing: '.16em', color: 'var(--accent)' }}>
              BUILT SOMETHING?
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, margin: 0, fontWeight: 600, letterSpacing: '-0.015em' }}>
              Share your project
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.62, margin: 0, maxWidth: 560 }}>
              If you have built something with elah, open an issue on GitHub with a link and a line about what it does, and we will
              consider it for this page.
            </p>
            <a
              href={SUBMIT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="lv-launch"
              style={{
                marginTop: 4,
                alignSelf: 'flex-start',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: 'var(--accent)',
                fontWeight: 600,
                fontSize: 13.5,
                transition: 'gap .18s',
              }}
            >
              Open an issue on GitHub
              <ArrowUpRight size={15} aria-hidden />
            </a>
          </Spotlight>
        </section>
      </main>
      <LandingFooter />
    </div>
  )
}
