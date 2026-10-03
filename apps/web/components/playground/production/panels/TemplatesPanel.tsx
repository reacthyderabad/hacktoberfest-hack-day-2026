'use client'

import { useCallback } from 'react'
import { Type, Sparkles, LayoutTemplate } from 'lucide-react'
import { useTimelineEngine, useTracksStore, usePlaybackStore } from '@elah/editor'

export interface TemplatesPanelProps {
  style?: React.CSSProperties
}

interface TemplatePreset {
  id: string
  name: string
  category: string
  text: string
  fontSize: number
  color: string
  fontWeight: 'normal' | 'bold'
  position: { x: number; y: number }
  durationSec: number
}

const TEMPLATES: TemplatePreset[] = [
  {
    id: 'cinematic-intro',
    name: 'Cinematic Intro',
    category: 'Titles',
    text: 'ELAH STUDIO AI',
    fontSize: 72,
    color: '#ffffff',
    fontWeight: 'bold',
    position: { x: 0.5, y: 0.5 },
    durationSec: 4,
  },
  {
    id: 'lower-third-clean',
    name: 'Clean Lower Third',
    category: 'Lower Thirds',
    text: 'Alex Morgan • Creative Director',
    fontSize: 42,
    color: '#38BDF8', // Cyan accent
    fontWeight: 'bold',
    position: { x: 0.5, y: 0.84 },
    durationSec: 5,
  },
  {
    id: 'minimal-banner',
    name: 'Top Header Banner',
    category: 'Titles',
    text: 'CHAPTER 01 // THE BEGINNING',
    fontSize: 36,
    color: '#FDE047',
    fontWeight: 'bold',
    position: { x: 0.5, y: 0.16 },
    durationSec: 3.5,
  },
  {
    id: 'bold-quote',
    name: 'Inspirational Quote',
    category: 'Typography',
    text: '"Video editing powered by intelligence."',
    fontSize: 54,
    color: '#ffffff',
    fontWeight: 'normal',
    position: { x: 0.5, y: 0.5 },
    durationSec: 4,
  },
  {
    id: 'social-handle',
    name: 'Social Media Tag',
    category: 'Lower Thirds',
    text: '@elahstudio • Follow for more',
    fontSize: 34,
    color: '#E2E8F0',
    fontWeight: 'normal',
    position: { x: 0.28, y: 0.86 },
    durationSec: 6,
  },
]

export function TemplatesPanel({ style }: TemplatesPanelProps) {
  const engine = useTimelineEngine()
  const currentFrame = usePlaybackStore((s) => s.currentFrame)
  const tracks = useTracksStore((s) => s.tracks)

  const handleApplyTemplate = useCallback(
    (t: TemplatePreset) => {
      const elementsTrack = tracks.find((tr) => tr.kind === 'elements') || tracks[0]
      if (!elementsTrack) return

      const fps = 30
      const durationFrames = Math.round(t.durationSec * fps)

      engine.addClip({
        type: 'text',
        trackId: elementsTrack.id,
        startFrame: currentFrame,
        durationFrames,
        name: t.name,
        text: {
          content: t.text,
          fontSize: t.fontSize,
          color: t.color,
          fontWeight: t.fontWeight,
          textAlign: 'center',
        },
        transform: {
          x: t.position.x,
          y: t.position.y,
          scale: 1,
          rotation: 0,
          anchor: { x: 0.5, y: 0.5 },
        },
      })
    },
    [engine, currentFrame, tracks],
  )

  return (
    <div style={style} className="flex flex-col h-full bg-ed-bg border-r border-ed-border select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-ed-border bg-ed-bg-2 shrink-0">
        <div>
          <span className="text-[13px] font-semibold text-ed-text tracking-[-0.01em]">Templates</span>
          <span className="ml-2 text-[11px] font-mono text-ed-text-muted">({TEMPLATES.length})</span>
        </div>
      </div>

      <div className="p-3 text-[11px] text-ed-text-muted border-b border-ed-border bg-ed-bg-2/40">
        Click any preset to insert at the current playhead position.
      </div>

      {/* Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-2.5">
        {TEMPLATES.map((t) => (
          <div
            key={t.id}
            onClick={() => handleApplyTemplate(t)}
            className="group flex flex-col p-3 rounded-lg border border-ed-border bg-ed-elevated hover:border-ed-accent/70 hover:bg-ed-highest transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-ed-text group-hover:text-ed-accent transition-colors flex items-center gap-1.5">
                <LayoutTemplate size={13} /> {t.name}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-ed-text-muted uppercase font-mono">
                {t.category}
              </span>
            </div>

            {/* Visual Preview */}
            <div className="h-16 rounded bg-black/60 border border-white/5 flex items-center justify-center p-2 text-center overflow-hidden">
              <span
                style={{
                  fontSize: Math.max(t.fontSize * 0.35, 12),
                  color: t.color,
                  fontWeight: t.fontWeight,
                }}
                className="truncate leading-tight max-w-full"
              >
                {t.text}
              </span>
            </div>

            <div className="flex items-center justify-between mt-2 text-[10px] text-ed-text-muted">
              <span>Duration: {t.durationSec}s</span>
              <span className="text-ed-accent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-medium">
                <Sparkles size={11} /> + Insert
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
