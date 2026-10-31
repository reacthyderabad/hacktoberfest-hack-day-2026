'use client'

import type { MotionChildren } from './types'
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'
import { useEffect, useState, type CSSProperties, type PointerEvent } from 'react'

export interface MagneticProps {
  children: MotionChildren
  href: string
  className?: string
  style?: CSSProperties
  /** Maximum pull in px. Capped at 6. */
  strength?: number
}

/** An anchor that leans up to 6px toward the pointer. Static on coarse pointers and under reduced motion. */
export function MagneticLink({ children, href, className, style, strength = 6 }: MagneticProps) {
  const reduce = useReducedMotion()
  const [fine, setFine] = useState(false)
  const limit = Math.min(strength, 6)

  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const x = useSpring(mx, { stiffness: 220, damping: 18, mass: 0.5 })
  const y = useSpring(my, { stiffness: 220, damping: 18, mass: 0.5 })

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    const update = () => setFine(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  if (reduce || !fine) {
    return (
      <a href={href} className={className} style={style}>
        {children}
      </a>
    )
  }

  const onPointerMove = (e: PointerEvent<HTMLAnchorElement>) => {
    if (e.pointerType === 'touch') return
    const rect = e.currentTarget.getBoundingClientRect()
    const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)
    const dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)
    mx.set(Math.max(-1, Math.min(1, dx)) * limit)
    my.set(Math.max(-1, Math.min(1, dy)) * limit)
  }

  const onPointerLeave = () => {
    mx.set(0)
    my.set(0)
  }

  return (
    <motion.a
      href={href}
      className={className}
      style={{ ...style, x, y, display: 'inline-block' }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      {children}
    </motion.a>
  )
}
