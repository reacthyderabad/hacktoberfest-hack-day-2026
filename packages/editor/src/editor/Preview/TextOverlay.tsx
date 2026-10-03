import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type {
  Transform,
  ActiveTextClip,
  TextLayout,
} from '@elah/core'
import { computeTextLayout, computeContainViewport, SIDE_MARGIN } from '@elah/core'
import { useTimelineEngine, useSelectionStore, usePlaybackStore } from '@elah/react'
import { useResolvedScene } from '../useResolvedScene'

/**
 * `<TextOverlay>` — the interactive editing surface for text clips.
 *
 * It sits as a transparent HTML layer directly over the WebGL canvas and gives
 * text the behaviours a video editor is expected to have: click to select, drag
 * to reposition, corner-drag to resize, knob-drag to rotate, double-click to
 * edit inline. The canvas
 * still does the actual *rendering* (via the GPU TextLayer); this overlay only
 * handles interaction and writes results back to the engine, so there is exactly
 * one renderer and one source of truth.
 *
 * Coordinate spaces:
 *   - Stage space: the project's logical pixels (e.g. 1080×1920).
 *   - Screen space: CSS pixels inside this overlay (== the canvas display box).
 * `computeContainViewport` gives the letterboxed rect of the stage within the
 * overlay; everything maps through that single rect so handles stay glued to the
 * glyphs the GPU paints (both use `computeTextLayout`).
 */

const MIN_FONT_SIZE = 6
const MAX_FONT_SIZE = 4000
/** Minimum on-screen hit/handle box so empty or tiny text stays grabbable. */
const MIN_BOX_PX = 28
/** Visual breathing room around the measured glyph box, in screen px. */
const BOX_PAD = 4
/** Gap between the box's top edge and the rotate knob, in screen px. */
const ROTATE_STEM_PX = 20
/** Rotate knob diameter, in screen px. */
const ROTATE_KNOB_PX = 14
/** Shift-drag rotation snap step (15°). */
const ROTATE_SNAP_STEP = Math.PI / 12
/** Free-drag magnetic snap radius around multiples of 90° (~3°). */
const ROTATE_SNAP_EPS = Math.PI / 60

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const clamp01 = (v: number) => clamp(v, 0, 1)

function makeTransform(x: number, y: number, base: Transform | undefined): Transform {
  return {
    x,
    y,
    scale: base?.scale ?? 1,
    rotation: base?.rotation ?? 0,
    anchor: base?.anchor ?? { x: 0.5, y: 0.5 },
  }
}

/**
 * Recover the authored fontSize from a layout that was measured against a
 * *resolved* transform.
 *
 * `computeTextLayout` multiplies the clip's fontSize by `transform.scale` so the
 * glyphs re-rasterize at the painted size (textLayout.ts:152-153). Dividing that
 * same factor back out returns the authored size — including textLayout's own
 * default when the clip carries no explicit fontSize, which is not exported from
 * `@elah/core` and so cannot be read directly here.
 */
function unscaleFontSize(layout: TextLayout, resolved: Transform | undefined): number {
  const s = resolved?.scale ?? 1
  return s > 0 ? layout.style.fontSize / s : layout.style.fontSize
}

/**
 * The gesture's starting point, read from the clip as AUTHORED rather than as
 * resolved for the current frame. See {@link readAuthored}.
 */
interface AuthoredBase {
  trackId: string
  transform: Transform | undefined
  center: { x: number; y: number }
  fontSize: number
}

interface Gesture {
  type: 'move' | 'resize' | 'rotate'
  id: string
  trackId: string
  // move
  startClientX: number
  startClientY: number
  /** AUTHORED block centre (normalized stage coords), never the animated one. */
  startCenter: { x: number; y: number }
  /** AUTHORED transform — scale/rotation/anchor are copied off this on commit. */
  startTransform: Transform | undefined
  // resize + rotate
  /** Resolved (on-screen) block centre — the pivot drags are measured from. */
  centerClientX: number
  centerClientY: number
  startDist: number
  /** AUTHORED fontSize, i.e. before transform.scale is folded in. */
  startFontSize: number
  // rotate
  /** Pointer angle about the pivot at gesture start, radians (screen space). */
  startAngle: number
  /** AUTHORED rotation at gesture start, radians. */
  startRotation: number
}

/**
 * Memoised because it takes no props and drives itself from stores: without it
 * every `Preview` re-render costs another `useResolvedScene`, and there are
 * three of these overlays each resolving the same timeline at the same frame.
 */
export const TextOverlay = memo(function TextOverlay() {
  const engine = useTimelineEngine()
  const scene = useResolvedScene()
  const isPlaying = usePlaybackStore((s) => s.isPlaying)
  const selectedClipIds = useSelectionStore((s) => s.selectedClipIds)
  const selectClip = useSelectionStore((s) => s.selectClip)
  const clearSelection = useSelectionStore((s) => s.clearSelection)

  const rootRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  // One offscreen 2D context, reused for every measurement. Created lazily so
  // this module stays import-safe in non-DOM environments (tests/SSR).
  const measureRef = useRef<CanvasRenderingContext2D | null>(null)
  const getMeasurer = useCallback((): CanvasRenderingContext2D | null => {
    if (measureRef.current) return measureRef.current
    if (typeof document === 'undefined') return null
    const ctx = document.createElement('canvas').getContext('2d')
    measureRef.current = ctx
    return ctx
  }, [])

  const gestureRef = useRef<Gesture | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  // Track the overlay's display size (== canvas display size) in CSS pixels.
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const apply = () =>
      setSize({ width: el.clientWidth, height: el.clientHeight })
    apply()
    const obs = new ResizeObserver(apply)
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const stage = scene.stage
  const fit = useMemo(
    () => computeContainViewport(size.width, size.height, stage.width, stage.height),
    [size.width, size.height, stage.width, stage.height],
  )
  const scale = stage.width > 0 ? fit.width / stage.width : 1

  // Pre-compute each text clip's layout + on-screen rect.
  const items = useMemo(() => {
    const measurer = getMeasurer()
    if (!measurer || fit.width <= 0) return []
    return scene.texts.map((clip) => {
      const layout = computeTextLayout(measurer, clip, stage)
      const centerScreenX = fit.x + layout.center.x * stage.width * scale
      const centerScreenY = fit.y + layout.center.y * stage.height * scale
      const rawLeft = fit.x + layout.box.x * scale
      const rawW = layout.box.width * scale
      const w = Math.max(rawW, MIN_BOX_PX)
      const left = rawW < MIN_BOX_PX ? centerScreenX - w / 2 : rawLeft
      const h = Math.max(layout.box.height * scale, MIN_BOX_PX)
      const top = fit.y + layout.box.y * scale
      // Resolved rotation: the box must tilt exactly like the painted glyphs
      // (buildTextTransformMatrix / ExportWorker.drawText both pivot at
      // layout.center), including any animation-driven rotation this frame.
      const rotation = clip.transform?.rotation ?? 0
      return {
        clip,
        layout,
        centerScreenX,
        centerScreenY,
        rotation,
        rect: { left, top, width: w, height: h },
      }
    })
  }, [scene.texts, stage, fit, scale, getMeasurer])

  // True when a *text* clip is the current selection. The deselect backdrop is
  // gated on this (not on selectedClipIds.size) so it doesn't stack with the
  // MediaTransformOverlay's backdrop when a video/image clip is selected.
  const ownsSelection = useMemo(
    () => items.some((it) => selectedClipIds.has(it.clip.id)),
    [items, selectedClipIds],
  )

  /**
   * Read a clip as AUTHORED, not as resolved for the current frame.
   *
   * `scene.texts[]` carries what the resolver decided this clip looks like *at
   * this frame*: entry/exit animations overwrite `transform` there exactly the
   * way they already overwrite `opacity`. Those values are correct to draw with
   * and wrong to edit from — `previewClip` writes to the raw project clip
   * (TimelineEngine.ts:348-359), so seeding a gesture from the resolved value
   * would commit one frame of the animation as the clip's authored transform,
   * and the clip would jump the moment the playhead left the ramp.
   *
   * `engine.findClip` (TimelineEngine.ts:152-158) reads the raw clip, putting
   * the read and the write back in the same space. Deliberately agnostic about
   * *which* animations exist: any resolver-produced transform is bypassed.
   */
  const readAuthored = useCallback(
    (clip: ActiveTextClip, layout: TextLayout): AuthoredBase => {
      const found = engine.findClip(clip.id)
      if (!found) {
        // The scene outran the project (clip removed between resolve and
        // pointerdown). Degrade to the resolved values instead of dropping the
        // gesture — same behaviour this file had before, never a crash.
        return {
          trackId: clip.trackId,
          transform: clip.transform,
          center: { ...layout.center },
          fontSize: layout.style.fontSize,
        }
      }
      const authored = found.clip
      return {
        trackId: found.trackId,
        transform: authored.transform,
        // Mirrors textLayout.ts:169-173: no transform means the stage centre.
        center: authored.transform
          ? { x: authored.transform.x, y: authored.transform.y }
          : { x: 0.5, y: 0.5 },
        fontSize: authored.fontSize ?? unscaleFontSize(layout, clip.transform),
      }
    },
    [engine],
  )

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent) => {
      const g = gestureRef.current
      if (!g) return
      if (g.type === 'move') {
        // Screen-space delta applied to an AUTHORED base.
        //
        // The resolver's animated transform is the authored one displaced by a
        // frame-dependent offset, so rendered == authored + offset. Adding the
        // drag delta to the authored base therefore moves the rendered glyphs
        // by exactly that delta: the text tracks the cursor 1:1 and the value
        // committed is the authored centre the user aimed at, with no animation
        // baked in.
        //
        // Accepted oddity: an animation that *interpolates toward* the authored
        // centre (a slide that lerps from off-stage to the authored spot)
        // propagates only a fraction of an authored-space change while the
        // playhead sits mid-ramp, so mid-ramp the glyphs lag behind the cursor
        // for the length of the drag. That is the lesser evil — the alternative
        // is dragging in rendered space, which bakes the animation into the
        // saved clip permanently. The lag is confined to one paused frame.
        const dx = (e.clientX - g.startClientX) / scale
        const dy = (e.clientY - g.startClientY) / scale
        const nx = clamp01(g.startCenter.x + dx / stage.width)
        const ny = clamp01(g.startCenter.y + dy / stage.height)
        engine.previewClip(g.id, g.trackId, {
          transform: makeTransform(nx, ny, g.startTransform),
        })
      } else if (g.type === 'resize') {
        const dist = Math.hypot(e.clientX - g.centerClientX, e.clientY - g.centerClientY)
        const ratio = g.startDist > 0 ? dist / g.startDist : 1
        const fontSize = clamp(Math.round(g.startFontSize * ratio), MIN_FONT_SIZE, MAX_FONT_SIZE)
        engine.previewClip(g.id, g.trackId, { fontSize })
      } else {
        // Rotate: the authored rotation plus how far the pointer has swept
        // around the resolved (on-screen) pivot. The stage is uniformly scaled
        // into the viewport, so a screen-space angle IS a stage-space angle;
        // atan2 in y-down screen coords is clockwise-positive, matching both
        // ctx.rotate (export) and the GPU matrix.
        const angle = Math.atan2(e.clientY - g.centerClientY, e.clientX - g.centerClientX)
        let rotation = g.startRotation + (angle - g.startAngle)
        if (e.shiftKey) {
          rotation = Math.round(rotation / ROTATE_SNAP_STEP) * ROTATE_SNAP_STEP
        } else {
          // Light magnetic snap so levelling the text back out is effortless.
          const nearest = Math.round(rotation / (Math.PI / 2)) * (Math.PI / 2)
          if (Math.abs(rotation - nearest) < ROTATE_SNAP_EPS) rotation = nearest
        }
        engine.previewClip(g.id, g.trackId, {
          transform: {
            ...makeTransform(g.startCenter.x, g.startCenter.y, g.startTransform),
            rotation,
          },
        })
      }
    },
    [engine, scale, stage.width, stage.height],
  )

  const endGesture = useCallback(
    (e: ReactPointerEvent) => {
      const g = gestureRef.current
      if (!g) return
      gestureRef.current = null
      const target = e.currentTarget as Element
      if (target.hasPointerCapture?.(e.pointerId)) {
        target.releasePointerCapture(e.pointerId)
      }
      engine.commitInteraction(
        g.type === 'move' ? 'Move text' : g.type === 'rotate' ? 'Rotate text' : 'Resize text',
      )
    },
    [engine],
  )

  const beginMove = useCallback(
    (e: ReactPointerEvent, clip: ActiveTextClip, layout: TextLayout) => {
      if (editingId === clip.id) return
      e.stopPropagation()
      if (!selectedClipIds.has(clip.id)) selectClip(clip.id)
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
      const authored = readAuthored(clip, layout)
      gestureRef.current = {
        type: 'move',
        id: clip.id,
        trackId: authored.trackId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startCenter: authored.center,
        startTransform: authored.transform,
        centerClientX: 0,
        centerClientY: 0,
        startDist: 0,
        startFontSize: authored.fontSize,
        startAngle: 0,
        startRotation: 0,
      }
    },
    [editingId, selectedClipIds, selectClip, readAuthored],
  )

  const beginResize = useCallback(
    (e: ReactPointerEvent, item: (typeof items)[number]) => {
      e.stopPropagation()
      const { clip, layout, centerScreenX, centerScreenY } = item
      if (!selectedClipIds.has(clip.id)) selectClip(clip.id)
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
      const rootRect = rootRef.current?.getBoundingClientRect()
      // Pivot stays in RESOLVED space: the ratio must be measured from the
      // centre of the box the user actually sees, or the first pixel of drag
      // would register as a large jump in size.
      const centerClientX = (rootRect?.left ?? 0) + centerScreenX
      const centerClientY = (rootRect?.top ?? 0) + centerScreenY
      const authored = readAuthored(clip, layout)
      gestureRef.current = {
        type: 'resize',
        id: clip.id,
        trackId: authored.trackId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startCenter: authored.center,
        startTransform: authored.transform,
        centerClientX,
        centerClientY,
        startDist: Math.hypot(e.clientX - centerClientX, e.clientY - centerClientY),
        // Authored base × the drag's ratio. The painted size is
        // authoredFontSize × transform.scale, and `scale` is untouched by this
        // gesture, so a ratio of 2 doubles what is on screen *and* doubles the
        // authored size — the two stay in step whether or not an animation is
        // currently scaling the clip.
        startFontSize: authored.fontSize,
        startAngle: 0,
        startRotation: 0,
      }
    },
    [selectedClipIds, selectClip, readAuthored],
  )

  const beginRotate = useCallback(
    (e: ReactPointerEvent, item: (typeof items)[number]) => {
      e.stopPropagation()
      const { clip, layout, centerScreenX, centerScreenY } = item
      if (!selectedClipIds.has(clip.id)) selectClip(clip.id)
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
      const rootRect = rootRef.current?.getBoundingClientRect()
      // Same RESOLVED pivot as resize: angles are measured about the centre of
      // the box the user sees, so the knob tracks the cursor with no jump.
      const centerClientX = (rootRect?.left ?? 0) + centerScreenX
      const centerClientY = (rootRect?.top ?? 0) + centerScreenY
      const authored = readAuthored(clip, layout)
      gestureRef.current = {
        type: 'rotate',
        id: clip.id,
        trackId: authored.trackId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startCenter: authored.center,
        startTransform: authored.transform,
        centerClientX,
        centerClientY,
        startDist: 0,
        startFontSize: authored.fontSize,
        startAngle: Math.atan2(e.clientY - centerClientY, e.clientX - centerClientX),
        startRotation: authored.transform?.rotation ?? 0,
      }
    },
    [selectedClipIds, selectClip, readAuthored],
  )

  const startEditing = useCallback((clip: ActiveTextClip) => {
    selectClip(clip.id)
    setEditText(clip.content)
    setEditingId(clip.id)
  }, [selectClip])

  const commitEditing = useCallback(() => {
    // Content was streamed live via previewClip(); fold the session into one
    // undo entry. If nothing changed, commitInteraction() is a no-op.
    engine.commitInteraction('Edit text')
    setEditingId(null)
  }, [engine])

  const cancelEditing = useCallback(() => {
    // Roll the live-streamed content back to the gesture's start snapshot,
    // leaving no history entry.
    engine.cancelInteraction()
    setEditingId(null)
  }, [engine])

  // Leaving play mode / unmount: make sure no half-open gesture lingers.
  useEffect(() => {
    if (isPlaying && editingId) commitEditing()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying])

  const editingItem = editingId ? items.find((it) => it.clip.id === editingId) : undefined

  return (
    <div
      ref={rootRef}
      // Click-through by default; only the boxes (and the deselect backdrop when
      // something is active) opt back into pointer events.
      // zIndex keeps the overlay above the imperatively-appended WebGL canvas
      // regardless of DOM insertion order.
      className="absolute inset-0 z-[4] pointer-events-none overflow-hidden"
    >
      {!isPlaying && (ownsSelection || editingId) && (
        <div
          className="absolute inset-0 pointer-events-auto"
          onPointerDown={() => {
            if (editingId) commitEditing()
            clearSelection()
          }}
        />
      )}

      {!isPlaying &&
        items.map((item) => {
          const { clip, layout, rect } = item
          const selected = selectedClipIds.has(clip.id)
          const isEditing = editingId === clip.id
          // Dynamic: position, size, border-color, cursor all depend on runtime state
          const boxStyle: CSSProperties = {
            position: 'absolute',
            left: rect.left - BOX_PAD,
            top: rect.top - BOX_PAD,
            width: rect.width + BOX_PAD * 2,
            height: rect.height + BOX_PAD * 2,
            boxSizing: 'border-box',
            border: selected ? '1px solid var(--elah-selection-color, #4c9aff)' : '1px solid transparent',
            borderRadius: 2,
            cursor: isEditing ? 'text' : 'move',
            pointerEvents: isEditing ? 'none' : 'auto',
            touchAction: 'none',
            // Tilt the box exactly like the glyphs. The GPU/export pivot is
            // layout.center, which is NOT always this element's own centre
            // (textAlign can offset the glyph box, and the MIN_BOX_PX height
            // clamp grows downward only), so pin transform-origin to the true
            // pivot expressed in this element's local coords.
            transform: item.rotation ? `rotate(${item.rotation}rad)` : undefined,
            transformOrigin: `${item.centerScreenX - (rect.left - BOX_PAD)}px ${item.centerScreenY - (rect.top - BOX_PAD)}px`,
          }
          return (
            <div
              key={clip.id}
              style={boxStyle}
              onPointerDown={(e) => beginMove(e, clip, layout)}
              onPointerMove={handlePointerMove}
              onPointerUp={endGesture}
              onPointerCancel={endGesture}
              onDoubleClick={(e) => {
                e.stopPropagation()
                startEditing(clip)
              }}
            >
              {selected && !isEditing && (
                <>
                  {/* Stem connecting the box's top edge to the rotate knob. */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: -ROTATE_STEM_PX,
                      width: 1,
                      height: ROTATE_STEM_PX,
                      background: 'var(--elah-selection-color, #4c9aff)',
                      pointerEvents: 'none',
                    }}
                  />
                  <div
                    onPointerDown={(e) => beginRotate(e, item)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={endGesture}
                    onPointerCancel={endGesture}
                    title="Rotate (Shift: 15° steps)"
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: -(ROTATE_STEM_PX + ROTATE_KNOB_PX),
                      transform: 'translateX(-50%)',
                      width: ROTATE_KNOB_PX,
                      height: ROTATE_KNOB_PX,
                      background: 'var(--elah-selection-handle, #fff)',
                      border: '1px solid var(--elah-selection-color, #4c9aff)',
                      borderRadius: '50%',
                      cursor: 'grab',
                      pointerEvents: 'auto',
                      touchAction: 'none',
                    }}
                  />
                </>
              )}
              {selected && !isEditing && CORNERS.map((corner) => (
                <div
                  key={corner.key}
                  onPointerDown={(e) => beginResize(e, item)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={endGesture}
                  onPointerCancel={endGesture}
                  style={{
                    position: 'absolute',
                    ...corner.pos,
                    width: 10,
                    height: 10,
                    background: 'var(--elah-selection-handle, #fff)',
                    border: '1px solid var(--elah-selection-color, #4c9aff)',
                    borderRadius: 2,
                    cursor: corner.cursor,
                    pointerEvents: 'auto',
                    touchAction: 'none',
                  }}
                />
              ))}
            </div>
          )
        })}

      {!isPlaying && editingItem && (
        <textarea
          autoFocus
          value={editText}
          onChange={(e) => {
            const next = e.target.value
            setEditText(next)
            const found = engine.findClip(editingItem.clip.id)
            if (found) engine.previewClip(editingItem.clip.id, found.trackId, { content: next })
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onBlur={commitEditing}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              commitEditing()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              cancelEditing()
            }
          }}
          onFocus={(e) => e.currentTarget.select()}
          style={{
            // All dynamic: position/size derived from stage rect + scale,
            // font derived from clip's style, caretColor from clip's text color.
            position: 'absolute',
            left: editingItem.centerScreenX - (stage.width * (1 - 2 * SIDE_MARGIN) * scale) / 2,
            top: fit.y + editingItem.layout.box.y * scale,
            width: stage.width * (1 - 2 * SIDE_MARGIN) * scale,
            height: editingItem.layout.box.height * scale,
            // The GPU paints the glyphs live (content streamed via previewClip);
            // keep the textarea text invisible so they don't double up — only the
            // caret/selection chrome shows.
            color: 'transparent',
            caretColor: editingItem.layout.style.color,
            background: 'transparent',
            font: `${editingItem.layout.style.fontWeight} ${editingItem.layout.style.fontSize * scale}px ${editingItem.layout.style.fontFamily}`,
            lineHeight: `${editingItem.layout.lineAdvance * scale}px`,
            textAlign: editingItem.layout.style.textAlign,
            border: '1px solid var(--elah-selection-color, #4c9aff)',
            outline: 'none',
            resize: 'none',
            padding: 0,
            margin: 0,
            overflow: 'hidden',
            whiteSpace: 'pre-wrap',
            pointerEvents: 'auto',
            boxSizing: 'border-box',
          }}
        />
      )}
    </div>
  )
})

const CORNERS = [
  { key: 'nw', pos: { left: -5, top: -5 }, cursor: 'nwse-resize' as const },
  { key: 'ne', pos: { right: -5, top: -5 }, cursor: 'nesw-resize' as const },
  { key: 'sw', pos: { left: -5, bottom: -5 }, cursor: 'nesw-resize' as const },
  { key: 'se', pos: { right: -5, bottom: -5 }, cursor: 'nwse-resize' as const },
] satisfies ReadonlyArray<{ key: string; pos: CSSProperties; cursor: CSSProperties['cursor'] }>
