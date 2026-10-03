'use client'

import type { MotionChildren } from './types'
import { motion, useReducedMotion } from 'framer-motion'
import { useId, useState, type CSSProperties, type ReactNode } from 'react'

export interface AccordionProps {
  title: ReactNode
  children: MotionChildren
  defaultOpen?: boolean
  buttonStyle?: CSSProperties
  panelStyle?: CSSProperties
}

/**
 * Disclosure: a button (aria-expanded) controlling a role="region" panel whose
 * height animates. Replaces native <details>, which cannot be animated. Height
 * is animated here deliberately; it is off the scroll path.
 *
 * The panel is always mounted rather than swapped in and out with
 * AnimatePresence. These panels hold the FAQ answers, which are the page's
 * densest block of indexable prose — unmounting them left the answers out of
 * the server-rendered markup entirely, where `<details>` had always kept them.
 * Collapsed, the panel is a zero-height clip that is `aria-hidden`, so assistive
 * technology and sequential focus still skip it.
 */
export function Accordion({ title, children, defaultOpen = false, buttonStyle, panelStyle }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const reduce = useReducedMotion()
  const uid = useId()
  const buttonId = `${uid}-btn`
  const panelId = `${uid}-panel`

  return (
    <div>
      <button
        id={buttonId}
        type="button"
        className="lv-accordion-btn"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        style={{
          all: 'unset',
          boxSizing: 'border-box',
          width: '100%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          ...buttonStyle,
        }}
      >
        <span>{title}</span>
        <span
          aria-hidden
          style={{
            color: 'var(--accent)',
            fontSize: 19,
            flexShrink: 0,
            lineHeight: 1,
            display: 'inline-block',
            transform: open ? 'rotate(45deg)' : 'none',
            transition: reduce ? 'none' : 'transform .2s',
          }}
        >
          +
        </span>
      </button>
      <motion.div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        aria-hidden={!open}
        // `initial={false}` so the first paint matches the server's markup
        // instead of animating open panels shut on hydration.
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: reduce ? 0 : 0.32, ease: [0.16, 1, 0.3, 1] }}
        style={{ overflow: 'hidden', ...panelStyle }}
      >
        {/* Inert while collapsed: without this the links inside a closed answer
            stay in the tab order, and a keyboard user tabs into invisible
            content. */}
        <div inert={open ? undefined : true}>{children}</div>
      </motion.div>
    </div>
  )
}
