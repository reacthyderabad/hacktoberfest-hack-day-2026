import {
  memo,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { Transform, ActiveShapeClip } from '@elah/core'
import { computeContainViewport } from '@elah/core'
import { useTimelineEngine, useSelectionStore, usePlaybackStore } from '@elah/react'
import { useResolvedScene } from '../useResolvedScene'

/**
 * `<ShapeOverlay>` — the interactive transform surface for shape clips
 * (rect / circle / triangle). The counterpart of `<TextOverlay>` and
 * `<MediaTransformOverlay>`, but for synthetic shapes: click to select, drag to
 * reposition, corner-drag to scale (uniform). The WebGL canvas still does the
 * rendering (via the GPU ShapeLayer); this overlay only handles interaction and
 * writes the result back to the engine as a `transform`, so there is one
 * renderer and one source of truth.
 *
 * Geometry mirrors ShapeLayer exactly so the selection box hugs the painted
 * shape: the shape is drawn into a centred square whose side is
 * `scale * min(stageW, stageH)`, centred at the normalized transform (x, y).
 * Defaults (no transform) match ShapeLayer: centre (0.5, 0.5), scale 0.5.
 */

/** Default normalized centre + scale, matching ShapeLayer's render defaults. */
const DEFAULT_SCALE = 0.5
const DEFAULT_CENTER = 0.5
/** Minimum on-screen hit/handle box so tiny shapes stay grabbable. */
const MIN_BOX_PX = 28
/** Uniform scale bounds (fraction of the stage's short side). */
const MIN_SCALE = 0.05
const MAX_SCALE = 4

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const clamp01 = (v: number) => clamp(v, 0, 1)

function baseTransform(t: Transform | undefined): Transform {
  return {
    x: t?.x ?? DEFAULT_CENTER,
    y: t?.y ?? DEFAULT_CENTER,
    scale: t?.scale ?? DEFAULT_SCALE,
    rotation: t?.rotation ?? 0,
    anchor: t?.anchor ?? { x: 0.5, y: 0.5 },
    scaleX: t?.scaleX ?? 1,
    scaleY: t?.scaleY ?? 1,
  }
}

/** Same handle model as MediaTransformOverlay — see its HandleDef doc comment. */
interface HandleDef {
  key: string
  sx: -1 | 0 | 1
  sy: -1 | 0 | 1
  pos: CSSProperties
  cursor: CSSProperties['cursor']
}

interface ShapeItem {
  clip: ActiveShapeClip
  /** Screen-space selection box. */
  rect: { left: number; top: number; width: number; height: number }
  /** Screen-space centre of the shape (scale pivot). */
  centerScreenX: number
  centerScreenY: number
}

/**
 * The gesture's starting point, read from the clip as AUTHORED rather than as
 * resolved for the current frame. See {@link ShapeOverlay}'s `readAuthored`.
 */
interface AuthoredBase {
  trackId: string
  /** AUTHORED transform, with ShapeLayer's render defaults filled in. */
  base: Transform
}

interface Gesture {
  type: 'move' | 'resize'
  id: string
  trackId: string
  /**
   * AUTHORED transform at gesture start (the raw clip's own, or the synthesized
   * default) — never the resolver's animated value for the current frame.
   * Every `previewClip` write spreads this, so the whole transform round-trips
   * in authored space.
   */
  base: Transform
  stageW: number
  stageH: number
  // move
  startClientX: number
  startClientY: number
  // resize — ShapeLayer never rotates shapes, so no rotation term is needed;
  // the anchor (opposite the dragged handle) is simply fixed in stage px.
  // These are all AUTHORED-space quantities, derived from `base`, so the value
  // written back stays in the same space it was read from.
  handle?: { sx: -1 | 0 | 1; sy: -1 | 0 | 1 }
  anchorStageX?: number
  anchorStageY?: number
  halfW0?: number
  halfH0?: number
}

/** Memoised for the same reason as `TextOverlay` — no props, store-driven. */
export const ShapeOverlay = memo(function ShapeOverlay() {
  const engine = useTimelineEngine()
  const scene = useResolvedScene()
  const isPlaying = usePlaybackStore((s) => s.isPlaying)
  const selectedClipIds = useSelectionStore((s) => s.selectedClipIds)
  const selectClip = useSelectionStore((s) => s.selectClip)
  const clearSelection = useSelectionStore((s) => s.clearSelection)

  const rootRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const gestureRef = useRef<Gesture | null>(null)

  // Track the overlay's display size (== canvas display size) in CSS pixels.
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const apply = () => setSize({ width: el.clientWidth, height: el.clientHeight })
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

  // Resolve each shape clip's on-screen box. The shape lives in a centred box
  // whose base side is `scale * shortSide`, stretched per-axis by scaleX/scaleY
  // — same as ShapeLayer paints.
  //
  // Deliberately RESOLVED: this drives hit testing and the visible selection
  // box, which must hug the pixels the GPU actually painted this frame, animated
  // transform and all. Gesture *start values* come from the authored clip
  // instead — see `readAuthored` below.
  const items = useMemo<ShapeItem[]>(() => {
    if (fit.width <= 0) return []
    const shortSide = Math.min(stage.width, stage.height)
    return scene.shapes.map((clip) => {
      const t = baseTransform(clip.transform)
      const baseSideStage = t.scale * shortSide
      const widthStage = baseSideStage * (t.scaleX ?? 1)
      const heightStage = baseSideStage * (t.scaleY ?? 1)
      const cxStage = t.x * stage.width
      const cyStage = t.y * stage.height

      const centerScreenX = fit.x + cxStage * scale
      const centerScreenY = fit.y + cyStage * scale
      const rawW = widthStage * scale
      const rawH = heightStage * scale
      const w = Math.max(rawW, MIN_BOX_PX)
      const h = Math.max(rawH, MIN_BOX_PX)
      const left = centerScreenX - w / 2
      const top = centerScreenY - h / 2

      return {
        clip,
        rect: { left, top, width: w, height: h },
        centerScreenX,
        centerScreenY,
      }
    })
  }, [scene.shapes, stage.width, stage.height, fit, scale])

  const ownsSelection = useMemo(
    () => items.some((it) => selectedClipIds.has(it.clip.id)),
    [items, selectedClipIds],
  )

  /**
   * Read a clip as AUTHORED, not as resolved for the current frame.
   *
   * `scene.shapes[]` carries what the resolver decided this clip looks like *at
   * this frame*: entry/exit animations overwrite `transform` there exactly the
   * way they already overwrite `opacity` (resolveTimeline.ts:239-252 copies the
   * transform through today, and `Clip.shapeAnimation` shares the `TextAnimation`
   * type, so transform-animating kinds reach shapes too). Those values are
   * correct to draw with and wrong to edit from — `previewClip` writes to the raw
   * project clip (TimelineEngine.ts:348-359), so seeding a gesture from the
   * resolved value would commit one frame of the animation as the clip's authored
   * transform, and the shape would jump the moment the playhead left the ramp.
   *
   * `engine.findClip` (TimelineEngine.ts:152-158) reads the raw clip, putting the
   * read and the write back in the same space. Deliberately agnostic about
   * *which* animations exist: any resolver-produced transform is bypassed.
   *
   * `baseTransform` is applied on top so the returned value carries ShapeLayer's
   * render defaults (centre 0.5/0.5, scale 0.5, scaleX/scaleY 1 — ShapeLayer.ts:58-63)
   * rather than `undefined`s, which is what the gesture arithmetic needs.
   */
  const readAuthored = useCallback(
    (clip: ActiveShapeClip): AuthoredBase => {
      const found = engine.findClip(clip.id)
      if (!found) {
        // The scene outran the project (clip removed between resolve and
        // pointerdown). Degrade to the resolved values instead of dropping the
        // gesture — same behaviour this file had before, never a crash.
        return { trackId: clip.trackId, base: baseTransform(clip.transform) }
      }
      return { trackId: found.trackId, base: baseTransform(found.clip.transform) }
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
        // drag delta to the authored base therefore moves the painted shape by
        // exactly that delta: it tracks the cursor 1:1 and the value committed is
        // the authored centre the user aimed at, with no animation baked in.
        //
        // Accepted oddity: an animation that *interpolates toward* the authored
        // centre (a slide that lerps from off-stage to the authored spot)
        // propagates only a fraction of an authored-space change while the
        // playhead sits mid-ramp, so mid-ramp the shape lags behind the cursor
        // for the length of the drag. That is the lesser evil — the alternative
        // is dragging in rendered space, which bakes the animation into the saved
        // clip permanently. The lag is confined to one paused frame.
        const dx = (e.clientX - g.startClientX) / scale
        const dy = (e.clientY - g.startClientY) / scale
        const x = clamp01(g.base.x + dx / g.stageW)
        const y = clamp01(g.base.y + dy / g.stageH)
        engine.previewClip(g.id, g.trackId, { transform: { ...g.base, x, y } })
      } else {
        // Same authored-base rule as the move branch, applied to the half-extents.
        // Unlike TextOverlay's resize — which measures a *ratio* from the visible
        // (resolved) centre, so it needs a resolved pivot — this gesture is purely
        // additive: `halfW0 + sx*dxStage`. There is no pivot to keep in resolved
        // space, so every term here (halfW0/halfH0, anchorStageX/Y) is authored.
        //
        // For a translation-only animation the result is exact in rendered space:
        // the anchor edge is authored-pinned, rendered == authored + offset, so the
        // painted edge stays put and the dragged edge follows the cursor 1:1. An
        // animation that *scales* the shape mid-ramp would grow the painted box by
        // the delta times the animation's scale factor — the same accepted mid-ramp
        // oddity documented on the move branch, and for the same reason.
        const h = g.handle!
        const halfW0 = g.halfW0!
        const halfH0 = g.halfH0!

        const dxStage = (e.clientX - g.startClientX) / scale
        const dyStage = (e.clientY - g.startClientY) / scale

        const shortSide = Math.min(g.stageW, g.stageH)
        const minHalf = (MIN_SCALE * shortSide) / 2
        const maxHalf = (MAX_SCALE * shortSide) / 2

        let newHalfW = h.sx !== 0 ? clamp(halfW0 + h.sx * dxStage, minHalf, maxHalf) : halfW0
        let newHalfH = h.sy !== 0 ? clamp(halfH0 + h.sy * dyStage, minHalf, maxHalf) : halfH0

        if (e.shiftKey) {
          const ratioW = newHalfW / halfW0
          const ratioH = newHalfH / halfH0
          const ratio = h.sx !== 0 && h.sy !== 0 ? Math.max(ratioW, ratioH) : h.sx !== 0 ? ratioW : ratioH
          newHalfW = clamp(halfW0 * ratio, minHalf, maxHalf)
          newHalfH = clamp(halfH0 * ratio, minHalf, maxHalf)
        }

        // No rotation on shapes (ShapeLayer always draws axis-aligned), so the
        // anchor stays fixed by simple translation — no rotate/un-rotate needed.
        const centerX = g.anchorStageX! + h.sx * newHalfW
        const centerY = g.anchorStageY! + h.sy * newHalfH

        const baseHalf = (g.base.scale * shortSide) / 2
        const scaleX = newHalfW / Math.max(1, baseHalf)
        const scaleY = newHalfH / Math.max(1, baseHalf)

        engine.previewClip(g.id, g.trackId, {
          transform: {
            ...g.base,
            x: centerX / g.stageW,
            y: centerY / g.stageH,
            scaleX,
            scaleY,
          },
        })
      }
    },
    [engine, scale],
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
      engine.commitInteraction(g.type === 'move' ? 'Move shape' : 'Resize shape')
    },
    [engine],
  )

  const beginMove = useCallback(
    (e: ReactPointerEvent, item: ShapeItem) => {
      e.stopPropagation()
      if (!selectedClipIds.has(item.clip.id)) selectClip(item.clip.id)
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
      const authored = readAuthored(item.clip)
      gestureRef.current = {
        type: 'move',
        id: item.clip.id,
        trackId: authored.trackId,
        base: authored.base,
        stageW: stage.width,
        stageH: stage.height,
        startClientX: e.clientX,
        startClientY: e.clientY,
      }
    },
    [selectedClipIds, selectClip, stage.width, stage.height, readAuthored],
  )

  const beginResize = useCallback(
    (e: ReactPointerEvent, item: ShapeItem, handle: HandleDef) => {
      e.stopPropagation()
      if (!selectedClipIds.has(item.clip.id)) selectClip(item.clip.id)
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
      // Authored geometry. `item.rect` (the box the handles are pinned to) stays
      // resolved so hit testing lands on the shape the user can see; only the
      // numbers the gesture *writes back* come from the authored clip.
      const { trackId, base } = readAuthored(item.clip)
      const shortSide = Math.min(stage.width, stage.height)
      const halfW0 = (base.scale * shortSide * (base.scaleX ?? 1)) / 2
      const halfH0 = (base.scale * shortSide * (base.scaleY ?? 1)) / 2
      const centerX = base.x * stage.width
      const centerY = base.y * stage.height
      gestureRef.current = {
        type: 'resize',
        id: item.clip.id,
        trackId,
        base,
        stageW: stage.width,
        stageH: stage.height,
        startClientX: e.clientX,
        startClientY: e.clientY,
        handle: { sx: handle.sx, sy: handle.sy },
        anchorStageX: centerX - handle.sx * halfW0,
        anchorStageY: centerY - handle.sy * halfH0,
        halfW0,
        halfH0,
      }
    },
    [selectedClipIds, selectClip, stage.width, stage.height, readAuthored],
  )

  return (
    <div
      ref={rootRef}
      // Click-through by default; only the boxes (and the deselect backdrop while
      // a shape clip is selected) opt back into pointer events. zIndex keeps the
      // overlay above the imperatively-appended WebGL canvas; TextOverlay sits
      // one layer above so text editing wins when they overlap.
      className="absolute inset-0 z-[3] pointer-events-none overflow-hidden"
    >
      {!isPlaying && ownsSelection && (
        <div
          className="absolute inset-0 pointer-events-auto"
          onPointerDown={() => clearSelection()}
        />
      )}

      {!isPlaying &&
        items.map((item) => {
          const { clip, rect } = item
          const selected = selectedClipIds.has(clip.id)
          // Dynamic: position, size, border-color all depend on runtime state.
          const boxStyle: CSSProperties = {
            position: 'absolute',
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            boxSizing: 'border-box',
            border: selected
              ? '1px solid var(--elah-selection-color, #4c9aff)'
              : '1px solid transparent',
            borderRadius: 2,
            cursor: 'move',
            pointerEvents: 'auto',
            touchAction: 'none',
          }
          return (
            <div
              key={clip.id}
              style={boxStyle}
              onPointerDown={(e) => beginMove(e, item)}
              onPointerMove={handlePointerMove}
              onPointerUp={endGesture}
              onPointerCancel={endGesture}
            >
              {selected &&
                HANDLES.map((handle) => (
                  <div
                    key={handle.key}
                    onPointerDown={(e) => beginResize(e, item, handle)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={endGesture}
                    onPointerCancel={endGesture}
                    style={{
                      position: 'absolute',
                      ...handle.pos,
                      width: 10,
                      height: 10,
                      background: 'var(--elah-selection-handle, #fff)',
                      border: '1px solid var(--elah-selection-color, #4c9aff)',
                      borderRadius: 2,
                      cursor: handle.cursor,
                      pointerEvents: 'auto',
                      touchAction: 'none',
                    }}
                  />
                ))}
            </div>
          )
        })}
    </div>
  )
})

/** 4 corners + 4 edges, each free to stretch its own axis/axes independently. */
const HANDLES: HandleDef[] = [
  { key: 'nw', sx: -1, sy: -1, pos: { left: -5, top: -5 }, cursor: 'nwse-resize' },
  { key: 'n', sx: 0, sy: -1, pos: { left: '50%', top: -5, transform: 'translateX(-50%)' }, cursor: 'ns-resize' },
  { key: 'ne', sx: 1, sy: -1, pos: { right: -5, top: -5 }, cursor: 'nesw-resize' },
  { key: 'e', sx: 1, sy: 0, pos: { right: -5, top: '50%', transform: 'translateY(-50%)' }, cursor: 'ew-resize' },
  { key: 'se', sx: 1, sy: 1, pos: { right: -5, bottom: -5 }, cursor: 'nwse-resize' },
  { key: 's', sx: 0, sy: 1, pos: { left: '50%', bottom: -5, transform: 'translateX(-50%)' }, cursor: 'ns-resize' },
  { key: 'sw', sx: -1, sy: 1, pos: { left: -5, bottom: -5 }, cursor: 'nesw-resize' },
  { key: 'w', sx: -1, sy: 0, pos: { left: -5, top: '50%', transform: 'translateY(-50%)' }, cursor: 'ew-resize' },
]
