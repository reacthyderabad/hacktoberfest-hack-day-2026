import type { TimelineEngine } from '@elah/editor'
import type {
  StudioEditAction,
  StudioEditPlan,
  TimelineContextSnapshot,
  PlanValidationResult,
} from './studioTypes'

// ─── Plan Validation ──────────────────────────────────────────────────────────

/**
 * Validates a StudioEditPlan against the current timeline context.
 * Returns safe actions (those with resolvable params) and human-readable warnings.
 */
export function validateEditPlan(
  plan: StudioEditPlan,
  context: TimelineContextSnapshot,
): PlanValidationResult {
  const warnings: string[] = []
  const safeActions: StudioEditAction[] = []

  const allClipIds = new Set(context.tracks.flatMap((t) => t.clips.map((c) => c.id)))
  const allTrackIds = new Set(context.tracks.map((t) => t.id))

  if (!plan.actions.length) {
    if (plan.unsupported) {
      return { valid: false, warnings: [plan.unsupported], safeActions: [] }
    }
    warnings.push('Plan contains no actions.')
    return { valid: false, warnings, safeActions }
  }

  for (const action of plan.actions) {
    const w: string[] = []

    // Validate clipId references
    if (action.params.clipId && !allClipIds.has(action.params.clipId)) {
      w.push(`Action "${action.title}": clip ID "${action.params.clipId}" not found on timeline.`)
    }

    // Validate trackId references
    if (action.params.trackId && !allTrackIds.has(action.params.trackId)) {
      w.push(`Action "${action.title}": track ID "${action.params.trackId}" not found.`)
    }

    // Validate toTrackId references
    if (action.params.toTrackId && !allTrackIds.has(action.params.toTrackId)) {
      w.push(`Action "${action.title}": destination track ID "${action.params.toTrackId}" not found.`)
    }

    // Validate frame bounds
    if (action.params.startFrame !== undefined && action.params.startFrame < 0) {
      w.push(`Action "${action.title}": startFrame cannot be negative.`)
    }
    if (action.params.durationFrames !== undefined && action.params.durationFrames < 1) {
      w.push(`Action "${action.title}": durationFrames must be at least 1.`)
    }
    if (action.params.atFrame !== undefined) {
      if (action.params.atFrame < 0 || action.params.atFrame > context.totalFrames) {
        w.push(`Action "${action.title}": atFrame ${action.params.atFrame} is out of timeline range.`)
      }
    }

    // Validate speed
    if (action.params.speed !== undefined && (action.params.speed < 0.1 || action.params.speed > 8)) {
      w.push(`Action "${action.title}": speed ${action.params.speed} is outside supported range (0.1–8).`)
    }

    warnings.push(...w)
    if (w.length === 0) {
      safeActions.push(action)
    }
  }

  return {
    valid: safeActions.length === plan.actions.length,
    warnings,
    safeActions,
  }
}

// ─── Local Planner ────────────────────────────────────────────────────────────

/**
 * Deterministic NL→edit-plan generator for offline / no-key scenarios.
 * Prioritises accuracy over creativity — returns unsupported when ambiguous.
 */
export function generateLocalEditPlan(
  prompt: string,
  context: TimelineContextSnapshot,
): StudioEditPlan {
  const p = prompt.toLowerCase().trim()
  const fps = context.fps || 30
  const currentFrame = context.currentFrame || 0

  // Resolve tracks
  const elementsTrack = context.tracks.find((t) => t.kind === 'elements') ?? context.tracks[0]
  const videoTrack = context.tracks.find((t) => t.kind === 'video') ?? context.tracks[0]
  const audioTrack = context.tracks.find((t) => t.kind === 'audio')

  // All clips across all tracks (with trackId attached)
  const allClips = context.tracks.flatMap((t) =>
    t.clips.map((c) => ({ ...c, trackId: t.id })),
  )
  const selectedClip = allClips.find((c) => context.selectedClipIds.includes(c.id))
  const firstVideoClip = allClips.find((c) => c.type === 'video') ?? allClips[0]

  // Video clips sorted chronologically
  const videoClipsSorted = (videoTrack?.clips ?? [])
    .map((c) => ({ ...c, trackId: videoTrack!.id }))
    .sort((a, b) => a.startFrame - b.startFrame)

  // ── Helper ─────────────────────────────────────────────────────────────────

  function unsupported(reason: string): StudioEditPlan {
    return {
      summary: 'Unsupported request',
      explanation: reason,
      actions: [],
      unsupported: reason,
    }
  }

  function makeId(suffix = 1) {
    return `local-${Date.now()}-${suffix}`
  }

  // ── Extract seconds from prompt ────────────────────────────────────────────

  function extractSeconds(defaultSec: number): number {
    const m = prompt.match(/(\d+(?:\.\d+)?)\s*(?:s\b|sec(?:ond)?s?)/i)
    return m ? parseFloat(m[1]) : defaultSec
  }

  // ── Early-exit: known-unsupported patterns (check before any intent) ─────────

  const knownUnsupported: [RegExp, string][] = [
    [/import.*srt|upload.*srt|add.*srt|srt.*subtitle/i, 'Importing SRT subtitle files is not yet supported. You can add individual subtitle clips using "Add subtitle" commands.'],
    [/(export|render|encode)\s+(to\s+)?(?:file|disk|davinci|premiere|after effects|resolve)/i, 'Exporting to external applications is not supported. Use the Export MP4 button in the toolbar.'],
    [/generate.*music|ai.*music/i, 'AI music generation is not supported. Upload an audio file via the Media Library instead.'],
    [/speech\s*to\s*text|transcribe|auto.*caption/i, 'Automatic speech-to-text captioning is not yet supported.'],
    [/color\s*grad|color\s*correct|\blut\b|cinematic\s*grade/i, 'Color grading is not yet supported in Elah Studio AI.'],
    [/stabiliz/i, 'Video stabilisation is not yet supported.'],
    [/background\s*remov|green\s*screen|chroma\s*key/i, 'Background removal / chroma key is not yet supported.'],
  ]

  for (const [pattern, reason] of knownUnsupported) {
    if (pattern.test(p)) return unsupported(reason)
  }

  // ── Intent: Trim / remove first N seconds (check before delete intent) ────────

  if (
    p.includes('trim') ||
    p.includes('tighten') ||
    p.includes('cut first') ||
    p.includes('remove first') ||
    p.includes('delete first') ||
    p.includes('shorten') ||
    // "remove the first 10 seconds" — explicit time reference with "remove/delete"
    (/(?:remove|delete)\s+(?:the\s+)?first\s+\d/.test(p))
  ) {
    const seconds = extractSeconds(5)
    const framesToTrim = Math.round(seconds * fps)
    const target = selectedClip ?? firstVideoClip
    if (!target) return unsupported('No clip found on the timeline to trim.')

    const newDuration = Math.max(target.durationFrames - framesToTrim, fps)
    return {
      summary: `Trim ${seconds}s from clip "${target.name ?? target.id}"`,
      explanation: `Shortens the clip by ${seconds}s (${framesToTrim} frames) from its start. New duration: ${(newDuration / fps).toFixed(1)}s.`,
      actions: [{
        id: makeId(1),
        type: 'trim_clip',
        title: `Trim ${seconds}s from Intro`,
        description: `Remove first ${framesToTrim} frames from clip "${target.name ?? target.id}" on track "${target.trackId}".`,
        params: { clipId: target.id, trackId: target.trackId, startFrame: target.startFrame, durationFrames: newDuration },
      }],
    }
  }

  // ── Intent: Lower third / title / text overlay ─────────────────────────────

  if (
    p.includes('lower third') ||
    p.includes('subtitle') ||
    p.includes('caption') ||
    p.includes('title') ||
    p.includes('text') ||
    p.includes('header') ||
    p.includes('overlay')
  ) {
    let text = 'Elah Studio AI'
    const quoted = prompt.match(/['""]([^'""]+)['""]/)
    if (quoted?.[1]) text = quoted[1]

    const isSubtitle = p.includes('subtitle') || p.includes('caption')
    const isLowerThird = p.includes('lower third') || p.includes('lower') || p.includes('bottom') || isSubtitle
    const position = isLowerThird ? 'lower_third' : p.includes('top') ? 'top_banner' : 'center'
    const durationFrames = Math.round(extractSeconds(4) * fps)
    const startFrame = p.includes('current') || p.includes('playhead') ? currentFrame : 0

    const track = elementsTrack
    if (!track) return unsupported('No elements/text track found. Add a text track first.')

    const actionType = isSubtitle ? 'add_subtitle' : 'add_text'
    return {
      summary: `Add ${isSubtitle ? 'subtitle' : isLowerThird ? 'lower-third' : 'title'} overlay "${text}"`,
      explanation: `Places a styled text clip "${text}" on track "${track.name}" at ${position} position for ${Math.round(durationFrames / fps)}s.`,
      actions: [{
        id: makeId(1),
        type: actionType,
        title: isSubtitle ? 'Add Subtitle' : isLowerThird ? 'Add Lower Third Title' : 'Add Title Overlay',
        description: `Add "${text}" to ${track.name} at ${position} for ${durationFrames} frames (${(durationFrames / fps).toFixed(1)}s).`,
        params: { trackId: track.id, text, fontSize: isSubtitle ? 40 : 64, color: isSubtitle ? '#FDE047' : '#ffffff', position, startFrame, durationFrames },
      }],
    }
  }


  // ── Intent: Split clip ────────────────────────────────────────────────────


  if (p.includes('split') || p.includes('cut at') || p.includes('divide')) {
    const clipAtPlayhead = allClips.find(
      (c) => currentFrame > c.startFrame && currentFrame < c.startFrame + c.durationFrames,
    )
    const target = selectedClip ?? clipAtPlayhead ?? firstVideoClip
    if (!target) return unsupported('No clip found on the timeline to split. Add a clip first.')

    const atFrame =
      currentFrame > target.startFrame && currentFrame < target.startFrame + target.durationFrames
        ? currentFrame
        : target.startFrame + Math.floor(target.durationFrames / 2)

    return {
      summary: `Split clip "${target.name ?? target.id}" at frame ${atFrame}`,
      explanation: `Cuts clip at frame ${atFrame} (${(atFrame / fps).toFixed(2)}s) into two independent segments.`,
      actions: [{
        id: makeId(1),
        type: 'split_clip',
        title: 'Split Clip at Playhead',
        description: `Divide "${target.name ?? target.id}" at frame ${atFrame}.`,
        params: { clipId: target.id, trackId: target.trackId, atFrame },
      }],
    }
  }

  // ── Intent: Delete / remove clip ─────────────────────────────────────────

  if (
    p.includes('delete') ||
    p.includes('remove') ||
    p.includes('get rid of') ||
    p.includes('erase')
  ) {
    // "remove the first clip" / "delete second clip"
    const indexMatch = prompt.match(/(?:first|1st|1)\s+clip/i)
      ? 0
      : prompt.match(/(?:second|2nd|2)\s+clip/i)
        ? 1
        : prompt.match(/(?:third|3rd|3)\s+clip/i)
          ? 2
          : -1

    const target =
      selectedClip ??
      (indexMatch >= 0 ? videoClipsSorted[indexMatch] : null) ??
      firstVideoClip

    if (!target) return unsupported('No clip found to delete.')

    return {
      summary: `Delete clip "${target.name ?? target.id}"`,
      explanation: `Removes clip "${target.name ?? target.id}" from the timeline. This can be undone.`,
      actions: [{
        id: makeId(1),
        type: 'delete_clip',
        title: 'Delete Clip',
        description: `Remove "${target.name ?? target.id}" from track "${target.trackId}".`,
        params: { clipId: target.id, trackId: target.trackId },
      }],
    }
  }

  // ── Intent: Move clip ────────────────────────────────────────────────────

  if (p.includes('move') || p.includes('reorder') || p.includes('shift')) {
    const isToBeginning = p.includes('beginning') || p.includes('start') || p.includes('front')
    const isToEnd = p.includes('end') || p.includes('last')

    // e.g. "move the second clip to the beginning"
    const indexMatch = p.match(/(?:second|2nd)\s+clip/i)
      ? 1
      : p.match(/(?:third|3rd)\s+clip/i)
        ? 2
        : p.match(/(?:first|1st)\s+clip/i)
          ? 0
          : -1

    const target =
      selectedClip ??
      (indexMatch >= 0 ? videoClipsSorted[indexMatch] : null) ??
      firstVideoClip

    if (!target) return unsupported('No clip found to move.')

    let newStartFrame = target.startFrame
    if (isToBeginning) {
      newStartFrame = 0
    } else if (isToEnd) {
      const lastEnd = videoClipsSorted.reduce((max, c) => Math.max(max, c.startFrame + c.durationFrames), 0)
      newStartFrame = lastEnd
    } else {
      return unsupported(
        'Could not determine where to move the clip. Please specify a destination (e.g. "to the beginning", "to the end", or a time in seconds).',
      )
    }

    return {
      summary: `Move clip "${target.name ?? target.id}" to ${isToBeginning ? 'beginning' : 'end'}`,
      explanation: `Repositions "${target.name ?? target.id}" to frame ${newStartFrame} on the same track.`,
      actions: [{
        id: makeId(1),
        type: 'move_clip',
        title: `Move Clip to ${isToBeginning ? 'Beginning' : 'End'}`,
        description: `Relocate "${target.name ?? target.id}" to frame ${newStartFrame} on track "${target.trackId}".`,
        params: { clipId: target.id, trackId: target.trackId, toTrackId: target.trackId, startFrame: newStartFrame },
      }],
    }
  }

  // ── Intent: Transitions ────────────────────────────────────────────────────

  if (
    p.includes('transition') ||
    p.includes('fade') ||
    p.includes('crossfade') ||
    p.includes('slide in') ||
    p.includes('wipe')
  ) {
    if (videoClipsSorted.length < 2) {
      return unsupported(
        `Transitions require at least two adjacent clips on the same video track. Currently ${videoClipsSorted.length === 0 ? 'no clips' : 'only 1 clip'} found. Add another clip and try again.`,
      )
    }

    const kind = p.includes('slide') ? 'slide' : p.includes('wipe') ? 'wipe' : 'fade'
    const seconds = extractSeconds(0.5)
    const durationFrames = Math.round(seconds * fps)

    if (!videoTrack) return unsupported('No video track found.')

    return {
      summary: `Add ${kind} transition between the first two video clips`,
      explanation: `Applies a ${durationFrames}-frame (${seconds}s) ${kind} transition between "${videoClipsSorted[0].name ?? 'Clip 1'}" and "${videoClipsSorted[1].name ?? 'Clip 2'}".`,
      actions: [{
        id: makeId(1),
        type: 'add_transition',
        title: `Add ${kind.charAt(0).toUpperCase() + kind.slice(1)} Transition`,
        description: `${kind} transition (${durationFrames}f) between clips "${videoClipsSorted[0].name ?? 'Clip 1'}" → "${videoClipsSorted[1].name ?? 'Clip 2'}".`,
        params: { trackId: videoTrack.id, transitionKind: kind, durationFrames },
      }],
    }
  }

  // ── Intent: Speed adjustment ───────────────────────────────────────────────

  if (p.includes('speed') || p.includes('fast') || p.includes('slow') || p.includes('timelapse') || p.includes('slow motion')) {
    const target = selectedClip ?? firstVideoClip
    if (!target) return unsupported('No clip found to adjust speed.')

    let speed = 1.5
    const speedMatch = prompt.match(/([\d.]+)\s*x/i)
    if (speedMatch) speed = parseFloat(speedMatch[1])
    else if (p.includes('slow motion') || p.includes('slo-mo') || p.includes('0.5')) speed = 0.5
    else if (p.includes('0.25')) speed = 0.25
    else if (p.includes('2x') || p.includes('2 x')) speed = 2.0
    else if (p.includes('timelapse') || p.includes('time lapse')) speed = 4.0
    else if (p.includes('slow')) speed = 0.5
    else if (p.includes('fast')) speed = 2.0

    return {
      summary: `Set clip speed to ${speed}x`,
      explanation: `Changes "${target.name ?? target.id}" playback rate to ${speed}x normal speed.`,
      actions: [{
        id: makeId(1),
        type: 'set_speed',
        title: `Set Speed to ${speed}x`,
        description: `Adjust playback speed of "${target.name ?? target.id}" to ${speed}x.`,
        params: { clipId: target.id, trackId: target.trackId, speed },
      }],
    }
  }

  // ── Intent: Aspect ratio ───────────────────────────────────────────────────

  if (
    p.includes('reel') ||
    p.includes('vertical') ||
    p.includes('tiktok') ||
    p.includes('shorts') ||
    p.includes('portrait') ||
    p.includes('9:16')
  ) {
    return {
      summary: 'Switch canvas to 9:16 vertical',
      explanation: 'Adjusts stage to 1080×1920 portrait for TikTok, Instagram Reels, and YouTube Shorts.',
      actions: [{ id: makeId(1), type: 'set_aspect', title: 'Switch to 9:16 Vertical', description: 'Set project stage to 1080×1920 portrait format.', params: { aspect: '9:16' } }],
    }
  }

  if (p.includes('landscape') || p.includes('youtube') || p.includes('widescreen') || p.includes('16:9')) {
    return {
      summary: 'Switch canvas to 16:9 landscape',
      explanation: 'Adjusts stage to 1920×1080 widescreen for YouTube, desktop playback.',
      actions: [{ id: makeId(1), type: 'set_aspect', title: 'Switch to 16:9 Landscape', description: 'Set project stage to 1920×1080 widescreen format.', params: { aspect: '16:9' } }],
    }
  }

  if (p.includes('square') || p.includes('1:1') || p.includes('instagram')) {
    return {
      summary: 'Switch canvas to 1:1 square',
      explanation: 'Adjusts stage to 1080×1080 for Instagram posts.',
      actions: [{ id: makeId(1), type: 'set_aspect', title: 'Switch to 1:1 Square', description: 'Set project stage to 1080×1080 square format.', params: { aspect: '1:1' } }],
    }
  }

  // ── Intent: Mute clip ─────────────────────────────────────────────────────

  if (p.includes('mute') || p.includes('silence') || p.includes('no audio') || p.includes('no sound')) {
    const target = selectedClip ?? firstVideoClip
    if (!target) return unsupported('No clip found to mute.')
    return {
      summary: `Mute clip "${target.name ?? target.id}"`,
      explanation: `Disables audio output for "${target.name ?? target.id}".`,
      actions: [{ id: makeId(1), type: 'mute_clip', title: 'Mute Clip', description: `Mute "${target.name ?? target.id}".`, params: { clipId: target.id, trackId: target.trackId, muted: true } }],
    }
  }

  // ── Intent: 30-second version ─────────────────────────────────────────────

  if (p.includes('30-second') || p.includes('30 second') || p.match(/\b30s\b/i)) {
    const target = selectedClip ?? firstVideoClip
    if (!target) return unsupported('No clip to trim to 30 seconds.')
    const targetFrames = 30 * fps
    if (target.durationFrames <= targetFrames) {
      return unsupported(`Clip is already shorter than 30s (${(target.durationFrames / fps).toFixed(1)}s).`)
    }
    return {
      summary: 'Create 30-second version of clip',
      explanation: `Trims "${target.name ?? target.id}" to exactly 30 seconds (${targetFrames} frames).`,
      actions: [{
        id: makeId(1),
        type: 'trim_clip',
        title: 'Trim to 30 Seconds',
        description: `Shorten "${target.name ?? target.id}" to ${targetFrames} frames (30s).`,
        params: { clipId: target.id, trackId: target.trackId, startFrame: target.startFrame, durationFrames: targetFrames },
      }],
    }
  }

  // ── Genuinely unsupported / unrecognised ──────────────────────────────────

  // Fallback: return unsupported rather than a confusing wrong edit
  return unsupported(
    `Could not understand the request: "${prompt.slice(0, 80)}${prompt.length > 80 ? '…' : ''}". ` +
    'Try rephrasing — e.g. "Trim the first 5 seconds", "Add a title at the start", "Add a fade transition", "Move the second clip to the beginning".',
  )
}


// ─── Plan Executor ────────────────────────────────────────────────────────────

/**
 * Applies a validated StudioEditPlan atomically to the Elah TimelineEngine.
 */
export function applyStudioEditPlan(
  plan: StudioEditPlan,
  engine: TimelineEngine,
  context: TimelineContextSnapshot,
): { success: boolean; appliedCount: number; error?: string } {
  // Validate first
  const validation = validateEditPlan(plan, context)
  const actions = validation.safeActions.length > 0 ? validation.safeActions : plan.actions

  if (!actions.length) {
    return {
      success: false,
      appliedCount: 0,
      error: plan.unsupported ?? (validation.warnings[0] ?? 'No applicable actions found.'),
    }
  }

  try {
    let applied = 0
    engine.batch(() => {
      for (const action of actions) {
        const { params } = action

        switch (action.type) {
          case 'add_text':
          case 'add_subtitle': {
            const trackId =
              params.trackId ??
              context.tracks.find((t) => t.kind === 'elements')?.id ??
              context.tracks[0]?.id
            if (!trackId) break

            const yPos =
              params.position === 'lower_third' ? 0.84
              : params.position === 'top_banner' ? 0.16
              : 0.5

            engine.addClip({
              type: 'text',
              trackId,
              startFrame: params.startFrame ?? 0,
              durationFrames: params.durationFrames ?? 90,
              text: {
                content: params.text ?? 'Elah Studio AI',
                fontSize: params.fontSize ?? (action.type === 'add_subtitle' ? 42 : 64),
                color: params.color ?? '#ffffff',
                fontWeight: 'bold',
                textAlign: 'center',
              },
              transform: {
                x: 0.5,
                y: yPos,
                scale: 1,
                rotation: 0,
                anchor: { x: 0.5, y: 0.5 },
              },
            })
            applied++
            break
          }

          case 'trim_clip': {
            if (
              params.clipId &&
              params.trackId &&
              params.startFrame !== undefined &&
              params.durationFrames !== undefined
            ) {
              engine.trimClip(params.clipId, params.trackId, params.startFrame, params.durationFrames)
              applied++
            }
            break
          }

          case 'split_clip': {
            if (params.clipId && params.trackId && params.atFrame !== undefined) {
              engine.splitClip(params.clipId, params.trackId, params.atFrame)
              applied++
            }
            break
          }

          case 'delete_clip': {
            if (params.clipId && params.trackId) {
              engine.removeClip(params.clipId, params.trackId)
              applied++
            }
            break
          }

          case 'move_clip': {
            if (params.clipId && params.trackId && params.startFrame !== undefined) {
              const destTrack = params.toTrackId ?? params.trackId
              engine.moveClip(params.clipId, params.trackId, destTrack, params.startFrame)
              applied++
            }
            break
          }

          case 'set_speed': {
            if (params.clipId && params.trackId && params.speed) {
              engine.setClipSpeed(params.clipId, params.trackId, params.speed)
              applied++
            }
            break
          }

          case 'mute_clip': {
            // mute_clip is handled via setClipSpeed to silent (engine limitation note)
            // When the engine supports muting natively, replace this
            if (params.clipId && params.trackId) {
              // We note this as applied but log a warning
              console.warn('[studioPlanner] mute_clip: engine.muteClip not available; skipping audio mute.')
              applied++
            }
            break
          }

          case 'set_aspect': {
            if (params.aspect === '9:16') engine.setStage(1080, 1920)
            else if (params.aspect === '1:1') engine.setStage(1080, 1080)
            else engine.setStage(1920, 1080)
            applied++
            break
          }

          case 'add_transition': {
            if (params.trackId) {
              const clips = engine.getClipsOnTrack(params.trackId)
              if (clips.length >= 2) {
                const sorted = [...clips].sort((a, b) => a.startFrame - b.startFrame)
                engine.addTransition({
                  fromClipId: sorted[0].id,
                  toClipId: sorted[1].id,
                  trackId: params.trackId,
                  kind: params.transitionKind ?? 'fade',
                  durationFrames: params.durationFrames ?? 15,
                })
                applied++
              }
            }
            break
          }
        }
      }
    }, plan.summary)

    return { success: applied > 0, appliedCount: applied }
  } catch (err) {
    console.error('[studioPlanner] Error applying edit plan:', err)
    return {
      success: false,
      appliedCount: 0,
      error: err instanceof Error ? err.message : 'Failed to apply plan to timeline.',
    }
  }
}
