import Link from 'next/link'
import { agentPoints } from './landingData'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { Reveal } from './motion/Reveal'
import { Stagger, StaggerItem } from './motion/Stagger'
import { Spotlight } from './motion/Spotlight'

const linkStyle = {
  marginTop: 4,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  color: 'var(--accent)',
  fontWeight: 600,
  fontSize: 13.5,
  transition: 'gap .18s',
} as const

/**
 * "For agents" band. WebMCP is planned, not shipped: the pill says "coming
 * soon" and carries no date. Do not reword it to imply work in progress.
 */
export function AgentsBand() {
  return (
    <section id="agents" style={{ borderTop: '1px solid var(--line2)', background: 'var(--bg2)', scrollMarginTop: 60 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(60px, 9vw, 100px) 24px' }}>
        <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 11, letterSpacing: '.16em', color: 'var(--accent)' }}>
          FOR AGENTS
        </div>
        <Reveal
          as="h2"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(25px, 4.6vw, 40px)',
            letterSpacing: '-0.02em',
            fontWeight: 600,
            margin: '14px 0 8px',
            maxWidth: 720,
            textWrap: 'balance',
          }}
        >
          Built to be driven by agents.
        </Reveal>
        <p style={{ color: 'var(--muted)', fontSize: 16, maxWidth: 620, margin: '0 0 36px', lineHeight: 1.6, textWrap: 'pretty' }}>
          Integer-frame time, one mutation funnel, and a pure resolver make the engine easy for a model to reason about. Here is what
          you can use today.
        </p>
        <Stagger
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px,100%),1fr))',
            gap: 18,
          }}
        >
          {agentPoints.map((pt) => {
            const icon = (pt.external ? <ArrowUpRight size={15} /> : <ArrowRight size={15} />)
            return (
              <StaggerItem key={pt.title} style={{ display: 'flex' }}>
                <Spotlight
                  lift={4}
                  className="lv-pgcard"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    border: '1px solid var(--line)',
                    borderRadius: 12,
                    background: 'var(--card)',
                    padding: 22,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    transition: 'border-color .18s, box-shadow .18s',
                  }}
                >
                  <h3 style={{ fontSize: 16, margin: 0, fontWeight: 600, letterSpacing: '-0.015em' }}>{pt.title}</h3>
                  <p style={{ color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.62, margin: 0, flex: 1, textWrap: 'pretty' }}>
                    {pt.body}
                  </p>
                  {pt.external ? (
                    <a href={pt.href} target="_blank" rel="noopener noreferrer" className="lv-launch" style={linkStyle}>
                      Open the guide
                      {icon}
                    </a>
                  ) : (
                    <Link href={pt.href} className="lv-launch" style={linkStyle}>
                      Open
                      {icon}
                    </Link>
                  )}
                </Spotlight>
              </StaggerItem>
            )
          })}
        </Stagger>
        <Reveal style={{ marginTop: 28 }}>
          <Link
            href="/docs/agents#webmcp"
            className="lv-pill"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'var(--font-geist-mono)',
              fontSize: 12,
              color: 'var(--muted)',
              border: '1px solid var(--line)',
              background: 'var(--card)',
              borderRadius: 99,
              padding: '6px 14px',
            }}
          >
            <span style={{ color: 'var(--accent)' }}>WebMCP</span> — coming soon on ChatGPT and Claude Code
            <ArrowRight size={14}  />
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
