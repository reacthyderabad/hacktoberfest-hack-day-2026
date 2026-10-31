'use client'

import type { MotionChildren } from './types'
import { motion, useReducedMotion } from 'framer-motion'
import { useRef, type CSSProperties, type PointerEvent } from 'react'

export interface SpotlightProps {
  children: MotionChildren
  className?: string
  style?: CSSProperties
  /** Pixels to lift on hover (spring). Omit for none. */
  lift?: number
}

/**
 * Pointer-following radial highlight. The pointer position goes straight into
 * CSS custom properties on the element (rAF-throttled, never React state), so a
 * hovered card grid does not re-render on every pixel. The gradient itself is
 * the `.lv-spotlight::before` rule in landing.css. Touch pointers are ignored.
 */
export function Spotlight({ children, className, style, lift }: SpotlightProps) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const raf = useRef<number | null>(null)
  const pending = useRef<{ x: number; y: number } | null>(null)

  if (reduce) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    )
  }

  const flush = () => {
    raf.current = null
    const el = ref.current
    const p = pending.current
    if (!el || !p) return
    el.style.setProperty('--spot-x', `${p.x}px`)
    el.style.setProperty('--spot-y', `${p.y}px`)
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return
    const rect = e.currentTarget.getBoundingClientRect()
    pending.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    if (raf.current === null) raf.current = requestAnimationFrame(flush)
  }

  const onPointerEnter = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return
    ref.current?.style.setProperty('--spot-o', '1')
  }

  const onPointerLeave = () => {
    if (raf.current !== null) {
      cancelAnimationFrame(raf.current)
      raf.current = null
    }
    ref.current?.style.setProperty('--spot-o', '0')
  }

  return (
    <motion.div
      ref={ref}
      className={`lv-spotlight${className ? ` ${className}` : ''}`}
      style={{ position: 'relative', ...style }}
      onPointerMove={onPointerMove}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      whileHover={lift ? { y: -lift } : undefined}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
    >
      {children}
    </motion.div>
  )
}
