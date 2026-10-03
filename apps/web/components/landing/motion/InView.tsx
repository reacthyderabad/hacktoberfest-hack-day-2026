'use client'

import type { MotionChildren } from './types'
import type { CSSProperties } from 'react'
import { useInView } from './useInView'

/**
 * A plain wrapper that carries `data-inview`, so server components (CardHeader)
 * can have their looping decorations paused off screen without becoming client
 * components themselves.
 */
export function InView({ children, style, className }: { children: MotionChildren; style?: CSSProperties; className?: string }) {
  const ref = useInView<HTMLDivElement>()
  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  )
}
