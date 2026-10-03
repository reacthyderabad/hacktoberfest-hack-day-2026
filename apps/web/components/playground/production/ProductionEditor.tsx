'use client'

import posthog from 'posthog-js'
import { memo, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { usePathname } from 'next/navigation'
import {
  Sparkles,
  Film,
  Music,
  LayoutTemplate,
  Captions,
  Shuffle,
  Settings,
  Upload,
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Undo2,
  Redo2,
  Maximize2,
  ChevronDown,
  Check,
  Download,
  Code2,
  X,
  GripVertical,
  GripHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  SlidersHorizontal,
  Plus,
} from 'lucide-react'

import { ClipProperties } from './properties/ClipProperties'
import { TimelineControls } from '../shared/TimelineControls'
import { ProductionCodePanel } from './ProductionCodePanel'
import { ExportModal } from './ExportModal'
import { MediaLibraryPanel } from './panels/MediaLibraryPanel'
import { TemplatesPanel } from './panels/TemplatesPanel'
import { SubtitlesPanel } from './panels/SubtitlesPanel'
import { AudioPanel } from './panels/AudioPanel'
import { TransitionsPanel } from './panels/TransitionsPanel'
import { ProjectSettingsPanel } from './panels/ProjectSettingsPanel'
import { AiAssistantPanel } from './ai/AiAssistantPanel'
import { LocalProjectBridge } from './LocalProjectBridge'
import { ProjectMediaNotice } from './ProjectSaveChrome'
import { useProjectSaveStore } from './projectSave.store'
import {
  editorPanelToggleLabel,
  readEditorPanelCollapsed,
  writeEditorPanelCollapsed,
} from '@/lib/editor/panelCollapse'
import { cn } from '@/lib/utils'
import {
  EditorProvider,
  Preview,
  Timeline,
  createDefaultDemuxerFactory,
  useTracksStore,
  usePlaybackStore,
  useSelectionStore,
  useTimelineEngine,
  framesToTimecode,
  importFiles,
  type InitialTrackConfig,
  type TimelineRef,
  type ExportVideoCodec,
  type ExportAudioCodec,
} from '@elah/editor'

const FPS = 30
const MOBILE_QUERY = '(max-width: 767px)'

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    setIsMobile(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isMobile
}

type SidebarTab = 'media' | 'templates' | 'subtitles' | 'audio' | 'transitions' | 'settings'

const SIDEBAR_ITEMS: {
  id: SidebarTab
  label: string
  Icon: typeof Film
}[] = [
  { id: 'media', label: 'Media', Icon: Film },
  { id: 'templates', label: 'Templates', Icon: LayoutTemplate },
  { id: 'subtitles', label: 'Subtitles', Icon: Captions },
  { id: 'audio', label: 'Audio', Icon: Music },
  { id: 'transitions', label: 'Transitions', Icon: Shuffle },
  { id: 'settings', label: 'Settings', Icon: Settings },
]

const INITIAL_TRACKS: InitialTrackConfig[] = [
  { kind: 'elements', name: 'Text & Titles' },
  { kind: 'video', name: 'Main Video' },
  { kind: 'audio', name: 'Background Audio' },
]

const toolbarBtnCls =
  'px-3 py-1.5 bg-ed-elevated text-ed-text-muted border border-ed-border rounded-md text-xs cursor-pointer font-sans transition-colors hover:text-ed-text hover:bg-ed-highest'

const ASPECTS = [
  { label: '16:9', w: 1920, h: 1080, gw: 14, gh: 8 },
  { label: '9:16', w: 1080, h: 1920, gw: 8, gh: 14 },
  { label: '1:1', w: 1080, h: 1080, gw: 11, gh: 11 },
] as const

/** Top Navigation Header */
const TopNavigation = memo(function TopNavigation({
  onExport,
  onToggleCode,
  codeOpen,
}: {
  onExport: () => void
  onToggleCode: () => void
  codeOpen: boolean
}) {
  const engine = useTimelineEngine()
  const canUndo = useTracksStore((s) => s.canUndo)
  const canRedo = useTracksStore((s) => s.canRedo)
  const stage = useTracksStore((s) => s.stage)
  const projectName = useProjectSaveStore((s) => s.projectName)
  const setProjectName = useProjectSaveStore((s) => s.setProjectName)
  const saveStatus = useProjectSaveStore((s) => s.saveStatus)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState(projectName)
  const isMobile = useIsMobile()

  useEffect(() => {
    setTitleInput(projectName)
  }, [projectName])

  const handleFinishEditingTitle = () => {
    const trimmed = titleInput.trim() || 'Untitled Project'
    setProjectName(trimmed)
    setIsEditingTitle(false)
  }

  const currentAspect = ASPECTS.find(
    (a) => Math.abs(stage.width / stage.height - a.w / a.h) < 0.01,
  )

  return (
    <header className="grid grid-cols-[auto_1fr_auto] items-center px-4 h-[48px] bg-ed-bg-2 border-b border-ed-border shrink-0 select-none z-30">
      {/* Left: Brand + Project Title + Save Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span
            className="flex items-center justify-center w-7 h-7 rounded-lg text-black font-black text-xs"
            style={{
              background: 'linear-gradient(135deg, var(--elah-accent) 0%, #a855f7 100%)',
              boxShadow: '0 0 12px var(--elah-accent-glow)',
            }}
          >
            <Sparkles size={15} />
          </span>
          <span className="text-[13px] font-bold text-ed-text tracking-tight flex items-center gap-1.5">
            Elah Studio AI
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-ed-elevated border border-ed-border font-mono text-ed-accent font-semibold">
              PRO
            </span>
          </span>
        </div>

        {!isMobile && (
          <>
            <div className="w-px h-4 bg-ed-border shrink-0 mx-1" />

            {/* Editable Project Name */}
            {isEditingTitle ? (
              <input
                type="text"
                value={titleInput}
                autoFocus
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={handleFinishEditingTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFinishEditingTitle()
                  if (e.key === 'Escape') setIsEditingTitle(false)
                }}
                className="px-2 py-0.5 rounded border border-ed-accent bg-ed-bg text-xs text-ed-text outline-none font-medium w-36"
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingTitle(true)}
                title="Click to rename project"
                className="text-xs text-ed-text hover:text-ed-accent transition-colors font-medium truncate max-w-[160px]"
              >
                {projectName}
              </button>
            )}

            {/* Save Status Badge */}
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-ed-text-muted">
              {saveStatus === 'saving' ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Saving...
                </>
              ) : saveStatus === 'dirty' ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Unsaved changes
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Saved to browser
                </>
              )}
            </span>
          </>
        )}
      </div>

      {/* Center: Undo/Redo & Aspect Selector */}
      <div className="flex items-center justify-center gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={cn(toolbarBtnCls, 'inline-flex items-center justify-center p-1.5', !canUndo && 'opacity-40 cursor-not-allowed')}
            disabled={!canUndo}
            onClick={() => engine.undo()}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={14} />
          </button>
          <button
            type="button"
            className={cn(toolbarBtnCls, 'inline-flex items-center justify-center p-1.5', !canRedo && 'opacity-40 cursor-not-allowed')}
            disabled={!canRedo}
            onClick={() => engine.redo()}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={14} />
          </button>
        </div>

        {!isMobile && (
          <div className="flex items-center gap-1 ml-2">
            {ASPECTS.map((a) => {
              const active = Math.abs(stage.width / stage.height - a.w / a.h) < 0.01
              return (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => engine.setStage(a.w, a.h)}
                  className={cn(
                    'px-2.5 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1',
                    active
                      ? 'bg-ed-elevated text-ed-text border border-ed-border'
                      : 'text-ed-text-muted hover:text-ed-text',
                  )}
                >
                  <span
                    style={{
                      width: a.gw * 0.7,
                      height: a.gh * 0.7,
                      borderRadius: 1,
                      background: 'currentColor',
                    }}
                  />
                  {a.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Right: Code & Export Actions */}
      <div className="flex items-center gap-1.5 justify-end">
        {!isMobile && (
          <button
            type="button"
            onClick={onToggleCode}
            className={cn(toolbarBtnCls, 'inline-flex items-center gap-1.5', codeOpen && 'text-ed-text border-ed-accent')}
            title="Show Code"
          >
            <Code2 size={14} /> Code
          </button>
        )}

        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md font-sans cursor-pointer transition-colors shadow-sm"
          style={{
            background: 'var(--elah-accent)',
            color: '#04202a',
            boxShadow: '0 0 10px var(--elah-accent-glow)',
          }}
          title="Export MP4 video"
        >
          <Download size={14} /> Export MP4
        </button>
      </div>
    </header>
  )
})

/** Center Video Transport & Timecode Controls */
const CenterTransportBar = memo(function CenterTransportBar() {
  const engine = useTimelineEngine()
  const isPlaying = usePlaybackStore((s) => s.isPlaying)
  const togglePlayPause = usePlaybackStore((s) => s.togglePlayPause)
  const currentFrame = usePlaybackStore((s) => s.currentFrame)
  const totalFrames = useTracksStore((s) => s.totalFrames)
  const isMobile = useIsMobile()

  const handleStop = useCallback(() => {
    usePlaybackStore.getState().pause()
    usePlaybackStore.getState().setCurrentFrame(0)
  }, [])

  const handleSeekOffset = useCallback(
    (seconds: number) => {
      const state = usePlaybackStore.getState()
      const next = Math.max(0, state.currentFrame + Math.round(seconds * FPS))
      state.setCurrentFrame(next)
    },
    [],
  )

  const handleJumpToStart = useCallback(() => {
    usePlaybackStore.getState().setCurrentFrame(0)
  }, [])

  const handleJumpToEnd = useCallback(() => {
    usePlaybackStore.getState().setCurrentFrame(Math.max(totalFrames - 1, 0))
  }, [totalFrames])

  const iconBtn =
    'flex items-center justify-center w-7 h-7 rounded text-ed-text-muted hover:text-ed-text hover:bg-ed-elevated transition-colors cursor-pointer'

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center h-11 px-4 bg-ed-bg-2 border-t border-ed-border shrink-0 select-none">
      {/* Left: Timecode Display */}
      <span className="font-mono text-[11px] tracking-[0.02em] tabular-nums whitespace-nowrap">
        <span style={{ color: 'var(--elah-accent)' }}>
          {framesToTimecode(currentFrame, FPS)}
        </span>
        <span className="text-ed-text-muted mx-1.5">/</span>
        <span className="text-ed-text-muted">
          {framesToTimecode(Math.max(totalFrames, 1), FPS)}
        </span>
      </span>

      {/* Center: Playback Transport Buttons */}
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={handleJumpToStart} title="Jump to start (Home)" className={iconBtn}>
          <SkipBack size={13} />
        </button>
        <button type="button" onClick={() => handleSeekOffset(-1)} title="Back 1s" className={iconBtn}>
          <RotateCcw size={13} />
        </button>
        <button
          type="button"
          onClick={togglePlayPause}
          title="Play / Pause (Space)"
          className="inline-flex items-center justify-center w-9 h-9 mx-1 rounded-full bg-white text-black hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
        >
          {isPlaying ? (
            <Pause size={15} fill="currentColor" />
          ) : (
            <Play size={15} fill="currentColor" className="ml-0.5" />
          )}
        </button>
        <button type="button" onClick={() => handleSeekOffset(1)} title="Forward 1s" className={iconBtn}>
          <RotateCw size={13} />
        </button>
        <button type="button" onClick={handleJumpToEnd} title="Jump to end (End)" className={iconBtn}>
          <SkipForward size={13} />
        </button>
        <button type="button" onClick={handleStop} title="Stop" className={iconBtn}>
          <Square size={12} fill="currentColor" />
        </button>
      </div>

      {/* Right: Empty spacer / Aspect indicator */}
      <div className="flex items-center justify-end text-[11px] font-mono text-ed-text-muted">
        <span>{FPS} FPS</span>
      </div>
    </div>
  )
})

function ProductionEditorInner() {
  const timelineRef = useRef<TimelineRef>(null)
  const demuxerFactoryRef = useRef(createDefaultDemuxerFactory())
  const previewBoxRef = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<HTMLDivElement>(null)

  const [showExportModal, setShowExportModal] = useState(false)
  const [showCode, setShowCode] = useState(false)
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('media')
  const [rightSidebarTab, setRightSidebarTab] = useState<'ai' | 'inspector'>('ai')
  const isMobile = useIsMobile()

  // Track clips state to show empty state when timeline has no clips
  const allClipsMap = useTracksStore((s) => s.clips)
  const tracks = useTracksStore((s) => s.tracks)
  const engine = useTimelineEngine()
  const totalClipsCount = Object.values(allClipsMap).reduce((acc, list) => acc + list.length, 0)
  const hasSelectedClip = useSelectionStore((s) => s.selectedClipIds.size > 0)

  // Switch to inspector automatically when user selects a clip
  useEffect(() => {
    if (hasSelectedClip) {
      // Keep right sidebar accessible
    }
  }, [hasSelectedClip])

  // Collapsible panels
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false)
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false)

  // Panel resizing
  const TIMELINE_MIN = 130
  const [timelineHeight, setTimelineHeight] = useState(200)
  const [isResizingTimeline, setIsResizingTimeline] = useState(false)

  const PANEL_MIN = 260
  const [panelWidth, setPanelWidth] = useState(290)
  const [isResizingPanel, setIsResizingPanel] = useState(false)

  const RIGHT_PANEL_MIN = 280
  const [rightPanelWidth, setRightPanelWidth] = useState(320)
  const [isResizingRight, setIsResizingRight] = useState(false)

  const runResize = useCallback(
    (
      cssVar: string,
      valueAt: (ev: PointerEvent) => number,
      commit: (value: number) => void,
      setDragging: (dragging: boolean) => void,
      cursor: string,
    ) => {
      let latest: number | null = null
      setDragging(true)

      const onMove = (ev: PointerEvent) => {
        latest = valueAt(ev)
        workspaceRef.current?.style.setProperty(cssVar, `${latest}px`)
      }
      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        document.body.style.userSelect = ''
        document.body.style.cursor = ''
        setDragging(false)
        if (latest !== null) commit(latest)
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      document.body.style.userSelect = 'none'
      document.body.style.cursor = cursor
    },
    [],
  )

  const startTimelineResize = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      const startY = e.clientY
      const startH = timelineHeight
      const maxH = (workspaceRef.current?.clientHeight ?? 800) - 150
      runResize(
        '--elah-timeline-h',
        (ev) => {
          const next = startH + (startY - ev.clientY)
          return Math.min(Math.max(next, TIMELINE_MIN), Math.max(maxH, TIMELINE_MIN))
        },
        setTimelineHeight,
        setIsResizingTimeline,
        'ns-resize',
      )
    },
    [timelineHeight, runResize],
  )

  const startLeftResize = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      const startX = e.clientX
      const startW = panelWidth
      runResize(
        '--elah-left-w',
        (ev) => {
          const next = startW + (ev.clientX - startX)
          return Math.min(Math.max(next, PANEL_MIN), 520)
        },
        setPanelWidth,
        setIsResizingPanel,
        'col-resize',
      )
    },
    [panelWidth, runResize],
  )

  const startRightResize = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      const startX = e.clientX
      const startW = rightPanelWidth
      runResize(
        '--elah-right-w',
        (ev) => {
          const next = startW + (startX - ev.clientX)
          return Math.min(Math.max(next, RIGHT_PANEL_MIN), 540)
        },
        setRightPanelWidth,
        setIsResizingRight,
        'col-resize',
      )
    },
    [rightPanelWidth, runResize],
  )

  // Quick Action: Load Sample Video
  const handleLoadSampleVideo = useCallback(async () => {
    try {
      const res = await fetch('/assets/scene-1.mp4')
      const blob = await res.blob()
      const file = new File([blob], 'demo-sample-video.mp4', { type: 'video/mp4' })
      const importRes = await importFiles([file])
      if (importRes.imported[0]) {
        const vTrack = tracks.find((t) => t.kind === 'video') || tracks[0]
        engine.addClip({
          type: 'video',
          trackId: vTrack.id,
          startFrame: 0,
          durationFrames: 150, // 5 seconds at 30fps
          src: importRes.imported[0].src,
          name: 'demo-sample-video.mp4',
        })
      }
    } catch (err) {
      console.error('Failed to load sample video:', err)
    }
  }, [engine, tracks])

  const handleExportStart = useCallback(
    async (opts: {
      videoBitrate: number
      outputHeight: number
      videoCodec: ExportVideoCodec
      audioCodec: ExportAudioCodec
      signal: AbortSignal
      onProgress: (frame: number, totalFrames: number) => void
    }) => {
      const e = timelineRef.current?.engine
      if (!e) throw new Error('Editor is not ready yet.')
      usePlaybackStore.getState().pause()
      const project = e.getProject()
      const { lazyExportVideo } = await import('@elah/editor')
      const blob = await lazyExportVideo(project, {
        videoBitrate: opts.videoBitrate,
        outputHeight: opts.outputHeight,
        videoCodec: opts.videoCodec,
        audioCodec: opts.audioCodec,
        signal: opts.signal,
        onProgress: ({ frame, totalFrames }) => opts.onProgress(frame, totalFrames),
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'elah-studio-export.mp4'
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    },
    [],
  )

  return (
      <div className="elah-root flex flex-col h-full bg-ed-bg text-ed-text select-none overflow-hidden font-sans">
        {/* 1. Top Navigation */}
        <TopNavigation
          onExport={() => setShowExportModal(true)}
          onToggleCode={() => setShowCode((o) => !o)}
          codeOpen={showCode}
        />

        <LocalProjectBridge />
        <ProjectMediaNotice />

        {showExportModal && (
          <ExportModal
            isMobile={isMobile}
            onClose={() => setShowExportModal(false)}
            onExport={handleExportStart}
          />
        )}

        <ProductionCodePanel open={showCode} onClose={() => setShowCode(false)} />

        {/* Main Workspace Area (Left Sidebar + Center Preview + Right Sidebar) */}
        <div
          ref={workspaceRef}
          className="flex flex-col flex-1 min-h-0"
          style={
            {
              '--elah-left-w': `${panelWidth}px`,
              '--elah-right-w': `${rightPanelWidth}px`,
              '--elah-timeline-h': `${timelineHeight}px`,
            } as CSSProperties
          }
        >
          <div className="flex flex-1 min-h-0">
            {/* 2. Left Icon Rail */}
            <div className="w-[64px] shrink-0 flex flex-col items-center gap-1 py-2.5 border-r border-ed-border bg-ed-bg-2">
              {SIDEBAR_ITEMS.map(({ id, label, Icon }) => {
                const isActive = activeSidebarTab === id && !leftPanelCollapsed
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setActiveSidebarTab(id)
                      if (leftPanelCollapsed) setLeftPanelCollapsed(false)
                    }}
                    title={label}
                    className="w-full flex flex-col items-center gap-1 py-1.5 cursor-pointer group"
                  >
                    <span
                      className={cn(
                        'flex items-center justify-center w-10 h-10 rounded-xl transition-all',
                        isActive
                          ? 'bg-ed-accent text-ed-accent-text shadow-sm'
                          : 'text-ed-text-muted hover:text-ed-text hover:bg-ed-elevated',
                      )}
                    >
                      <Icon size={18} />
                    </span>
                    <span
                      className={cn(
                        'text-[10px] leading-tight font-medium',
                        isActive ? 'text-ed-text font-semibold' : 'text-ed-text-muted group-hover:text-ed-text',
                      )}
                    >
                      {label}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Left Content Panel */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: leftPanelCollapsed ? 0 : 'var(--elah-left-w)',
                flexShrink: 0,
                minHeight: 0,
                overflow: 'hidden',
              }}
              className={cn(!isResizingPanel && 'transition-[width] duration-200')}
            >
              <div
                style={{
                  width: 'var(--elah-left-w)',
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {activeSidebarTab === 'media' ? (
                  <MediaLibraryPanel style={{ flex: 1, minHeight: 0 }} />
                ) : activeSidebarTab === 'templates' ? (
                  <TemplatesPanel style={{ flex: 1, minHeight: 0 }} />
                ) : activeSidebarTab === 'subtitles' ? (
                  <SubtitlesPanel style={{ flex: 1, minHeight: 0 }} />
                ) : activeSidebarTab === 'audio' ? (
                  <AudioPanel style={{ flex: 1, minHeight: 0 }} />
                ) : activeSidebarTab === 'transitions' ? (
                  <TransitionsPanel style={{ flex: 1, minHeight: 0 }} />
                ) : (
                  <ProjectSettingsPanel style={{ flex: 1, minHeight: 0 }} />
                )}
              </div>
            </div>

            {/* Left Panel Resize Handle */}
            <div
              onPointerDown={startLeftResize}
              role="separator"
              aria-orientation="vertical"
              title="Drag to resize panel"
              className={cn(
                'group relative shrink-0 w-[5px] -mr-[2px] flex items-center justify-center cursor-col-resize z-10',
                leftPanelCollapsed && 'hidden',
              )}
            >
              <span
                className={cn(
                  'pointer-events-none h-full w-px transition-colors',
                  isResizingPanel ? 'bg-ed-accent' : 'bg-ed-border group-hover:bg-ed-accent',
                )}
              />
              <span className="pointer-events-none absolute flex h-7 w-[12px] items-center justify-center rounded-full border border-ed-border bg-ed-elevated text-ed-text-muted group-hover:border-ed-accent group-hover:text-ed-accent">
                <GripVertical size={10} />
              </span>
            </div>

            {/* 3. Center Workspace: Large Video Preview & Transport */}
            <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-black">
              {/* Top bar with panel collapse toggles */}
              <div className="h-8 px-2 flex items-center justify-between border-b border-ed-border/40 bg-ed-bg shrink-0">
                <button
                  type="button"
                  onClick={() => setLeftPanelCollapsed((v) => !v)}
                  title={leftPanelCollapsed ? 'Open Left Panel' : 'Collapse Left Panel'}
                  className="flex items-center gap-1 text-[11px] text-ed-text-muted hover:text-ed-text transition-colors px-1.5 py-0.5 rounded hover:bg-ed-elevated"
                >
                  {leftPanelCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
                  <span>{leftPanelCollapsed ? 'Show Sidebar' : 'Hide'}</span>
                </button>

                <span className="text-[11px] font-mono text-ed-text-muted">
                  Stage Preview (WebGL2)
                </span>

                <button
                  type="button"
                  onClick={() => setRightPanelCollapsed((v) => !v)}
                  title={rightPanelCollapsed ? 'Open Right Panel' : 'Collapse Right Panel'}
                  className="flex items-center gap-1 text-[11px] text-ed-text-muted hover:text-ed-text transition-colors px-1.5 py-0.5 rounded hover:bg-ed-elevated"
                >
                  <span>{rightPanelCollapsed ? 'Show AI Studio' : 'Hide'}</span>
                  {rightPanelCollapsed ? <PanelRightOpen size={14} /> : <PanelRightClose size={14} />}
                </button>
              </div>

              {/* Large Video Preview Container */}
              <div ref={previewBoxRef} className="flex-1 min-h-0 relative bg-black flex items-center justify-center p-3">
                <Preview
                  demuxerFactory={demuxerFactoryRef.current}
                  style={{ width: '100%', height: '100%' }}
                />

                {/* Empty State when no media is loaded */}
                {totalClipsCount === 0 && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-black/85 backdrop-blur-[2px] pointer-events-auto">
                    <div className="max-w-md w-full p-6 rounded-2xl border border-ed-border bg-ed-bg-2/95 shadow-2xl flex flex-col items-center text-center">
                      <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-ed-accent/15 text-ed-accent mb-3">
                        <Film size={24} />
                      </div>
                      <h3 className="text-base font-bold text-ed-text">Timeline is empty</h3>
                      <p className="text-xs text-ed-text-muted mt-1.5 leading-relaxed max-w-sm">
                        Upload media or drag clips from the Media library to begin editing, or ask the AI Assistant on the right.
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2 mt-4 w-full">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSidebarTab('media')
                            setLeftPanelCollapsed(false)
                          }}
                          className="px-3.5 py-1.5 rounded-lg border border-ed-border bg-ed-elevated hover:bg-ed-highest text-ed-text text-xs font-medium transition-colors flex items-center gap-1.5"
                        >
                          <Upload size={14} /> Upload Media
                        </button>
                        <button
                          type="button"
                          onClick={handleLoadSampleVideo}
                          className="px-3.5 py-1.5 rounded-lg bg-ed-accent text-ed-accent-text hover:opacity-90 text-xs font-semibold transition-opacity flex items-center gap-1.5 shadow-sm"
                        >
                          <Sparkles size={14} /> Load Sample Video
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Playback Controls & Timecode */}
              <CenterTransportBar />
            </div>

            {/* Right Panel Resize Handle */}
            <div
              onPointerDown={startRightResize}
              role="separator"
              aria-orientation="vertical"
              title="Drag to resize panel"
              className={cn(
                'group relative shrink-0 w-[5px] -ml-[2px] flex items-center justify-center cursor-col-resize z-10',
                rightPanelCollapsed && 'hidden',
              )}
            >
              <span
                className={cn(
                  'pointer-events-none h-full w-px transition-colors',
                  isResizingRight ? 'bg-ed-accent' : 'bg-ed-border group-hover:bg-ed-accent',
                )}
              />
              <span className="pointer-events-none absolute flex h-7 w-[12px] items-center justify-center rounded-full border border-ed-border bg-ed-elevated text-ed-text-muted group-hover:border-ed-accent group-hover:text-ed-accent">
                <GripVertical size={10} />
              </span>
            </div>

            {/* 4. Right Sidebar: AI Assistant & Clip Properties */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: rightPanelCollapsed ? 0 : 'var(--elah-right-w)',
                flexShrink: 0,
                minHeight: 0,
                overflow: 'hidden',
                background: 'var(--elah-bg-panel)',
                borderLeft: '1px solid var(--elah-border)',
              }}
              className={cn(!isResizingRight && 'transition-[width] duration-200')}
            >
              <div
                style={{
                  width: 'var(--elah-right-w)',
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Right Tabs Switcher */}
                <div className="flex items-center border-b border-ed-border bg-ed-bg-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setRightSidebarTab('ai')}
                    className={cn(
                      'flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border-b-2',
                      rightSidebarTab === 'ai'
                        ? 'border-ed-accent text-ed-text bg-ed-elevated/40'
                        : 'border-transparent text-ed-text-muted hover:text-ed-text',
                    )}
                  >
                    <Sparkles size={13} className={rightSidebarTab === 'ai' ? 'text-ed-accent' : ''} />
                    AI Assistant
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightSidebarTab('inspector')}
                    className={cn(
                      'flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border-b-2',
                      rightSidebarTab === 'inspector'
                        ? 'border-ed-accent text-ed-text bg-ed-elevated/40'
                        : 'border-transparent text-ed-text-muted hover:text-ed-text',
                    )}
                  >
                    <SlidersHorizontal size={13} />
                    Properties {hasSelectedClip && '•'}
                  </button>
                </div>

                {/* Right Panel Content */}
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                  {rightSidebarTab === 'ai' ? (
                    <AiAssistantPanel timelineRef={timelineRef} style={{ flex: 1, minHeight: 0 }} />
                  ) : (
                    <div className="flex-1 min-h-0 overflow-y-auto [&>div]:w-full [&>div]:border-l-0">
                      <ClipProperties />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Timeline Resize Handle */}
          <div
            onPointerDown={startTimelineResize}
            role="separator"
            aria-orientation="horizontal"
            title="Drag to resize timeline"
            className="group relative shrink-0 h-[5px] -mb-[2px] flex items-center justify-center cursor-ns-resize z-20"
          >
            <span
              className={cn(
                'pointer-events-none w-full h-px transition-colors',
                isResizingTimeline ? 'bg-ed-accent' : 'bg-ed-border group-hover:bg-ed-accent',
              )}
            />
            <span className="pointer-events-none absolute flex w-7 h-[12px] items-center justify-center rounded-full border border-ed-border bg-ed-elevated text-ed-text-muted group-hover:border-ed-accent group-hover:text-ed-accent">
              <GripHorizontal size={10} />
            </span>
          </div>

          {/* 5. Bottom Workspace: Multitrack Timeline Area */}
          <div className="relative flex flex-col min-h-0 shrink-0 bg-ed-bg-2 border-t border-ed-border">
            <TimelineControls timelineRef={timelineRef} compact={isMobile} />

            <Timeline
              ref={timelineRef}
              fps={FPS}
              sidebarWidth={isMobile ? 54 : 190}
              compactSidebar={isMobile}
              style={{
                height: isMobile ? 160 : 'var(--elah-timeline-h)',
                flexShrink: 0,
                minWidth: 0,
              }}
            />
        </div>
      </div>
    </div>
  )
}

export default function ProductionEditor() {
  return (
    <EditorProvider
      fps={FPS}
      defaultTrackHeight={38}
      initialTracks={INITIAL_TRACKS}
      stage={{ width: 1920, height: 1080 }}
    >
      <ProductionEditorInner />
    </EditorProvider>
  )
}
