import type { Metadata } from 'next'
import { JsonLd } from '@/components/seo/JsonLd'
import { siteConfig } from '@/config/site'
import { currentVersion } from '@/config/changelog'
import { LandingNav } from '@/components/landing/LandingNav'
import { LandingHero } from '@/components/landing/LandingHero'
import { WhatsNew, Architecture, DataFlow, Integration, Faq, Cta } from '@/components/landing/LandingSections'
import { StatsStrip } from '@/components/landing/StatsStrip'
import { getSiteStats, toDisplay } from '@/lib/stats'
import { LandingLibraries } from '@/components/landing/LandingLibraries'
import { AgentsBand } from '@/components/landing/AgentsBand'
import { LandingPlaygrounds } from '@/components/landing/LandingPlaygrounds'
import { LandingFooter } from '@/components/landing/LandingFooter'

export const metadata: Metadata = {
  title: { absolute: 'elah — browser-native, frame-accurate video editing engine' },
  alternates: { canonical: '/' },
}

export const revalidate = 3600

const softwareJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'elah',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Any (web browser)',
  description: siteConfig.description,
  url: siteConfig.url,
  softwareVersion: currentVersion,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
}

export default async function HomePage() {
  const stats = toDisplay(await getSiteStats())
  return (
    <div className="landing-root" style={{ minHeight: '100vh' }}>
      <JsonLd data={softwareJsonLd} />
      <LandingNav />
      <main>
        <LandingHero stats={stats} />
        <StatsStrip stats={stats} />
        <WhatsNew />
        <LandingLibraries />
        <Architecture />
        <DataFlow />
        <LandingPlaygrounds />
        <Integration />
        <AgentsBand />
        <Faq />
        <Cta />
      </main>
      <LandingFooter />
    </div>
  )
}
