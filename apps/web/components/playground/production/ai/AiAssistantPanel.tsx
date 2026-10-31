'use client'

import { useState, useCallback, useRef, useEffect, useMemo, type KeyboardEvent } from 'react'
import {
  Sparkles,
  Send,
  Check,
  X,
  Undo2,
  AlertCircle,
  Scissors,
  Type,
  Shuffle,
  Monitor,
  Split,
  Move,
  VolumeX,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  RotateCcw,
  RefreshCw,
  Film,
  Eye,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react'
import {
  useTimelineEngine,
  useTracksStore,
  usePlaybackStore,
  useSelectionStore,
  framesToTimecode,
  type TimelineRef,
} from '@elah/editor'
import type {
  StudioEditPlan,
  StudioEditAction,
  StudioActionType,
  ConvMessage,
  ApiHistoryEntry,
  TimelineContextSnapshot,
} from '@/lib/ai/studioTypes'
import { generateLocalEditPlan, applyStudioEditPlan, validateEditPlan } from '@/lib/ai/studioPlanner'
import { cn } from '@/lib/utils'

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_HISTORY = 10
const FPS = 30

const QUICK_PROMPTS = [
  { emoji: '🎬', label: 'Make 30s Reel', prompt: 'Make this into a 30-second Instagram reel with smooth transitions' },
  { emoji: '✂️', label: 'Trim Intro', prompt: 'Remove the first 10 seconds from the video' },
  { emoji: '📌', label: 'Move Clip', prompt: 'Move the second clip to the beginning' },
  { emoji: '🌅', label: 'Fade Transition', prompt: 'Add a fade transition between the clips' },
  { emoji: '🅣', label: 'Add Title', prompt: 'Add a title overlay at the beginning of the video' },
  { emoji: '📱', label: 'Make Vertical', prompt: 'Convert canvas to 9:16 vertical for Instagram Reels' },
  { emoji: '⚡', label: 'Speed Up 2×', prompt: 'Speed up the main clip to 2x' },
  { emoji: '📝', label: 'Add Subtitle', prompt: 'Add a subtitle "Welcome to Elah Studio AI" at the start' },
]

// ─── Action Type Metadata ─────────────────────────────────────────────────────

type IconType = typeof Scissors

const ACTION_META: Record<StudioActionType, { label: string; color: string; bg: string; Icon: IconType }> = {
  add_text:      { label: 'TEXT',       color: 'text-blue-400',   bg: 'bg-blue-500/15 border-blue-500/30',   Icon: Type },
  add_subtitle:  { label: 'SUBTITLE',   color: 'text-sky-400',    bg: 'bg-sky-500/15 border-sky-500/30',     Icon: Type },
  trim_clip:     { label: 'TRIM',       color: 'text-emerald-400',bg: 'bg-emerald-500/15 border-emerald-500/30', Icon: Scissors },
  split_clip:    { label: 'SPLIT',      color: 'text-amber-400',  bg: 'bg-amber-500/15 border-amber-500/30', Icon: Split },
  delete_clip:   { label: 'DELETE',     color: 'text-red-400',    bg: 'bg-red-500/15 border-red-500/30',     Icon: Trash2 },
  move_clip:     { label: 'MOVE',       color: 'text-violet-400', bg: 'bg-violet-500/15 border-violet-500/30', Icon: Move },
  add_transition:{ label: 'TRANSITION', color: 'text-purple-400', bg: 'bg-purple-500/15 border-purple-500/30', Icon: Shuffle },
  add_audio:     { label: 'AUDIO',      color: 'text-pink-400',   bg: 'bg-pink-500/15 border-pink-500/30',   Icon: Film },
  set_speed:     { label: 'SPEED',      color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30', Icon: RotateCcw },
  mute_clip:     { label: 'MUTE',       color: 'text-zinc-400',   bg: 'bg-zinc-500/15 border-zinc-500/30',   Icon: VolumeX },
  set_aspect:    { label: 'CANVAS',     color: 'text-cyan-400',   bg: 'bg-cyan-500/15 border-cyan-500/30',   Icon: Monitor },
}

// ─── Visual Timeline Plan ─────────────────────────────────────────────────────

/**
 * The "AI Proposed Edit" visual card — shows affected clips, operations,
 * and expected outcome in a scannable timeline-style view.
 */
function VisualPlanCard({
  msg,
  fps,
  onAccept,
  onReject,
  onRefine,
}: {
  msg: ConvMessage
  fps: number
  onAccept: (id: string) => void
  onReject: (id: string) => void
  onRefine: (id: string, refinement: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [refineText, setRefineText] = useState('')
  const [showRefine, setShowRefine] = useState(false)
  const plan = msg.plan!
  const isPending = msg.planStatus === 'pending'
  const isApplied = msg.planStatus === 'applied'
  const isRejected = msg.planStatus === 'rejected'

  const statusColor = isPending
    ? 'border-ed-accent/70'
    : isApplied
      ? 'border-emerald-500/50'
      : 'border-ed-border/50'

  const statusIcon = isPending
    ? <Sparkles size={11} className="text-ed-accent" />
    : isApplied
      ? <CheckCircle2 size={11} className="text-emerald-400" />
      : <XCircle size={11} className="text-ed-text-muted" />

  return (
    <div className={cn('rounded-xl border-2 bg-ed-bg-2 overflow-hidden shadow-lg transition-all', statusColor)}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-ed-elevated/50 transition-colors text-left"
      >
        <span className={cn(
          'flex items-center justify-center w-5 h-5 rounded shrink-0',
          isPending ? 'bg-ed-accent/15' : isApplied ? 'bg-emerald-500/10' : 'bg-ed-elevated',
        )}>
          {statusIcon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-bold tracking-widest uppercase text-ed-text-muted">
            {isPending ? '⬡ AI Proposed Edit' : isApplied ? '✓ Applied' : '✕ Rejected'}
          </div>
          <div className="text-[12px] font-semibold text-ed-text truncate mt-0.5">{plan.summary}</div>
        </div>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-ed-elevated border border-ed-border text-ed-text-muted shrink-0">
          {plan.actions.length} op{plan.actions.length !== 1 ? 's' : ''}
        </span>
        {expanded ? <ChevronUp size={12} className="text-ed-text-muted shrink-0" /> : <ChevronDown size={12} className="text-ed-text-muted shrink-0" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 flex flex-col gap-2.5">
          {/* Explanation */}
          <p className="text-[11px] text-ed-text-muted leading-relaxed">{plan.explanation}</p>

          {/* Visual operations list — the "Intent-to-Edit Timeline" */}
          {plan.actions.length > 0 && (
            <div className="flex flex-col gap-1">
              <div className="text-[9px] font-bold tracking-widest uppercase text-ed-text-muted/70 mb-0.5">
                Operations
              </div>
              {plan.actions.map((action, i) => {
                const meta = ACTION_META[action.type] ?? {
                  label: 'EDIT', color: 'text-zinc-400', bg: 'bg-zinc-500/15 border-zinc-500/30', Icon: Sparkles,
                }
                const { Icon } = meta

                // Build a rich detail line
                const detail = buildActionDetail(action, fps)

                return (
                  <div key={action.id} className="flex items-start gap-2 group">
                    {/* Step number line */}
                    <div className="flex flex-col items-center pt-1 shrink-0 w-5">
                      <div className="w-5 h-5 rounded-full bg-ed-elevated border border-ed-border flex items-center justify-center text-[9px] font-bold text-ed-text-muted">
                        {i + 1}
                      </div>
                      {i < plan.actions.length - 1 && (
                        <div className="w-px h-full bg-ed-border/50 mt-0.5" />
                      )}
                    </div>

                    {/* Operation card */}
                    <div className="flex-1 min-w-0 pb-1.5">
                      <div className={cn('flex items-center gap-1.5 px-2 py-1.5 rounded-lg border', meta.bg)}>
                        <Icon size={12} className={meta.color} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={cn('text-[9px] font-bold font-mono', meta.color)}>{meta.label}</span>
                            <span className="text-[11px] font-medium text-ed-text truncate">{action.title}</span>
                          </div>
                          {detail && (
                            <div className="text-[10px] text-ed-text-muted mt-0.5 leading-snug">{detail}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Validation warning */}
          {msg.validation && !msg.validation.valid && msg.validation.warnings.length > 0 && (
            <div className="p-2 rounded-md bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-400">
              <div className="flex items-center gap-1 font-semibold mb-1">
                <AlertCircle size={10} /> Validation
              </div>
              {msg.validation.warnings.map((w, i) => (
                <div key={i} className="leading-snug">• {w}</div>
              ))}
            </div>
          )}

          {/* Local fallback notice */}
          {msg.isLocalFallback && (
            <div className="flex items-center gap-1.5 text-[9px] text-ed-text-muted/60 italic">
              <Info size={9} /> Generated by built-in planner (no live AI key or offline fallback).
            </div>
          )}

          {/* Refine input */}
          {isPending && showRefine && (
            <div className="flex flex-col gap-1.5 pt-1 border-t border-ed-border">
              <label className="text-[10px] font-semibold text-ed-text-muted">Refine this plan:</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={refineText}
                  onChange={e => setRefineText(e.target.value)}
                  placeholder='e.g. "Use a slide transition instead"'
                  onKeyDown={e => {
                    if (e.key === 'Enter' && refineText.trim()) {
                      onRefine(msg.id, refineText.trim())
                      setRefineText('')
                      setShowRefine(false)
                    }
                  }}
                  className="flex-1 px-2 py-1 rounded border border-ed-border bg-ed-bg text-[11px] text-ed-text outline-none focus:border-ed-accent"
                  autoFocus
                />
                <button
                  type="button"
                  disabled={!refineText.trim()}
                  onClick={() => {
                    if (refineText.trim()) {
                      onRefine(msg.id, refineText.trim())
                      setRefineText('')
                      setShowRefine(false)
                    }
                  }}
                  className="px-2 py-1 rounded bg-ed-accent text-ed-accent-text text-[11px] font-semibold disabled:opacity-40 transition-opacity"
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {/* Action buttons — only when pending */}
          {isPending && (
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => onReject(msg.id)}
                className="flex-1 py-1.5 px-2 rounded-lg border border-ed-border bg-ed-elevated hover:bg-ed-highest text-ed-text-muted hover:text-ed-text text-[11px] font-medium transition-colors flex items-center justify-center gap-1"
              >
                <X size={12} /> Discard
              </button>
              <button
                type="button"
                onClick={() => { setShowRefine(v => !v); setRefineText('') }}
                className={cn(
                  'py-1.5 px-2 rounded-lg border text-[11px] font-medium transition-colors flex items-center justify-center gap-1',
                  showRefine
                    ? 'border-ed-accent/50 bg-ed-accent/10 text-ed-accent'
                    : 'border-ed-border bg-ed-elevated hover:bg-ed-highest text-ed-text-muted hover:text-ed-text',
                )}
              >
                <RefreshCw size={12} /> Refine
              </button>
              <button
                type="button"
                onClick={() => onAccept(msg.id)}
                className="flex-1 py-1.5 px-2 rounded-lg bg-ed-accent text-ed-accent-text hover:opacity-90 text-[11px] font-semibold transition-opacity flex items-center justify-center gap-1 shadow-sm"
              >
                <Eye size={12} /> Apply
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** Build a human-readable detail line for an action */
function buildActionDetail(action: StudioEditAction, fps: number): string {
  const p = action.params
  const parts: string[] = []

  if (p.clipId) parts.push(`clip ${p.clipId.slice(0, 8)}…`)
  if (p.startFrame !== undefined && p.durationFrames !== undefined) {
    parts.push(`${framesToTimecode(p.startFrame, fps)} → ${framesToTimecode(p.startFrame + p.durationFrames, fps)} (${(p.durationFrames / fps).toFixed(1)}s)`)
  } else if (p.atFrame !== undefined) {
    parts.push(`at ${framesToTimecode(p.atFrame, fps)}`)
  } else if (p.durationFrames !== undefined) {
    parts.push(`${(p.durationFrames / fps).toFixed(1)}s`)
  }
  if (p.text) parts.push(`"${p.text.slice(0, 30)}${p.text.length > 30 ? '…' : ''}"`)
  if (p.transitionKind) parts.push(p.transitionKind)
  if (p.speed !== undefined) parts.push(`${p.speed}×`)
  if (p.aspect) parts.push(p.aspect)

  return parts.join(' · ')
}

/** Renders one message in the conversation thread */
function MessageBubble({
  msg,
  fps,
  onAccept,
  onReject,
  onRefine,
}: {
  msg: ConvMessage
  fps: number
  onAccept: (id: string) => void
  onReject: (id: string) => void
  onRefine: (id: string, refinement: string) => void
}) {
  const isUser = msg.role === 'user'

  return (
    <div className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
      {/* Bubble */}
      <div
        className={cn(
          'max-w-[92%] px-3 py-2 rounded-xl text-[12px] leading-relaxed',
          isUser
            ? 'bg-ed-accent text-ed-accent-text rounded-tr-sm font-medium'
            : msg.isUnsupported
              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-tl-sm'
              : 'bg-ed-bg-2 border border-ed-border text-ed-text rounded-tl-sm',
        )}
      >
        {msg.isUnsupported && (
          <div className="flex items-center gap-1 mb-1 font-semibold text-amber-400 text-[10px]">
            <AlertCircle size={10} /> Not supported
          </div>
        )}
        {msg.text}
      </div>

      {/* Timestamp */}
      <span className="text-[9px] text-ed-text-muted/50 flex items-center gap-1">
        <Clock size={8} />
        {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>

      {/* Visual plan card */}
      {!isUser && msg.plan && msg.plan.actions.length > 0 && (
        <div className="w-full max-w-full mt-0.5">
          <VisualPlanCard
            msg={msg}
            fps={fps}
            onAccept={onAccept}
            onReject={onReject}
            onRefine={onRefine}
          />
        </div>
      )}
    </div>
  )
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export interface AiAssistantPanelProps {
  style?: React.CSSProperties
  timelineRef?: React.RefObject<TimelineRef | null>
}

export function AiAssistantPanel({ style }: AiAssistantPanelProps) {
  const engine = useTimelineEngine()
  const tracks = useTracksStore(s => s.tracks)
  const clips = useTracksStore(s => s.clips)
  const stage = useTracksStore(s => s.stage)
  const totalFrames = useTracksStore(s => s.totalFrames)
  const canUndo = useTracksStore(s => s.canUndo)
  const currentFrame = usePlaybackStore(s => s.currentFrame)
  const selectedClipIdsSet = useSelectionStore(s => s.selectedClipIds)
  const selectedClipIds = useMemo(() => Array.from(selectedClipIdsSet), [selectedClipIdsSet])

  const [messages, setMessages] = useState<ConvMessage[]>([])
  const [prompt, setPrompt] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [showQuickPrompts, setShowQuickPrompts] = useState(true)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  // ── Context snapshot ──────────────────────────────────────────────────────

  const buildContext = useCallback((): TimelineContextSnapshot => ({
    fps: FPS,
    currentFrame,
    totalFrames,
    stage,
    selectedClipIds,
    tracks: tracks.map(t => ({
      id: t.id, kind: t.kind, name: t.name,
      clips: (clips[t.id] ?? []).map(c => ({
        id: c.id, name: c.name, type: c.type,
        startFrame: c.startFrame, durationFrames: c.durationFrames,
      })),
    })),
  }), [tracks, clips, stage, totalFrames, currentFrame, selectedClipIds])

  const buildHistory = useCallback((msgs: ConvMessage[]): ApiHistoryEntry[] =>
    msgs.slice(-MAX_HISTORY * 2).map(m => ({
      role: m.role,
      content: m.role === 'assistant'
        ? `${m.text}${m.plan ? ` [Plan: ${m.plan.summary}]` : ''}`
        : m.text,
    })), [])

  const addMsg = useCallback((msg: ConvMessage) =>
    setMessages(prev => [...prev, msg]), [])

  const patchMsg = useCallback((id: string, patch: Partial<ConvMessage>) =>
    setMessages(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m)), [])

  // ── Core send ─────────────────────────────────────────────────────────────

  const sendPrompt = useCallback(async (text: string) => {
    if (!text.trim() || isThinking) return
    setIsThinking(true)
    setShowQuickPrompts(false)
    setPrompt('')

    const userMsg: ConvMessage = { id: `u-${Date.now()}`, role: 'user', text, ts: Date.now() }
    addMsg(userMsg)

    const asstId = `a-${Date.now()}`
    addMsg({ id: asstId, role: 'assistant', text: '', ts: Date.now() })

    try {
      const context = buildContext()
      const history = buildHistory([...messages, userMsg])
      let plan: StudioEditPlan | null = null
      let isLocalFallback = false

      try {
        const res = await fetch('/api/ai/edit-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: text, context, history }),
          signal: AbortSignal.timeout(25_000),
        })
        if (res.ok) {
          const data = await res.json()
          if (data.hasServerKey && data.plan) plan = data.plan as StudioEditPlan
          else isLocalFallback = true
        } else {
          isLocalFallback = true
        }
      } catch {
        isLocalFallback = true
      }

      if (!plan) {
        plan = generateLocalEditPlan(text, buildContext())
        isLocalFallback = true
      }

      const validation = validateEditPlan(plan, buildContext())
      const isUnsupported = Boolean(plan.unsupported) && plan.actions.length === 0

      patchMsg(asstId, {
        text: plan.explanation,
        plan,
        validation,
        planStatus: isUnsupported ? undefined : 'pending',
        isUnsupported,
        isLocalFallback,
        ts: Date.now(),
      })
    } catch (err) {
      patchMsg(asstId, {
        text: `⚠ Error: ${err instanceof Error ? err.message : 'Unexpected error.'}`,
        isUnsupported: true,
        ts: Date.now(),
      })
    } finally {
      setIsThinking(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isThinking, messages, buildContext, buildHistory, addMsg, patchMsg])

  // ── Accept ────────────────────────────────────────────────────────────────

  const handleAccept = useCallback((msgId: string) => {
    const msg = messages.find(m => m.id === msgId)
    if (!msg?.plan) return
    const ctx = buildContext()
    const result = applyStudioEditPlan(msg.plan, engine, ctx)
    if (result.success) {
      patchMsg(msgId, { planStatus: 'applied' })
      addMsg({
        id: `sys-${Date.now()}`, role: 'assistant',
        text: `✅ Applied — ${result.appliedCount} operation${result.appliedCount !== 1 ? 's' : ''} completed. Use Ctrl+Z to undo.`,
        ts: Date.now(),
      })
    } else {
      patchMsg(msgId, { planStatus: 'rejected' })
      addMsg({
        id: `sys-err-${Date.now()}`, role: 'assistant',
        text: `⚠ Could not apply: ${result.error ?? 'Unknown error.'}`,
        isUnsupported: true, ts: Date.now(),
      })
    }
  }, [messages, buildContext, engine, patchMsg, addMsg])

  // ── Reject ────────────────────────────────────────────────────────────────

  const handleReject = useCallback((msgId: string) => {
    patchMsg(msgId, { planStatus: 'rejected' })
    addMsg({
      id: `sys-rej-${Date.now()}`, role: 'assistant',
      text: 'Proposal discarded. Feel free to refine or try a different request.',
      ts: Date.now(),
    })
  }, [patchMsg, addMsg])

  // ── Refine ────────────────────────────────────────────────────────────────

  const handleRefine = useCallback((msgId: string, refinement: string) => {
    patchMsg(msgId, { planStatus: 'rejected' })
    void sendPrompt(refinement)
  }, [patchMsg, sendPrompt])

  // ── Keyboard ──────────────────────────────────────────────────────────────

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendPrompt(prompt)
    }
  }, [sendPrompt, prompt])

  const hasPending = messages.some(m => m.planStatus === 'pending')
  const turnCount = messages.filter(m => m.role === 'user').length

  return (
    <div style={style} className="flex flex-col h-full bg-ed-bg select-none">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-ed-border bg-ed-bg-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-md bg-ed-accent/15 text-ed-accent">
            <Sparkles size={13} />
          </span>
          <span className="text-[13px] font-semibold text-ed-text tracking-tight">AI Studio Assistant</span>
          {turnCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-ed-elevated border border-ed-border text-[9px] font-mono text-ed-text-muted">
              {turnCount} turn{turnCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {canUndo && (
            <button type="button" onClick={() => engine.undo()}
              title="Undo last edit (Ctrl+Z)"
              className="flex items-center gap-1 text-[11px] text-ed-text-muted hover:text-ed-text transition-colors px-1.5 py-0.5 rounded hover:bg-ed-elevated">
              <Undo2 size={11} /> Undo
            </button>
          )}
          {messages.length > 0 && (
            <button type="button" onClick={() => { setMessages([]); setShowQuickPrompts(true) }}
              title="Clear conversation"
              className="flex items-center gap-1 text-[11px] text-ed-text-muted hover:text-red-400 transition-colors px-1.5 py-0.5 rounded hover:bg-ed-elevated">
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </div>

      {/* ── Thread ── */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-3">

        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex flex-col gap-3">
            <div className="p-3 rounded-xl border border-ed-border bg-ed-bg-2/60 text-[11px] text-ed-text-muted leading-relaxed">
              <div className="flex items-center gap-1.5 font-semibold text-ed-text mb-1.5">
                <Sparkles size={12} className="text-ed-accent" /> AI Intent-to-Edit Timeline
              </div>
              <p>Describe any edit in plain English. The AI converts your request into a <strong className="text-ed-text">structured plan</strong> you can preview, accept, refine, or discard — then undo in one step.</p>
              <div className="mt-2 space-y-1 text-[10px]">
                <div className="flex items-start gap-1.5"><Eye size={9} className="mt-0.5 shrink-0 text-ed-accent" /><span><strong className="text-ed-text">Preview first:</strong> Every proposal shows what will change before touching the timeline.</span></div>
                <div className="flex items-start gap-1.5"><RefreshCw size={9} className="mt-0.5 shrink-0 text-ed-accent" /><span><strong className="text-ed-text">Refine inline:</strong> Click Refine on any plan to adjust it with a follow-up.</span></div>
                <div className="flex items-start gap-1.5"><Undo2 size={9} className="mt-0.5 shrink-0 text-ed-accent" /><span><strong className="text-ed-text">One-step undo:</strong> Each applied plan is a single undo entry.</span></div>
              </div>
            </div>

            {showQuickPrompts && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-bold tracking-widest uppercase text-ed-text-muted/70">Quick starts</span>
                <div className="grid grid-cols-2 gap-1">
                  {QUICK_PROMPTS.map(item => (
                    <button key={item.label} type="button" disabled={isThinking}
                      onClick={() => void sendPrompt(item.prompt)}
                      className="px-2 py-1.5 rounded-lg border border-ed-border bg-ed-elevated hover:bg-ed-highest text-ed-text text-[11px] font-medium transition-colors hover:border-ed-accent/40 disabled:opacity-50 text-left leading-tight">
                      <span className="mr-1">{item.emoji}</span>{item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Message list */}
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            fps={FPS}
            onAccept={handleAccept}
            onReject={handleReject}
            onRefine={handleRefine}
          />
        ))}

        {/* Thinking */}
        {isThinking && (
          <div className="flex items-center gap-2 text-[11px] text-ed-text-muted animate-in fade-in">
            <Loader2 size={12} className="animate-spin text-ed-accent" />
            Generating edit plan…
          </div>
        )}
      </div>

      {/* ── Pending banner ── */}
      {hasPending && !isThinking && (
        <div className="px-3 py-1.5 bg-ed-accent/10 border-t border-ed-accent/30 shrink-0 flex items-center gap-1.5 text-[10px] text-ed-accent">
          <Eye size={10} /> Review the proposed plan above before sending a new request.
        </div>
      )}

      {/* ── Input ── */}
      <div className="px-3 py-2.5 border-t border-ed-border bg-ed-bg-2 shrink-0">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Describe an edit… e.g. "Make this a 30-second reel with transitions"'
            rows={2}
            disabled={isThinking}
            className="w-full p-2.5 pr-10 rounded-lg border border-ed-border bg-ed-bg text-xs text-ed-text placeholder:text-ed-text-muted/60 outline-none focus:border-ed-accent resize-none transition-colors disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => void sendPrompt(prompt)}
            disabled={!prompt.trim() || isThinking}
            title="Send (Enter)"
            className="absolute right-2 bottom-2 p-1.5 rounded-md bg-ed-accent text-ed-accent-text hover:opacity-90 disabled:opacity-40 transition-all cursor-pointer"
          >
            {isThinking ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          </button>
        </div>

        {/* Quick prompts row after first message */}
        {messages.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {(showQuickPrompts ? QUICK_PROMPTS.slice(0, 4) : []).map(item => (
              <button key={item.label} type="button" disabled={isThinking}
                onClick={() => void sendPrompt(item.prompt)}
                className="px-2 py-0.5 rounded-md border border-ed-border bg-ed-elevated hover:bg-ed-highest text-ed-text text-[10px] transition-colors hover:border-ed-accent/40 disabled:opacity-50">
                {item.emoji} {item.label}
              </button>
            ))}
            <button type="button"
              onClick={() => setShowQuickPrompts(v => !v)}
              className="px-2 py-0.5 rounded-md text-ed-text-muted text-[10px] hover:text-ed-text transition-colors">
              {showQuickPrompts ? '×' : '+ Prompts'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
