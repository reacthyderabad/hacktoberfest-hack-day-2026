'use client'

import { useState, useCallback } from 'react'
import { Settings, Monitor, RefreshCw, Trash2, Check } from 'lucide-react'
import { useTimelineEngine, useTracksStore, framesToTimecode } from '@elah/editor'
import { useProjectSaveStore } from '../projectSave.store'

export interface ProjectSettingsPanelProps {
  style?: React.CSSProperties
}

const ASPECT_OPTIONS = [
  { label: '16:9 Widescreen', w: 1920, h: 1080, desc: 'YouTube, Desktop, TV' },
  { label: '9:16 Vertical Reel', w: 1080, h: 1920, desc: 'TikTok, Shorts, Reels' },
  { label: '1:1 Square', w: 1080, h: 1080, desc: 'Instagram Feed' },
]

export function ProjectSettingsPanel({ style }: ProjectSettingsPanelProps) {
  const engine = useTimelineEngine()
  const stage = useTracksStore((s) => s.stage)
  const totalFrames = useTracksStore((s) => s.totalFrames)
  const projectName = useProjectSaveStore((s) => s.projectName)
  const setProjectName = useProjectSaveStore((s) => s.setProjectName)
  const [editingName, setEditingName] = useState(projectName)
  const [isSavedName, setIsSavedName] = useState(false)

  const handleSaveName = useCallback(() => {
    const trimmed = editingName.trim() || 'Untitled Project'
    setProjectName(trimmed)
    setIsSavedName(true)
    setTimeout(() => setIsSavedName(false), 2000)
  }, [editingName, setProjectName])

  const handleClearProject = useCallback(() => {
    if (confirm('Are you sure you want to clear all clips from the timeline? This can be undone with Ctrl+Z.')) {
      engine.batch(() => {
        const project = engine.getProject()
        for (const [trackId, clips] of Object.entries(project.clips)) {
          for (const clip of clips) {
            engine.removeClip(clip.id, trackId)
          }
        }
      }, 'Clear Timeline')
    }
  }, [engine])

  const currentRatio = `${stage.width}:${stage.height}`

  return (
    <div style={style} className="flex flex-col h-full bg-ed-bg border-r border-ed-border select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-ed-border bg-ed-bg-2 shrink-0">
        <div>
          <span className="text-[13px] font-semibold text-ed-text tracking-[-0.01em]">Project Settings</span>
        </div>
      </div>

      <div className="p-3.5 flex flex-col gap-4 flex-1 overflow-y-auto">
        {/* Project Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-ed-text-muted">Project Name</label>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              className="flex-1 px-2.5 py-1.5 rounded border border-ed-border bg-ed-bg text-xs text-ed-text outline-none focus:border-ed-accent"
            />
            <button
              type="button"
              onClick={handleSaveName}
              className="px-2.5 py-1.5 rounded bg-ed-elevated border border-ed-border text-xs text-ed-text hover:bg-ed-highest transition-colors flex items-center gap-1 font-medium"
            >
              {isSavedName ? <Check size={13} className="text-green-400" /> : 'Save'}
            </button>
          </div>
        </div>

        {/* Aspect Ratio & Resolution */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-ed-text-muted">Stage Aspect Ratio</label>
          <div className="flex flex-col gap-1.5">
            {ASPECT_OPTIONS.map((opt) => {
              const active = Math.abs(stage.width / stage.height - opt.w / opt.h) < 0.01
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => engine.setStage(opt.w, opt.h)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    active
                      ? 'border-ed-accent bg-ed-elevated text-ed-text'
                      : 'border-ed-border bg-ed-bg text-ed-text-muted hover:border-ed-border-subtle hover:text-ed-text'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{opt.label}</span>
                    <span className="text-[10px] font-mono opacity-80">{opt.w}×{opt.h}</span>
                  </div>
                  <span className="text-[10px] block opacity-70 mt-0.5">{opt.desc}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Technical Specs */}
        <div className="p-3 rounded-lg border border-ed-border bg-ed-bg-2/50 flex flex-col gap-2">
          <span className="text-xs font-medium text-ed-text flex items-center gap-1.5">
            <Monitor size={13} className="text-ed-accent" /> Timeline Metrics
          </span>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-ed-text-muted block">Frame Rate:</span>
              <span className="font-mono text-ed-text font-medium">30.00 FPS</span>
            </div>
            <div>
              <span className="text-ed-text-muted block">Total Duration:</span>
              <span className="font-mono text-ed-text font-medium">
                {framesToTimecode(Math.max(totalFrames, 1), 30)}
              </span>
            </div>
          </div>
        </div>

        {/* Reset project */}
        <div className="mt-auto pt-4 border-t border-ed-border">
          <button
            type="button"
            onClick={handleClearProject}
            className="w-full py-2 px-3 rounded border border-red-500/30 hover:border-red-500/60 bg-red-500/10 text-red-400 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
          >
            <Trash2 size={13} /> Clear Timeline Clips
          </button>
        </div>
      </div>
    </div>
  )
}
