import type { CSSProperties } from 'react'
import Link from 'next/link'
import { currentVersion, releases } from '@/config/changelog'
import { features, flow, integrationPoints, faq, whatsNew, GITHUB_URL, GET_STARTED_URL } from './landingData'
import { ArrowRight } from 'lucide-react'
import { Reveal } from './motion/Reveal'
import { Stagger, StaggerItem, StaggerGrow } from './motion/Stagger'
import { Spotlight } from './motion/Spotlight'
import { Accordion } from './motion/Accordion'
import { MagneticLink } from './motion/Magnetic'
import { CopyButton } from './CopyButton'

const eyebrow: CSSProperties = {
  fontFamily: 'var(--font-geist-mono)',
  fontSize: 11,
  letterSpacing: '.16em',
  color: 'var(--accent)',
}

const heading: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 'clamp(25px, 4.6vw, 40px)',
  letterSpacing: '-0.02em',
  fontWeight: 600,
}

const sectionPad = 'clamp(60px, 9vw, 100px) 24px'

export function WhatsNew() {
  const latest = releases[0]
  return (
    <section style={{ borderBottom: '1px solid var(--line2)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: sectionPad }}>
        <div style={eyebrow}>
          v{currentVersion} — {latest.date}
        </div>
        <Reveal as="h2" style={{ ...heading, margin: '14px 0 8px' }}>
          What&apos;s new in {currentVersion}.
        </Reveal>
        <p style={{ color: 'var(--muted)', fontSize: 16, maxWidth: 680, margin: '0 0 40px', lineHeight: 1.6, textWrap: 'pretty' }}>
          {latest.summary}
        </p>
        <Stagger
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px,100%),1fr))',
            gap: 18,
          }}
        >
          {whatsNew.map((item) => (
            <StaggerItem key={item.href} style={{ display: 'flex' }}>
              <Spotlight
                lift={4}
                className="lv-pgcard"
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: '1px solid var(--line)',
                  borderRadius: 12,
                  background: 'var(--card)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'border-color .18s, box-shadow .18s',
                }}
              >
                <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  <h3 style={{ fontSize: 16, margin: 0, fontWeight: 600, letterSpacing: '-0.015em', textWrap: 'balance' }}>{item.title}</h3>
                  <p style={{ color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.62, margin: 0, flex: 1, textWrap: 'pretty' }}>
                    {item.body}
                  </p>
                  <Link
                    href={item.href}
                    className="lv-launch"
                    style={{
                      marginTop: 4,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      color: 'var(--accent)',
                      fontWeight: 600,
                      fontSize: 13.5,
                      transition: 'gap .18s',
                    }}
                  >
                    Read the docs
                    <ArrowRight size={15}  />
                  </Link>
                </div>
              </Spotlight>
            </StaggerItem>
          ))}
        </Stagger>
        <div style={{ display: 'flex', gap: '10px 24px', flexWrap: 'wrap', marginTop: 32, fontFamily: 'var(--font-geist-mono)', fontSize: 12.5 }}>
          <Link href="/changelog" className="lv-ghost" style={{ color: 'var(--accent)' }}>
            Full changelog →
          </Link>
          <Link href="/blog/elah-0-6-0" className="lv-ghost" style={{ color: 'var(--accent)' }}>
            Read the release post →
          </Link>
        </div>
      </div>
    </section>
  )
}

export function Architecture() {
  return (
    <section style={{ background: 'var(--bg)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: sectionPad }}>
        <div style={eyebrow}>01 — ARCHITECTURE</div>
        <Reveal as="h2" style={{ ...heading, margin: '14px 0 8px' }}>
          Built for precision.
        </Reveal>
        <p style={{ color: 'var(--muted)', fontSize: 16, maxWidth: 540, margin: '0 0 44px', lineHeight: 1.6 }}>
          Every layer of the stack is designed around one principle: determinism. Same input, same output,
          every time.
        </p>
        <Stagger
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px,1fr))',
            gap: 1,
            background: 'var(--line2)',
            border: '1px solid var(--line2)',
          }}
        >
          {features.map((f) => (
            <StaggerItem key={f.idx} className="lv-feature" style={{ background: 'var(--bg)', display: 'flex' }}>
              <Spotlight
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: 26,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 11,
                }}
              >
                <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 10.5, color: 'var(--faint)' }}>{f.idx}</span>
                <h3 style={{ fontSize: 16, margin: 0, fontWeight: 600, letterSpacing: '-0.015em' }}>{f.title}</h3>
                <p style={{ color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.62, margin: 0, flex: 1, textWrap: 'pretty' }}>
                  {f.body}
                </p>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {f.tags.map((t) => (
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
              </Spotlight>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}

export function DataFlow() {
  return (
    <section style={{ borderTop: '1px solid var(--line2)', background: 'var(--bg2)' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: sectionPad, textAlign: 'center' }}>
        <div style={eyebrow}>02 — DATA FLOW</div>
        <Reveal as="h2" style={{ ...heading, margin: '14px 0 44px', textWrap: 'balance' }}>
          One mutation funnel.
          <br />
          One pure resolver.
        </Reveal>
        <Stagger gate stagger={0.14} style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          {flow.map((layer, i) => (
            <div key={layer.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {i > 0 && (
                <StaggerGrow
                  style={{
                    position: 'relative',
                    width: 1,
                    height: 24,
                    background: 'linear-gradient(180deg, var(--line), var(--accent))',
                    display: 'block',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      top: -4,
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      boxShadow: '0 0 8px var(--accent)',
                      animation: 'lv-flowDot 2.6s ease-in-out infinite',
                    }}
                  />
                </StaggerGrow>
              )}
              <StaggerItem
                style={{
                  width: '100%',
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                  background: 'var(--card)',
                  padding: '14px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px 16px',
                  textAlign: 'left',
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-geist-mono)',
                    fontSize: 10,
                    letterSpacing: '.12em',
                    color: 'var(--accent)',
                    width: 118,
                    flexShrink: 0,
                  }}
                >
                  {layer.name}
                </span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {layer.items.map((it) => (
                    <span
                      key={it}
                      style={{
                        fontFamily: 'var(--font-geist-mono)',
                        fontSize: 11.5,
                        color: 'var(--text)',
                        border: '1px solid var(--line)',
                        borderRadius: 6,
                        padding: '4px 10px',
                        background: 'var(--bg)',
                      }}
                    >
                      {it}
                    </span>
                  ))}
                </div>
              </StaggerItem>
            </div>
          ))}
        </Stagger>
      </div>
    </section>
  )
}

// The integration snippet as data: one array per line, each token either plain
// text or [colourKey, text]. Rendered line by line (reveal) and flattened to a
// string for the copy button, so the two cannot drift apart.
const syntax = {
  kw: '#7fb2ff',
  str: '#8ce0b0',
  fn: '#e8c57c',
  tag: '#6fe0d2',
  num: '#e8a0c0',
} as const
type Token = string | readonly [keyof typeof syntax, string]
const kw = (t: string): Token => ['kw', t]
const str = (t: string): Token => ['str', t]
const fn = (t: string): Token => ['fn', t]
const tag = (t: string): Token => ['tag', t]
const num = (t: string): Token => ['num', t]

const snippet: Token[][] = [
  [kw('import'), ' {'],
  ['  EditorProvider,'],
  ['  AssetPanel,'],
  ['  Preview,'],
  ['  Timeline,'],
  ['  createDefaultDemuxerFactory,'],
  ['} ', kw('from'), ' ', str("'@elah/editor'")],
  [''],
  [kw('const'), ' demuxerFactory = ', fn('createDefaultDemuxerFactory'), '()'],
  [''],
  [kw('export default function'), ' ', fn('App'), '() {'],
  ['  ', kw('return'), ' ('],
  ['    <', tag('EditorProvider'), ' fps={', num('30'), '}>'],
  ['      <', tag('div'), ' style={{ display: ', str("'flex'"), ', height: ', str("'100vh'"), ','],
  ['                    flexDirection: ', str("'column'"), ' }}>'],
  ['        <', tag('div'), ' style={{ display: ', str("'flex'"), ', flex: ', num('1'), ' }}>'],
  ['          <', tag('AssetPanel'), ' style={{ width: ', num('240'), ' }} />'],
  ['          <', tag('Preview')],
  ['            demuxerFactory={demuxerFactory}'],
  ['            style={{ flex: ', num('1'), ' }}'],
  ['          />'],
  ['        </', tag('div'), '>'],
  ['        <', tag('Timeline'), ' fps={', num('30'), '} style={{ height: ', num('240'), ' }} />'],
  ['      </', tag('div'), '>'],
  ['    </', tag('EditorProvider'), '>'],
  ['  )'],
  ['}'],
]

const snippetText = snippet.map((line) => line.map((t) => (typeof t === 'string' ? t : t[1])).join('')).join('\n')

export function Integration() {
  return (
    <section style={{ borderTop: '1px solid var(--line2)', background: 'var(--bg2)' }}>
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: sectionPad,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px,100%),1fr))',
          gap: 48,
          alignItems: 'center',
        }}
      >
        <div>
          <div style={eyebrow}>04 — INTEGRATION</div>
          <Reveal as="h2" style={{ ...heading, margin: '14px 0 12px' }}>
            Drop in. Wire. Ship.
          </Reveal>
          <p style={{ color: 'var(--muted)', fontSize: 15.5, lineHeight: 1.65, margin: '0 0 26px', textWrap: 'pretty' }}>
            The full editor composes in fewer than 20 lines. Bring your own demuxer factory and the preview
            handles decode, render, playback, and audio automatically.
          </p>
          <Reveal style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {integrationPoints.map((pt) => (
              <div key={pt.code} style={{ display: 'flex', gap: 12, alignItems: 'baseline', fontSize: 14, color: 'var(--muted)' }}>
                <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-geist-mono)', fontSize: 12 }}>→</span>
                <span>
                  <span style={{ color: 'var(--text)', fontWeight: 600, fontFamily: 'var(--font-geist-mono)', fontSize: 13 }}>
                    {pt.code}
                  </span>{' '}
                  {pt.rest}
                </span>
              </div>
            ))}
          </Reveal>
        </div>

        <Reveal
          style={{
            border: '1px solid #232938',
            borderRadius: 12,
            background: '#0a0d14',
            boxShadow: '0 30px 80px rgba(0,0,0,.4)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 12px 8px 18px',
              borderBottom: '1px solid #1a1f2b',
              fontFamily: 'var(--font-geist-mono)',
              fontSize: 11.5,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#c9d8f5' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00c2ff' }} />
              App.tsx
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color: '#7a858b' }}>@elah/editor</span>
              <CopyButton text={snippetText} />
            </span>
          </div>
          <Stagger stagger={0.035}>
            <pre style={{ margin: 0, padding: '20px 22px', fontFamily: 'var(--font-geist-mono)', fontSize: 12, lineHeight: 1.75, color: '#c9d8f5', overflowX: 'auto' }}>
              {snippet.map((line, li) => (
                <StaggerItem key={li} as="span" style={{ display: 'block', minHeight: '1.75em' }}>
                  {line.length === 1 && line[0] === '' ? ' ' : null}
                  {line.map((t, ti) =>
                    typeof t === 'string' ? (
                      t
                    ) : (
                      <span key={ti} style={{ color: syntax[t[0]] }}>
                        {t[1]}
                      </span>
                    ),
                  )}
                </StaggerItem>
              ))}
            </pre>
          </Stagger>
        </Reveal>
      </div>
    </section>
  )
}

export function Faq() {
  return (
    <section style={{ borderTop: '1px solid var(--line2)' }}>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: sectionPad }}>
        <div style={eyebrow}>05 — FAQ</div>
        <Reveal as="h2" style={{ ...heading, margin: '14px 0 28px' }}>
          Common questions.
        </Reveal>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {faq.map((item) => (
            <Reveal key={item.q} style={{ borderBottom: '1px solid var(--line2)' }}>
              <Accordion title={item.q}>
                <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, margin: '0 0 20px', maxWidth: 640, textWrap: 'pretty' }}>
                  {item.a}
                </p>
                {item.href && (
                  <Link
                    href={item.href}
                    className="lv-ghost"
                    style={{ display: 'inline-block', margin: '-8px 0 20px', color: 'var(--accent)', fontFamily: 'var(--font-geist-mono)', fontSize: 12.5 }}
                  >
                    {item.hrefLabel ?? 'Read more'} →
                  </Link>
                )}
              </Accordion>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export function Cta() {
  return (
    <section style={{ borderTop: '1px solid var(--line2)', position: 'relative', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(700px 340px at 50% 120%, color-mix(in oklab, var(--accent) 14%, transparent), transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <Reveal
        style={{
          maxWidth: 780,
          margin: '0 auto',
          padding: 'clamp(72px, 11vw, 120px) 24px',
          textAlign: 'center',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 22,
        }}
      >
        <div style={eyebrow}>READY TO BUILD</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(27px,5vw,52px)', letterSpacing: '-0.02em', margin: 0, fontWeight: 600, textWrap: 'balance' }}>
          Start building professional video tooling on the web.
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 16, margin: 0, maxWidth: 480, lineHeight: 1.6 }}>
          elah is open source. Drop in the timeline and preview components, wire your demuxer, and ship.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <MagneticLink
            href={GET_STARTED_URL}
            className="lv-accent-btn"
            style={{
              background: 'var(--accent)',
              color: 'var(--ink)',
              fontWeight: 600,
              fontSize: 'clamp(13px, 1.6vw, 14px)',
              padding: '11px 20px',
              borderRadius: 9,
              boxShadow: '0 0 24px color-mix(in oklab, var(--accent) 32%, transparent)',
            }}
          >
            Get Started
          </MagneticLink>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="lv-outline"
            style={{
              border: '1px solid var(--line)',
              background: 'var(--card)',
              color: 'var(--text)',
              fontWeight: 500,
              fontSize: 'clamp(13px, 1.6vw, 14px)',
              padding: '11px 20px',
              borderRadius: 9,
            }}
          >
            View on GitHub
          </a>
        </div>
        <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 12.5, color: 'var(--faint)' }}>
          <span style={{ color: 'var(--accent)' }}>$</span> npx @elah/cli serve
        </span>
      </Reveal>
    </section>
  )
}
