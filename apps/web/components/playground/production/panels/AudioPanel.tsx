'use client'

import { useCallback, useRef, useState } from 'react'
import { Music, Plus, Volume2, Sparkles, Play, Pause } from 'lucide-react'
import {
  useTimelineEngine,
  useTracksStore,
  usePlaybackStore,
  importFiles,
  useMediaLibraryStore,
} from '@elah/editor'

export interface AudioPanelProps {
  style?: React.CSSProperties
}

interface AudioTrackSample {
  id: string
  name: string
  genre: string
  durationSec: number
  src: string
}

const SAMPLE_TRACKS: AudioTrackSample[] = [
  {
    id: 'cinematic-bed',
    name: 'Cinematic Ambient Pulse',
    genre: 'Cinematic',
    durationSec: 32,
    src: '/assets/audio.mp3',
  },
]

export function AudioPanel({ style }: AudioPanelProps) {
  const engine = useTimelineEngine()
  const tracks = useTracksStore((s) => s.tracks)
  const currentFrame = usePlaybackStore((s) => s.currentFrame)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null)

  const handleTogglePreview = useCallback((src: string, id: string) => {
    if (playingId === id) {
      audioPreviewRef.current?.pause()
      setPlayingId(null)
    } else {
      if (!audioPreviewRef.current) {
        audioPreviewRef.current = new Audio()
      }
      audioPreviewRef.current.src = src
      void audioPreviewRef.current.play()
      audioPreviewRef.current.onended = () => setPlayingId(null)
      setPlayingId(id)
    }
  }, [playingId])

  const handleAddTrackToTimeline = useCallback(
    async (sample: AudioTrackSample) => {
      let audioTrack = tracks.find((tr) => tr.kind === 'audio')
      if (!audioTrack) {
        audioTrack = engine.addTrack('audio', { name: 'Audio Track' })
      }

      const fps = 30
      const durationFrames = Math.round(sample.durationSec * fps)

      engine.addClip({
        type: 'audio',
        trackId: audioTrack.id,
        startFrame: currentFrame,
        durationFrames,
        src: sample.src,
        name: sample.name,
        volume: 0.8,
      })
    },
    [engine, tracks, currentFrame],
  )

  const handleUploadAudio = useCallback(async (files: FileList | null) => {
    if (!files?.length) return
    const res = await importFiles(files)
    if (res.imported.length > 0) {
      const first = res.imported[0]
      let audioTrack = tracks.find((tr) => tr.kind === 'audio')
      if (!audioTrack) {
        audioTrack = engine.addTrack('audio', { name: 'Audio Track' })
      }
      const fps = 30
      const dur = first.durationSec ? Math.round(first.durationSec * fps) : 300

      engine.addClip({
        type: 'audio',
        trackId: audioTrack.id,
        startFrame: currentFrame,
        durationFrames: dur,
        src: first.src,
        name: first.name,
        volume: 0.8,
      })
    }
  }, [engine, tracks, currentFrame])

  return (
    <div style={style} className="flex flex-col h-full bg-ed-bg border-r border-ed-border select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-ed-border bg-ed-bg-2 shrink-0">
        <div>
          <span className="text-[13px] font-semibold text-ed-text tracking-[-0.01em]">Audio & Music</span>
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-ed-accent text-ed-accent-text hover:opacity-90 transition-opacity"
        >
          <Plus size={14} /> Upload Audio
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => void handleUploadAudio(e.target.files)}
        />
      </div>

      <div className="p-3 text-[11px] text-ed-text-muted border-b border-ed-border bg-ed-bg-2/40">
        Click "+ Timeline" to add audio soundtrack or sound effects to an audio lane.
      </div>

      {/* Tracks list */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-2">
        {SAMPLE_TRACKS.map((track) => (
          <div
            key={track.id}
            className="p-3 rounded-lg border border-ed-border bg-ed-elevated hover:border-ed-accent/50 flex flex-col gap-2 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTogglePreview(track.src, track.id)}
                  className="w-7 h-7 rounded-full bg-ed-bg-2 border border-ed-border flex items-center justify-center text-ed-text hover:bg-ed-highest transition-colors"
                >
                  {playingId === track.id ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
                </button>
                <div>
                  <span className="text-xs font-semibold text-ed-text block">{track.name}</span>
                  <span className="text-[10px] text-ed-text-muted font-mono">{track.genre} • {track.durationSec}s</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-1.5 pt-1 border-t border-ed-border/40">
              <button
                type="button"
                onClick={() => void handleAddTrackToTimeline(track)}
                className="px-2.5 py-1 rounded bg-ed-bg-2 border border-ed-border hover:bg-ed-highest text-ed-text text-[11px] font-medium transition-colors flex items-center gap-1"
              >
                <Plus size={12} /> Add to Timeline
              </button>
            </div>
          </div>
        ))}

        <div className="mt-4 p-3 rounded-lg border border-ed-border bg-ed-bg-2/40 flex flex-col gap-2">
          <span className="text-xs font-medium text-ed-text flex items-center gap-1.5">
            <Volume2 size={13} className="text-ed-accent" /> Custom Soundtracks
          </span>
          <p className="text-[11px] text-ed-text-muted">
            Upload MP3 or WAV files from your computer to layer voiceover narration, background beats, and sound effects.
          </p>
        </div>
      </div>
    </div>
  )
}
