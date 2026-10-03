'use client'

import { memo, useCallback, useMemo, useState } from 'react'
import {
  Plus,
  Type as TypeIcon,
  Scissors,
  Trash2,
  Copy,
  Maximize2,
  Minus,
  ChevronDown,
  Music,
  Film,
  Magnet,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  useTracksStore,
  usePlaybackStore,
  useSelectionStore,
  useTimelineEngine,
  splitClipAtPlayhead,
  framesToTimecode,
  type TimelineRef,
} from '@elah/editor'
import { cn } from '@/lib/utils'

const ZOOM_MIN = 0.02
const ZOOM_MAX = 50
const zoomToSlider = (z: number) =>
  (Math.log(z) - Math.log(ZOOM_MIN)) / (Math.log(ZOOM_MAX) - Math.log(ZOOM_MIN))
const sliderToZoom = (s: number) =>
  Math.exp(Math.log(ZOOM_MIN) + s * (Math.log(ZOOM_MAX) - Math.log(ZOOM_MIN)))

export const TimelineControls = memo(function TimelineControls({
  timelineRef,
  compact = false,
}: {
  timelineRef: React.RefObject<TimelineRef | null>
  compact?: boolean
}) {
  const engine = useTimelineEngine()
  const zoom = usePlaybackStore((s) => s.zoom)
  const setZoom = usePlaybackStore((s) => s.setZoom)
  const snapEnabled = usePlaybackStore((s) => s.snapEnabled)
  const toggleSnap = usePlaybackStore((s) => s.toggleSnap)
  const currentFrame = usePlaybackStore((s) => s.currentFrame)

  const selectedClipIds = useSelectionStore((s) => s.selectedClipIds)
  const tracks = useTracksStore((s) => s.tracks)
  const clips = useTracksStore((s) => s.clips)

  const [addOpen, setAddOpen] = useState(false)

  // Anchored zoom
  const zoomTo = useCallback(
    (next: number) => {
      const handle = timelineRef.current
      if (handle?.zoomAtAnchor) handle.zoomAtAnchor(next)
      else setZoom(next)
    },
    [timelineRef, setZoom],
  )

  // Find currently selected clip object
  const selectedClip = useMemo(() => {
    if (selectedClipIds.size !== 1) return null
    const id = [...selectedClipIds][0]
    return engine.findClip(id)?.clip ?? null
  }, [selectedClipIds, engine, tracks, clips])

  const hasSelection = Boolean(selectedClip)

  // Check if playhead intersects the selected clip, or any clip on timeline
  const canSplit = useMemo(() => {
    if (usePlaybackStore.getState().isPlaying) return false
    if (selectedClip) {
      return (
        currentFrame > selectedClip.startFrame &&
        currentFrame < selectedClip.startFrame + selectedClip.durationFrames
      )
    }
    for (const trackClips of Object.values(clips)) {
      for (const c of trackClips) {
        if (currentFrame > c.startFrame && currentFrame < c.startFrame + c.durationFrames) {
          return true
        }
      }
    }
    return false
  }, [selectedClip, currentFrame, clips])

  const handleSplit = useCallback(() => {
    if (usePlaybackStore.getState().isPlaying) return

    if (selectedClip) {
      if (
        currentFrame > selectedClip.startFrame &&
        currentFrame < selectedClip.startFrame + selectedClip.durationFrames
      ) {
        splitClipAtPlayhead(engine)
        return
      }
    }

    // Auto-split clip under playhead
    for (const [trackId, trackClips] of Object.entries(clips)) {
      for (const c of trackClips) {
        if (currentFrame > c.startFrame && currentFrame < c.startFrame + c.durationFrames) {
          useSelectionStore.getState().selectClip(c.id)
          engine.batch(() => {
            engine.splitClip(c.id, trackId, currentFrame)
          }, 'Split at playhead')
          return
        }
      }
    }
  }, [selectedClip, currentFrame, clips, engine])

  const handleDeleteSelected = useCallback(() => {
    const ids = useSelectionStore.getState().selectedClipIds
    if (ids.size !== 1) return
    const id = [...ids][0]
    const found = engine.findClip(id)
    if (!found) return
    engine.removeClip(id, found.clip.trackId)
    useSelectionStore.getState().clearSelection()
  }, [engine])

  const handleDuplicateSelected = useCallback(() => {
    const ids = useSelectionStore.getState().selectedClipIds
    if (ids.size !== 1) return
    const id = [...ids][0]
    const found = engine.findClip(id)
    if (!found) return
    const c = found.clip
    engine.cloneClip(id, c.trackId, c.startFrame + c.durationFrames)
  }, [engine])

  // Move clip by delta frames (Nudge)
  const handleNudge = useCallback(
    (delta: number) => {
      if (!selectedClip) return
      const nextStart = Math.max(0, selectedClip.startFrame + delta)
      engine.moveClip(selectedClip.id, selectedClip.trackId, selectedClip.trackId, nextStart)
    },
    [selectedClip, engine],
  )

  const addTextTrack = useCallback(() => {
    const n = useTracksStore.getState().tracks.filter((t) => t.kind === 'elements').length + 1
    engine.addTrack('elements', { name: `Elements ${n}` })
  }, [engine])

  const addAudioTrack = useCallback(() => {
    const n = useTracksStore.getState().tracks.filter((t) => t.kind === 'audio').length + 1
    engine.addTrack('audio', { name: `Audio ${n}` })
  }, [engine])

  const addVideoTrack = useCallback(() => {
    const n = useTracksStore.getState().tracks.filter((t) => t.kind === 'video').length + 1
    engine.addTrack('video', { name: `Video ${n}` })
  }, [engine])

  const ghostBtn = cn(
    'inline-flex items-center gap-1.5 px-2 py-1 rounded text-[13px] text-ed-text-muted hover:text-ed-text hover:bg-ed-elevated transition-colors cursor-pointer',
    compact && 'h-9 px-2.5',
  )
  const ghostIcon = cn(
    'inline-flex items-center justify-center rounded text-ed-text-muted hover:text-ed-text hover:bg-ed-elevated transition-colors cursor-pointer',
    compact ? 'w-9 h-9' : 'w-7 h-7',
  )
  const disabledMod =
    'opacity-35 cursor-not-allowed hover:bg-transparent hover:text-ed-text-muted'

  return (
    <div
      className={cn(
        'flex items-center justify-between px-3 bg-ed-bg-2 border-t border-ed-border shrink-0 select-none',
        compact ? 'h-12 px-2' : 'h-10',
      )}
    >
      {/* Left Tools (Track, Split, Duplicate, Delete, Snap) */}
      <div className="flex items-center gap-0.5">
        {/* Add Track Menu */}
        <div className="relative">
          <button
            type="button"
            className={ghostBtn}
            onClick={() => setAddOpen((o) => !o)}
            title="Add track to timeline"
          >
            <Plus size={14} /> {!compact && 'Add Track'} <ChevronDown size={12} />
          </button>
          {addOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setAddOpen(false)} />
              <div className="absolute left-0 top-full mt-1 z-50 min-w-[150px] rounded-md border border-ed-border bg-ed-elevated py-1 shadow-2xl">
                <button
                  type="button"
                  onClick={() => {
                    addVideoTrack()
                    setAddOpen(false)
                  }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-[13px] text-ed-text-muted hover:text-ed-text hover:bg-ed-highest transition-colors"
                >
                  <Film size={14} /> Video Track
                </button>
                <button
                  type="button"
                  onClick={() => {
                    addAudioTrack()
                    setAddOpen(false)
                  }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-[13px] text-ed-text-muted hover:text-ed-text hover:bg-ed-highest transition-colors"
                >
                  <Music size={14} /> Audio Track
                </button>
                <button
                  type="button"
                  onClick={() => {
                    addTextTrack()
                    setAddOpen(false)
                  }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-[13px] text-ed-text-muted hover:text-ed-text hover:bg-ed-highest transition-colors"
                >
                  <TypeIcon size={14} /> Text / Elements Track
                </button>
              </div>
            </>
          )}
        </div>

        <div className="w-px h-[18px] bg-ed-border shrink-0 mx-1" />

        {/* Split at Playhead */}
        <button
          type="button"
          className={cn(ghostBtn, !canSplit && disabledMod)}
          disabled={!canSplit}
          onClick={handleSplit}
          title={canSplit ? 'Split clip at playhead (S)' : 'Position playhead inside a clip to split'}
        >
          <Scissors size={14} /> {!compact && 'Split'}
        </button>

        {/* Duplicate Clip */}
        <button
          type="button"
          className={cn(ghostIcon, !hasSelection && disabledMod)}
          disabled={!hasSelection}
          onClick={handleDuplicateSelected}
          title={hasSelection ? 'Duplicate clip' : 'Select a clip first'}
        >
          <Copy size={14} />
        </button>

        {/* Delete Clip */}
        <button
          type="button"
          className={cn(ghostIcon, !hasSelection && disabledMod)}
          disabled={!hasSelection}
          onClick={handleDeleteSelected}
          title={hasSelection ? 'Delete clip (Del)' : 'Select a clip first'}
        >
          <Trash2 size={14} />
        </button>

        <div className="w-px h-[18px] bg-ed-border shrink-0 mx-1" />

        {/* Magnetic Snapping Toggle */}
        <button
          type="button"
          onClick={toggleSnap}
          title={snapEnabled ? 'Magnetic snapping enabled (N)' : 'Magnetic snapping disabled (N)'}
          className={cn(
            ghostIcon,
            snapEnabled
              ? 'text-ed-accent bg-ed-elevated border border-ed-accent/40 shadow-sm'
              : 'text-ed-text-muted',
          )}
        >
          <Magnet size={14} />
        </button>

        {/* Nudge Left / Right */}
        {hasSelection && !compact && (
          <div className="flex items-center gap-0.5 ml-1">
            <button
              type="button"
              onClick={() => handleNudge(-1)}
              title="Nudge 1 frame left (Alt+Left)"
              className={ghostIcon}
            >
              <ChevronLeft size={13} />
            </button>
            <button
              type="button"
              onClick={() => handleNudge(1)}
              title="Nudge 1 frame right (Alt+Right)"
              className={ghostIcon}
            >
              <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Center Clip Position & Duration Details (When Clip Selected) */}
      {!compact && selectedClip && (
        <div className="flex items-center gap-2 px-2.5 py-0.5 rounded border border-ed-border bg-ed-elevated/70 text-[10px] font-mono text-ed-text animate-in fade-in select-none">
          <span className="font-semibold text-ed-accent truncate max-w-[110px]" title={selectedClip.name}>
            {selectedClip.name || selectedClip.id}
          </span>
          <span className="text-ed-border">|</span>
          <span title="Start Timecode">Start: {framesToTimecode(selectedClip.startFrame, 30)}</span>
          <span className="text-ed-border">|</span>
          <span title="Duration">Dur: {framesToTimecode(selectedClip.durationFrames, 30)} ({selectedClip.durationFrames}f)</span>
          <span className="text-ed-border">|</span>
          <span title="End Timecode">End: {framesToTimecode(selectedClip.startFrame + selectedClip.durationFrames, 30)}</span>
        </div>
      )}

      {/* Right Zoom & Fit Controls */}
      <div className="flex items-center gap-1.5 justify-end">
        <button
          type="button"
          className={ghostIcon}
          title="Zoom out timeline (-)"
          onClick={() => zoomTo(sliderToZoom(Math.max(0, zoomToSlider(zoom) - 0.08)))}
        >
          <Minus size={14} />
        </button>

        {!compact && (
          <input
            type="range"
            className="elah-range w-24"
            min={0}
            max={1}
            step={0.001}
            value={zoomToSlider(zoom)}
            onChange={(e) => zoomTo(sliderToZoom(Number(e.target.value)))}
            title="Timeline Zoom Slider"
          />
        )}

        <button
          type="button"
          className={ghostIcon}
          title="Zoom in timeline (+)"
          onClick={() => zoomTo(sliderToZoom(Math.min(1, zoomToSlider(zoom) + 0.08)))}
        >
          <Plus size={14} />
        </button>

        <button
          type="button"
          className={ghostBtn}
          onClick={() => timelineRef.current?.fitToWindow()}
          title="Zoom to fit all clips on timeline"
        >
          <Maximize2 size={13} /> {!compact && 'Fit'}
        </button>
      </div>
    </div>
  )
})
