'use client'

import { useState, useCallback } from 'react'
import { Shuffle, Sliders, CheckCircle2 } from 'lucide-react'
import { useTimelineEngine, useTracksStore } from '@elah/editor'

export interface TransitionsPanelProps {
  style?: React.CSSProperties
}

const TRANSITIONS = [
  { id: 'fade', name: 'Crossfade', description: 'Smooth cross-dissolve between two shots' },
  { id: 'slide', name: 'Slide Left', description: 'Incoming clip slides horizontally over outgoing' },
  { id: 'wipe', name: 'Linear Wipe', description: 'Geometric wipe reveal across screen' },
]

export function TransitionsPanel({ style }: TransitionsPanelProps) {
  const engine = useTimelineEngine()
  const tracks = useTracksStore((s) => s.tracks)
  const [selectedKind, setSelectedKind] = useState<'fade' | 'slide' | 'wipe'>('fade')
  const [durationFrames, setDurationFrames] = useState(15) // 0.5s at 30fps
  const [feedback, setFeedback] = useState<string | null>(null)

  const handleApplyTransition = useCallback(() => {
    // Find video track with at least 2 clips
    const videoTrack = tracks.find((tr) => tr.kind === 'video') || tracks[0]
    if (!videoTrack) {
      setFeedback('No video track found on timeline.')
      return
    }

    const clips = engine.getClipsOnTrack(videoTrack.id)
    if (clips.length < 2) {
      setFeedback('Requires at least 2 clips on the video track to add a transition.')
      setTimeout(() => setFeedback(null), 3500)
      return
    }

    const sorted = [...clips].sort((a, b) => a.startFrame - b.startFrame)
    try {
      engine.addTransition({
        fromClipId: sorted[0].id,
        toClipId: sorted[1].id,
        trackId: videoTrack.id,
        kind: selectedKind,
        durationFrames,
      })
      setFeedback(`Applied ${selectedKind} transition between "${sorted[0].name || 'Clip 1'}" and "${sorted[1].name || 'Clip 2'}".`)
      setTimeout(() => setFeedback(null), 4000)
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Could not add transition.')
      setTimeout(() => setFeedback(null), 3500)
    }
  }, [engine, tracks, selectedKind, durationFrames])

  return (
    <div style={style} className="flex flex-col h-full bg-ed-bg border-r border-ed-border select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-ed-border bg-ed-bg-2 shrink-0">
        <div>
          <span className="text-[13px] font-semibold text-ed-text tracking-[-0.01em]">Transitions</span>
        </div>
      </div>

      <div className="p-3 text-[11px] text-ed-text-muted border-b border-ed-border bg-ed-bg-2/40">
        Add seamless transitions between adjacent video clips on the same track.
      </div>

      <div className="p-3.5 flex flex-col gap-3 flex-1 overflow-y-auto">
        {/* Transition selection */}
        <div className="flex flex-col gap-2">
          {TRANSITIONS.map((tr) => (
            <div
              key={tr.id}
              onClick={() => setSelectedKind(tr.id as 'fade' | 'slide' | 'wipe')}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                selectedKind === tr.id
                  ? 'border-ed-accent bg-ed-elevated'
                  : 'border-ed-border bg-ed-bg hover:border-ed-border-subtle'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ed-text flex items-center gap-1.5">
                  <Shuffle size={13} className={selectedKind === tr.id ? 'text-ed-accent' : 'text-ed-text-muted'} />
                  {tr.name}
                </span>
                {selectedKind === tr.id && <CheckCircle2 size={14} className="text-ed-accent" />}
              </div>
              <p className="text-[11px] text-ed-text-muted mt-1">{tr.description}</p>
            </div>
          ))}
        </div>

        {/* Transition Duration */}
        <div className="flex items-center justify-between pt-2">
          <label className="text-[11px] font-medium text-ed-text-muted">Transition Duration</label>
          <div className="flex items-center gap-1.5">
            {[10, 15, 30].map((fr) => (
              <button
                key={fr}
                type="button"
                onClick={() => setDurationFrames(fr)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono border ${
                  durationFrames === fr
                    ? 'border-ed-accent bg-ed-elevated text-ed-text'
                    : 'border-ed-border text-ed-text-muted hover:text-ed-text'
                }`}
              >
                {(fr / 30).toFixed(1)}s
              </button>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleApplyTransition}
          className="w-full mt-2 py-2 rounded bg-ed-accent text-ed-accent-text font-semibold text-xs flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
        >
          Apply Transition to Clips
        </button>

        {feedback && (
          <div className="p-2.5 rounded bg-ed-bg-2 border border-ed-border text-[11px] text-ed-text flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-ed-accent shrink-0" />
            {feedback}
          </div>
        )}
      </div>
    </div>
  )
}
