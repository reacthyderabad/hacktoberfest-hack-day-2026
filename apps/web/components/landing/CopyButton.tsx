'use client'

import { useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import posthog from 'posthog-js'
import { Check, Copy } from 'lucide-react'

/**
 * Copies a snippet and reports it with the same event the hero install cards
 * use (`install_command_copied`), tagged `package: 'snippet'`.
 */
export function CopyButton({ text, label = 'Copy snippet' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const reduce = useReducedMotion()

  function copy() {
    try {
      navigator.clipboard.writeText(text)
    } catch {
      // clipboard may be unavailable (insecure context) — still flash feedback
    }
    posthog.capture('install_command_copied', { command: text, package: 'snippet' })
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1400)
  }

  return (
    <button
      type="button"
      className="lv-copy lv-snippet-copy"
      onClick={copy}
      title={label}
      aria-label={label}
      style={{
        all: 'unset',
        boxSizing: 'border-box',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 26,
        height: 26,
        borderRadius: 7,
        border: '1px solid var(--line)',
        color: 'var(--muted)',
        transition: 'border-color .18s, color .18s',
      }}
    >
      <motion.span
        key={copied ? 'done' : 'idle'}
        initial={copied && !reduce ? { scale: 0.3, rotate: -40 } : false}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 520, damping: 14 }}
        style={{ display: 'inline-flex' }}
      >
        {copied ? <Check size={14} color="var(--accent)" /> : <Copy size={14} color="var(--muted)" />}
      </motion.span>
    </button>
  )
}
