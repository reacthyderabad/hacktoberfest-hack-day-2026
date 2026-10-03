'use client'

import type { MotionChildren } from './types'
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'
import { useEffect, useState, type CSSProperties, type PointerEvent } from 'react'

export interface TiltProps {
  children: MotionChildren
  /** Maximum tilt in degrees. Capped at 3. */
  max?: number
  style?: CSSProperties
  className?: string
}

/** Subtle perspective tilt toward the pointer. Off on coarse pointers and under reduced motion. */
export function Tilt({ children, max = 3, style, className }: TiltProps) {
  const reduce = useReducedMotion()
  const [fine, setFine] = useState(false)
  const limit = Math.min(max, 3)

  const rx = useMotionValue(0)
  const ry = useMotionValue(0)
  const springX = useSpring(rx, { stiffness: 140, damping: 20, mass: 0.6 })
  const springY = useSpring(ry, { stiffness: 140, damping: 20, mass: 0.6 })

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    const update = () => setFine(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  if (reduce || !fine) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    )
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return
    const rect = e.currentTarget.getBoundingClientRect()
    const nx = (e.clientX - rect.left) / rect.width - 0.5
    const ny = (e.clientY - rect.top) / rect.height - 0.5
    ry.set(Math.max(-1, Math.min(1, nx * 2)) * limit)
    rx.set(Math.max(-1, Math.min(1, ny * 2)) * -limit)
  }

  const onPointerLeave = () => {
    rx.set(0)
    ry.set(0)
  }

  return (
    <motion.div
      className={className}
      style={{ ...style, rotateX: springX, rotateY: springY, transformPerspective: 1400 }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      {children}
    </motion.div>
  )
}
