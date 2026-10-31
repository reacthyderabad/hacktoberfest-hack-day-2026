'use client'

import type { MotionChildren } from './types'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import type { CSSProperties } from 'react'
import { useInView } from './useInView'

const EASE = [0.16, 1, 0.3, 1] as const

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
}

const growVariants: Variants = {
  hidden: { scaleY: 0 },
  show: { scaleY: 1, transition: { duration: 0.45, ease: EASE } },
}

export interface StaggerProps {
  children: MotionChildren
  /** Seconds between children. */
  stagger?: number
  /** Also mark the container `data-inview` so off-screen infinite animations pause. */
  gate?: boolean
  style?: CSSProperties
  className?: string
}

/** Parent that reveals its StaggerItem / StaggerGrow descendants in sequence. */
export function Stagger({ children, stagger = 0.06, gate = false, style, className }: StaggerProps) {
  const reduce = useReducedMotion()
  const ref = useInView<HTMLDivElement>()
  const gateRef = gate ? ref : undefined

  if (reduce) {
    return (
      <div ref={gateRef} className={className} style={style}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      ref={gateRef}
      className={className}
      style={style}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-10% 0px' }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger } } }}
    >
      {children}
    </motion.div>
  )
}

export interface StaggerItemProps {
  children: MotionChildren
  as?: 'div' | 'span'
  style?: CSSProperties
  className?: string
}

export function StaggerItem({ children, as = 'div', style, className }: StaggerItemProps) {
  const reduce = useReducedMotion()
  if (reduce) {
    const Static = as
    return (
      <Static className={className} style={style}>
        {children}
      </Static>
    )
  }
  const Tag = as === 'span' ? motion.span : motion.div
  return (
    <Tag className={className} style={style} variants={itemVariants}>
      {children}
    </Tag>
  )
}

/** A line that draws in downward from its top edge (connectors). */
export function StaggerGrow({ children, style, className }: { children?: MotionChildren; style?: CSSProperties; className?: string }) {
  const reduce = useReducedMotion()
  if (reduce) {
    return (
      <span className={className} style={style}>
        {children}
      </span>
    )
  }
  return (
    <motion.span className={className} style={{ ...style, originY: 0 }} variants={growVariants}>
      {children}
    </motion.span>
  )
}
