'use client'

import { useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import posthog from 'posthog-js'
import { Check, CirclePlay, Copy, Rocket } from 'lucide-react'
import { DiscordIcon } from './DiscordIcon'
import { EditorMockup } from './EditorMockup'
import { DISCORD_URL, EDITOR_URL, GET_STARTED_URL, GITHUB_URL } from './landingData'
import { trackEvent, trackPlaygroundLaunch } from '@/lib/analytics'
import type { SiteStatsDisplay } from '@/lib/stats'
import type { MotionChildren } from './motion/types'
import { useInView } from './motion/useInView'

const riseBase = 'lv-rise .8s cubic-bezier(.2,.7,.2,1)'

const outlineBtn = {
  border: '1px solid var(--line)',
  background: 'linear-gradient(180deg, color-mix(in oklab, var(--elev) 60%, var(--card)), var(--card))',
  color: 'var(--text)',
  fontWeight: 500,
  fontSize: 'clamp(13px, 1.6vw, 14px)',
  padding: '10px 20px',
  borderRadius: 999,
  boxShadow: 'inset 0 1px 0 color-mix(in oklab, white 6%, transparent)',
  transition: 'border-color .18s, transform .18s, box-shadow .18s, background .18s',
} as const

const gradientText = {
  background: 'linear-gradient(100deg, var(--accent), #4d8dff 80%)',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
} as const

/** One headline word, rising in on mount ~40ms after the previous one. */
function Word({ i, gradient, reduce, children }: { i: number; gradient?: boolean; reduce: boolean | null; children: MotionChildren }) {
  const inner = gradient ? (
    <span className="lv-grad-text" style={gradientText}>
      {children}
    </span>
  ) : (
    children
  )
  if (reduce) return <span style={{ display: 'inline-block' }}>{inner}</span>
  // A CSS keyframe rather than a motion value, unlike every other reveal on this
  // page. The headline is the one element whose entrance must not be able to
  // fail: framer writes the "before" state (opacity 0) into the markup and only
  // clears it once its frame loop runs, so anything that stops that loop —
  // hydration not finishing, the tab never being looked at — leaves the page's
  // main heading invisible. A CSS animation needs no JS and no React, and
  // `lv-rise` is only defined under `prefers-reduced-motion: no-preference`, so
  // reduced-motion users get the resting style with nothing to strip.
  return (
    <span style={{ display: 'inline-block', animation: `${riseBase} ${(0.06 + i * 0.04).toFixed(2)}s both` }}>
      {inner}
    </span>
  )
}

interface CommandLineProps {
  command: string
  copied: boolean
  onCopy: () => void
}

function CommandLine({ command, copied, onCopy }: CommandLineProps) {
  const reduce = useReducedMotion()
  return (
    <div
      className="lv-copy"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: 'var(--font-geist-mono)',
        fontSize: 'clamp(10px, 1.5vw, 12.5px)',
        color: 'var(--muted)',
        background: 'var(--card)',
        border: '1px solid var(--line)',
        borderRadius: 10,
        padding: '13px 12px 13px 16px',
      }}
    >
      <button
        onClick={onCopy}
        title={`Copy ${command}`}
        aria-label={`Copy ${command}`}
        style={{
          all: 'unset',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flex: 1,
          minWidth: 0,
          overflowX: 'auto',
          cursor: 'pointer',
        }}
      >
        <span style={{ color: 'var(--accent)' }}>$</span>
        <span style={{ whiteSpace: 'nowrap' }}>{command}</span>
        <motion.span
          key={copied ? 'done' : 'idle'}
          initial={copied && !reduce ? { scale: 0.3, rotate: -40 } : false}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 520, damping: 14 }}
          style={{ display: 'inline-flex', flexShrink: 0, marginLeft: 'auto' }}
        >
          {copied ? <Check size={16} color="var(--accent)" /> : <Copy size={16} color="var(--faint)" />}
        </motion.span>
      </button>
    </div>
  )
}

export function LandingHero({ stats }: { stats: SiteStatsDisplay }) {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const reduce = useReducedMotion()
  const gateRef = useInView<HTMLElement>()

  function copyCmd(command: string, pkg: string) {
    try {
      navigator.clipboard.writeText(command)
    } catch {
      // clipboard may be unavailable (insecure context) — still flash feedback
    }
    posthog.capture('install_command_copied', { command, package: pkg })
    setCopiedCmd(command)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopiedCmd(null), 1400)
  }

  return (
    <header
      ref={gateRef}
      style={{
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div className="lv-hero-grid" aria-hidden />
      <div className="lv-aurora lv-aurora-a" aria-hidden />
      <div className="lv-aurora lv-aurora-b" aria-hidden />
      <div className="lv-noise" aria-hidden />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(1000px 480px at 50% -120px, color-mix(in oklab, var(--accent) 13%, transparent), transparent 70%), linear-gradient(180deg, transparent 40%, var(--bg) 96%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: 'clamp(110px, 12vw, 146px) 24px 0',
          position: 'relative',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(34px, 6.6vw, 74px)',
            lineHeight: 1.07,
            letterSpacing: '-0.03em',
            fontWeight: 600,
            margin: 0,
            maxWidth: 900,
            textWrap: 'balance',
          }}
        >
          <Word i={0} reduce={reduce}>
            Build
          </Word>{' '}
          <Word i={1} gradient reduce={reduce}>
            AI
          </Word>{' '}
          <Word i={2} gradient reduce={reduce}>
            Media
          </Word>{' '}
          <Word i={3} gradient reduce={reduce}>
            Applications.
          </Word>
        </h1>

        <p
          style={{
            animation: `${riseBase} .1s both`,
            fontSize: 'clamp(15px, 2vw, 17.5px)',
            lineHeight: 1.65,
            color: 'var(--muted)',
            maxWidth: 640,
            padding: '0 8px',
            margin: 0,
            textWrap: 'pretty',
          }}
        >
          Build video generation, audio editing, podcast software, browser-native editors, rendering, and
          media workflows with open-source infrastructure.
        </p>

        {/* one primary, one secondary; GitHub and Discord live in the trust row */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            flexWrap: 'wrap',
            justifyContent: 'center',
            animation: `${riseBase} .18s both`,
          }}
        >
          <Link
            href={GET_STARTED_URL}
            className="lv-accent-btn lv-nav-cta lv-cta-primary"
            style={{
              color: 'var(--ink)',
              fontWeight: 600,
              fontSize: 'clamp(13px, 1.6vw, 14px)',
              padding: '10px 22px',
              borderRadius: 999,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
            }}
          >
            <Rocket size={15} color="var(--ink)"  />
            Get Started
          </Link>
          <Link
            href={EDITOR_URL}
            className="lv-outline lv-hero-btn"
            style={{ ...outlineBtn, display: 'inline-flex', alignItems: 'center', gap: 7 }}
            onClick={() =>
              trackPlaygroundLaunch({
                source: 'hero_live_playground',
                title: 'Live Playground',
                href: EDITOR_URL,
                variant: 'full',
              })
            }
          >
            <CirclePlay size={15} color="var(--accent)"  />
            Live Playground
          </Link>
        </div>

        {/* trust badges */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px 20px',
            fontSize: 12.5,
            color: 'var(--faint)',
            flexWrap: 'wrap',
            justifyContent: 'center',
            fontFamily: 'var(--font-geist-mono)',
            animation: `${riseBase} .24s both`,
          }}
        >
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="lv-ghost"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--muted)' }}
            onClick={() => trackEvent('stats_clicked', { stat: 'stars', source: 'hero' })}
          >
            {stats.stars ? (
              <>
                <span aria-hidden>★</span> {stats.stars} stars
              </>
            ) : (
              'Star on GitHub'
            )}
          </a>
          <a
            href="https://www.npmjs.com/package/@elah/editor"
            target="_blank"
            rel="noopener noreferrer"
            className="lv-ghost"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--muted)' }}
            onClick={() => trackEvent('stats_clicked', { stat: 'downloads', source: 'hero' })}
          >
            {stats.downloads ? `${stats.downloads} npm downloads` : '5 open-source packages'}
          </a>
          <span
            style={{
              border: '1px solid var(--line)',
              borderRadius: 99,
              padding: '3px 11px',
              color: 'var(--muted)',
            }}
          >
            Apache 2.0
          </span>
          {/* No second GitHub link here: demoting the old GitHub button into
              this row would have put two links to the same URL side by side,
              and "Star us on GitHub" above is the more specific of the two. */}
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="lv-ghost"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--muted)' }}
            onClick={() => trackEvent('discord_clicked', { source: 'hero' })}
          >
            <DiscordIcon size={14} />
            Discord
          </a>
        </div>

        {/* one copyable install; the five packages are laid out in the libraries section below */}
        <div style={{ width: '100%', maxWidth: 440, textAlign: 'left', animation: `${riseBase} .3s both` }}>
          <CommandLine
            command="npm install @elah/editor"
            copied={copiedCmd === 'npm install @elah/editor'}
            onCopy={() => copyCmd('npm install @elah/editor', '@elah/editor')}
          />
        </div>

        {/* scroll hint */}
        <a
          href="#libraries"
          className="lv-ghost"
          style={{
            fontFamily: 'var(--font-geist-mono)',
            fontSize: 12,
            letterSpacing: '.1em',
            color: 'var(--faint)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            animation: `${riseBase} .36s both`,
          }}
        >
          ↓ Explore Libraries &amp; Playground ↓
        </a>
      </div>

      <EditorMockup />
    </header>
  )
}
