'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion, useScroll, type MotionStyle } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { trackEvent } from '@/lib/analytics'
import { DISCORD_URL, GITHUB_URL, isActiveHref, navLinks, navVariantFor, type NavVariant } from '@/config/nav'
import { VersionBadge } from '@/components/marketing/VersionBadge'
import { useScrollDirection } from '@/components/landing/motion/useScrollDirection'
import { Logo } from './Logo'

export interface SiteNavProps {
  /**
   * `floating`: glass pill that hides on scroll-down and draws a scroll
   * progress filament. `bar`: calm sticky full-width bar that never hides.
   * Omit to choose from the route (`/docs/**` is a bar, everything else floats).
   */
  variant?: NavVariant
  /**
   * Floating only. When true the pill overlaps the first section (the landing
   * hero reserves space for it); otherwise it takes its own height in flow.
   */
  overlap?: boolean
}

const EASE = [0.16, 1, 0.3, 1] as const

const linkBase = 'rounded-lg px-2.5 py-1.5 text-[13.5px] transition-colors'
const linkIdle = 'text-on-surface-variant hover:bg-surface-high hover:text-on-surface'
const linkActive = 'bg-surface-high font-medium text-on-surface'

function DesktopLinks({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Main" className="hidden flex-1 items-center justify-center gap-0.5 md:flex">
      {navLinks.map((l) => {
        const active = isActiveHref(pathname, l.href)
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? 'page' : undefined}
            className={cn(linkBase, active ? linkActive : linkIdle)}
          >
            {l.label}
          </Link>
        )
      })}
    </nav>
  )
}

/**
 * Version pill, Discord, GitHub. Same markup in both variants. There is no
 * primary action in the header by design: the hero and the closing CTA carry
 * "Get Started", and a third copy in the chrome was noise on every page.
 */
function DesktopActions() {
  const ghost =
    'shrink-0 rounded-lg px-2 py-1.5 text-[13px] font-medium text-on-surface-variant transition-colors hover:text-on-surface'
  return (
    <div className="hidden shrink-0 items-center gap-1 md:flex">
      <VersionBadge className="mr-1 hidden lg:inline-flex" />
      <a
        href={DISCORD_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={ghost}
        onClick={() => trackEvent('discord_clicked', { source: 'nav_desktop' })}
      >
        Discord
      </a>
      <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className={ghost}>
        GitHub
      </a>
    </div>
  )
}

function MobileMenuContent({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  const row = 'rounded-lg px-3 py-2.5 text-[15px] transition-colors'
  return (
    <nav aria-label="Mobile" className="flex flex-col gap-0.5">
      {navLinks.map((l) => {
        const active = isActiveHref(pathname, l.href)
        return (
          <Link
            key={l.href}
            href={l.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(row, active ? linkActive : linkIdle)}
          >
            {l.label}
          </Link>
        )
      })}
      <div className="my-1 px-1" onClick={onNavigate}>
        <VersionBadge block />
      </div>
      <a
        href={DISCORD_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          trackEvent('discord_clicked', { source: 'nav_mobile' })
          onNavigate()
        }}
        className={cn(row, linkIdle)}
      >
        Discord <span aria-hidden>↗</span>
      </a>
      <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" onClick={onNavigate} className={cn(row, linkIdle)}>
        GitHub <span aria-hidden>↗</span>
      </a>
    </nav>
  )
}

function MenuToggle({ open, onToggle, circle }: { open: boolean; onToggle: () => void; circle?: boolean }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label="Toggle menu"
      aria-expanded={open}
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center text-on-surface-variant transition-colors hover:bg-surface-high hover:text-on-surface md:hidden',
        circle ? 'rounded-full border border-outline-variant' : 'rounded-lg',
      )}
    >
      {open ? <X size={18} /> : <Menu size={18} />}
    </button>
  )
}

/** Close on route change and on Escape. */
function useMenuState(pathname: string) {
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  return [open, setOpen] as const
}

function FloatingNav({ pathname, overlap }: { pathname: string; overlap: boolean }) {
  const [menuOpen, setMenuOpen] = useMenuState(pathname)
  const [focusWithin, setFocusWithin] = useState(false)
  const reduce = useReducedMotion()
  const { hidden, compact } = useScrollDirection(120, 80)
  const { scrollYProgress } = useScroll()

  // Never hide while the mobile menu is open or focus is inside the pill.
  const tucked = !reduce && hidden && !menuOpen && !focusWithin
  const shrunk = !reduce && compact && !menuOpen

  // --lv-progress drives the ::after filament as a scroll-progress bar; framer
  // writes it straight to the element, no re-render. Omitted under reduced
  // motion so the CSS fallback (a full, static filament) applies.
  const navStyle = reduce ? undefined : ({ '--lv-progress': scrollYProgress, transformOrigin: '50% 0%' } as unknown as MotionStyle)

  return (
    // The pill's glass, filament and panel styling is scoped to `.landing-root`
    // in globals.css / landing.css. `display: contents` lends that scope to
    // routes outside the landing page without adding a box, so `position:
    // sticky` still resolves against the page and not this wrapper.
    <div className="landing-root" style={{ display: 'contents' }}>
      <motion.div
        className="lv-nav-shell"
        style={overlap ? undefined : { marginBottom: 0 }}
        animate={{ y: tucked ? '-140%' : '0%' }}
        transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
        onFocusCapture={() => setFocusWithin(true)}
        onBlurCapture={() => setFocusWithin(false)}
      >
        <motion.nav
          className="lv-nav"
          data-open={menuOpen}
          aria-label="Site"
          style={navStyle}
          animate={{ scale: shrunk ? 0.965 : 1 }}
          transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
        >
          <div className="relative z-[1] flex min-h-[46px] items-center gap-2.5 py-[5px] pl-4 pr-1.5">
            <Logo size={22} />
            <span className="flex-1 md:hidden" />
            <DesktopLinks pathname={pathname} />
            <DesktopActions />
            <MenuToggle open={menuOpen} onToggle={() => setMenuOpen((v) => !v)} circle />
          </div>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                key="panel"
                className="lv-nav-panel md:hidden"
                initial={reduce ? false : { opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: -10 }}
                transition={{ duration: reduce ? 0 : 0.22, ease: EASE }}
                // Opaque: the stock panel is glass, and page text bleeds through a menu.
                style={{ background: 'var(--color-surface-container)', borderTop: '1px solid var(--line2)', padding: '8px 12px 14px', zIndex: 1 }}
              >
                <MobileMenuContent pathname={pathname} onNavigate={() => setMenuOpen(false)} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.nav>
      </motion.div>
    </div>
  )
}

function BarNav({ pathname }: { pathname: string }) {
  const [menuOpen, setMenuOpen] = useMenuState(pathname)
  const reduce = useReducedMotion()

  return (
    <header className="sticky top-0 z-50 border-b border-outline-variant bg-surface/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Logo size={24} wordmarkSize={17} />
        <span className="flex-1 md:hidden" />
        <DesktopLinks pathname={pathname} />
        <DesktopActions />
        <MenuToggle open={menuOpen} onToggle={() => setMenuOpen((v) => !v)} />
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: reduce ? 0 : 0.15 }}
            className="absolute inset-x-0 top-full max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-outline-variant bg-surface px-4 pb-4 pt-2 shadow-lg md:hidden"
          >
            <MobileMenuContent pathname={pathname} onNavigate={() => setMenuOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

/**
 * The one site header. Link list, logo, active-route treatment, version pill
 * and Discord/GitHub are shared; only the chrome differs.
 */
export function SiteNav({ variant, overlap = false }: SiteNavProps) {
  const pathname = usePathname() ?? '/'
  const resolved = variant ?? navVariantFor(pathname)
  return resolved === 'bar' ? <BarNav pathname={pathname} /> : <FloatingNav pathname={pathname} overlap={overlap} />
}
