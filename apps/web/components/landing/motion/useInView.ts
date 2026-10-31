'use client'

import { useEffect, useRef } from 'react'

/**
 * Marks an element `data-inview="true|false"` as it enters and leaves the
 * viewport. Deliberately writes the attribute straight to the DOM rather than
 * into React state: it is read by CSS (landing.css pauses every infinite
 * animation inside a `data-inview="false"` subtree), so no render is needed.
 * Before the first observer callback the attribute is absent and animations run.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(rootMargin = '120px') {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        const last = entries[entries.length - 1]
        el.dataset.inview = last.isIntersecting ? 'true' : 'false'
      },
      { rootMargin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [rootMargin])

  return ref
}
