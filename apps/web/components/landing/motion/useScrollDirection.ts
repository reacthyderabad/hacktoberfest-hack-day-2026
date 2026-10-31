'use client'

import { useMotionValueEvent, useScroll } from 'framer-motion'
import { useState } from 'react'

export interface ScrollDirectionState {
  /** Scrolled down past `hideAfter` and still heading down. */
  hidden: boolean
  /** Scrolled past `compactAfter`. */
  compact: boolean
}

/**
 * Derives nav visibility from scroll. State only changes when a boolean
 * actually flips, so scrolling does not re-render on every frame.
 */
export function useScrollDirection(hideAfter = 120, compactAfter = 80): ScrollDirectionState {
  const { scrollY } = useScroll()
  const [state, setState] = useState<ScrollDirectionState>({ hidden: false, compact: false })

  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0
    const delta = y - prev
    const compact = y > compactAfter
    let hidden = state.hidden
    if (y <= hideAfter) hidden = false
    else if (delta > 2) hidden = true
    else if (delta < -2) hidden = false
    if (hidden !== state.hidden || compact !== state.compact) setState({ hidden, compact })
  })

  return state
}
