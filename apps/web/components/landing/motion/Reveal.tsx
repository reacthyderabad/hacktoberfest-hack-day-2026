'use client'

import type { MotionChildren } from './types'
import { motion, useReducedMotion } from 'framer-motion'
import type { CSSProperties } from 'react'

const tags = {
  div: motion.div,
  h2: motion.h2,
  p: motion.p,
} as const

export interface RevealProps {
  children: MotionChildren
  as?: keyof typeof tags
  delay?: number
  style?: CSSProperties
  className?: string
}

const EASE = [0.16, 1, 0.3, 1] as const

/** Fade and rise into view once. Replaces the Chromium-only `view()` timeline helper. */
export function Reveal({ children, as = 'div', delay = 0, style, className }: RevealProps) {
  const reduce = useReducedMotion()
  const Tag = tags[as]

  if (reduce) {
    const Static = as
    return (
      <Static className={className} style={style}>
        {children}
      </Static>
    )
  }

  return (
    <Tag
      className={className}
      style={style}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </Tag>
  )
}
