'use client'

import { useState, useCallback } from 'react'
import { Captions, Plus, Sparkles, Wand2 } from 'lucide-react'
import { useTimelineEngine, useTracksStore, usePlaybackStore } from '@elah/editor'

export interface SubtitlesPanelProps {
  style?: React.CSSProperties
}

const SUBTITLE_STYLES = [
  { id: 'yellow', name: 'High-Contrast Yellow', color: '#FDE047', bg: 'rgba(0,0,0,0.75)' },
  { id: 'white', name: 'Clean White', color: '#FFFFFF', bg: 'rgba(0,0,0,0.65)' },
  { id: 'cyan', name: 'Modern Cyan', color: '#38BDF8', bg: 'rgba(0,0,0,0.75)' },
]

export function SubtitlesPanel({ style }: SubtitlesPanelProps) {
  const engine = useTimelineEngine()
  const currentFrame = usePlaybackStore((s) => s.currentFrame)
  const tracks = useTracksStore((s) => s.tracks)
  const [subtitleText, setSubtitleText] = useState('')
  const [selectedStyle, setSelectedStyle] = useState('yellow')
  const [durationSec, setDurationSec] = useState(3)

  const handleAddSubtitle = useCallback(() => {
    const text = subtitleText.trim() || 'Add your subtitle text here'
    const elementsTrack = tracks.find((tr) => tr.kind === 'elements') || tracks[0]
    if (!elementsTrack) return

    const styleObj = SUBTITLE_STYLES.find((s) => s.id === selectedStyle) || SUBTITLE_STYLES[0]
    const fps = 30
    const durationFrames = Math.round(durationSec * fps)

    engine.addClip({
      type: 'text',
      trackId: elementsTrack.id,
      startFrame: currentFrame,
      durationFrames,
      name: `Subtitle: ${text.slice(0, 15)}...`,
      text: {
        content: text,
        fontSize: 42,
        color: styleObj.color,
        fontWeight: 'bold',
        textAlign: 'center',
      },
      transform: {
        x: 0.5,
        y: 0.86, // Lower center
        scale: 1,
        rotation: 0,
        anchor: { x: 0.5, y: 0.5 },
      },
    })

    setSubtitleText('')
  }, [subtitleText, selectedStyle, durationSec, engine, currentFrame, tracks])

  const handleGenerateSampleCaptions = useCallback(() => {
    const elementsTrack = tracks.find((tr) => tr.kind === 'elements') || tracks[0]
    if (!elementsTrack) return

    const sampleLines = [
      'Welcome to Elah Studio AI.',
      'A powerful browser-based video editing engine.',
      'Create, trim and compose in seconds.',
    ]

    const fps = 30
    const clipDur = fps * 3

    engine.batch(() => {
      sampleLines.forEach((line, idx) => {
        engine.addClip({
          type: 'text',
          trackId: elementsTrack.id,
          startFrame: idx * clipDur,
          durationFrames: clipDur - 5,
          name: `Caption ${idx + 1}`,
          text: {
            content: line,
            fontSize: 42,
            color: '#FDE047',
            fontWeight: 'bold',
            textAlign: 'center',
          },
          transform: {
            x: 0.5,
            y: 0.86,
            scale: 1,
            rotation: 0,
            anchor: { x: 0.5, y: 0.5 },
          },
        })
      })
    }, 'Generate sample captions')
  }, [engine, tracks])

  return (
    <div style={style} className="flex flex-col h-full bg-ed-bg border-r border-ed-border select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-ed-border bg-ed-bg-2 shrink-0">
        <div>
          <span className="text-[13px] font-semibold text-ed-text tracking-[-0.01em]">Subtitles & Captions</span>
        </div>
      </div>

      <div className="p-3.5 flex flex-col gap-3 flex-1 overflow-y-auto">
        {/* Input box */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-ed-text-muted">Subtitle Text</label>
          <textarea
            value={subtitleText}
            onChange={(e) => setSubtitleText(e.target.value)}
            placeholder="Type caption line to appear on screen..."
            rows={3}
            className="w-full p-2.5 rounded border border-ed-border bg-ed-bg-2 text-xs text-ed-text placeholder:text-ed-text-muted outline-none focus:border-ed-accent resize-none"
          />
        </div>

        {/* Style selection */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-ed-text-muted">Caption Style</label>
          <div className="grid grid-cols-3 gap-1.5">
            {SUBTITLE_STYLES.map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedStyle(st.id)}
                className={`px-2 py-1.5 rounded border text-[11px] font-medium transition-colors ${
                  selectedStyle === st.id
                    ? 'border-ed-accent bg-ed-elevated text-ed-text'
                    : 'border-ed-border bg-ed-bg text-ed-text-muted hover:text-ed-text'
                }`}
              >
                <span className="inline-block w-2.5 h-2.5 rounded-full mr-1" style={{ background: st.color }} />
                {st.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium text-ed-text-muted">Duration (seconds)</label>
          <div className="flex items-center gap-1.5">
            {[2, 3, 4, 5].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setDurationSec(sec)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                  durationSec === sec
                    ? 'border-ed-accent bg-ed-elevated text-ed-text'
                    : 'border-ed-border text-ed-text-muted hover:text-ed-text'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleAddSubtitle}
          className="w-full mt-1 py-2 rounded bg-ed-accent text-ed-accent-text font-semibold text-xs flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
        >
          <Plus size={15} /> Add Subtitle at Playhead
        </button>

        {/* Divider */}
        <div className="h-px bg-ed-border my-2" />

        {/* Quick Auto Captions Generator */}
        <div className="p-3 rounded-lg border border-ed-border bg-ed-bg-2/50 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-ed-text">
            <Wand2 size={13} className="text-ed-accent" /> Sample Captions Track
          </div>
          <p className="text-[11px] text-ed-text-muted">
            Automatically generates a 3-part synchronized captions sequence on the elements track.
          </p>
          <button
            type="button"
            onClick={handleGenerateSampleCaptions}
            className="py-1.5 px-3 rounded border border-ed-border bg-ed-elevated hover:bg-ed-highest text-ed-text text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5"
          >
            <Sparkles size={12} className="text-ed-accent" /> Generate 3-Beat Captions
          </button>
        </div>
      </div>
    </div>
  )
}
