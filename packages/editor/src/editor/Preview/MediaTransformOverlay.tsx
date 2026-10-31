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
import { Crop as CropIcon, Move as MoveIcon } from 'lucide-react'
import type { Transform, ActiveImageClip, ActiveVideoClip, CropRect } from '@elah/core'
import {
  resolveDrawRect,
  transformFromContainRect,
  computeContainViewport,
  normalizeCrop,
} from '@elah/core'
import {
  useTimelineEngine,
  useSelectionStore,
  usePlaybackStore,
  useMediaLibraryStore,
} from '@elah/react'
import { useResolvedScene } from '../useResolvedScene'

/**
 * `<MediaTransformOverlay>` — the interactive transform surface for video and
 * image clips. The exact counterpart of `<TextOverlay>`, but for raster media:
 * click to select, drag to reposition, corner-drag to scale (uniform). The WebGL
 * canvas still does the rendering; this overlay only handles interaction and
 * writes the result back to the engine as a `transform`, so there is one renderer
 * and one source of truth — and because both the GPU renderer and the export
 * worker already resolve placement through `resolveDrawRect(transform, …)`, the
 * edits made here are honoured identically in preview and export with no extra
 * wiring.
 *
 * Coordinate spaces (identical to TextOverlay):
 *   - Stage space: the project's logical pixels (e.g. 1080×1920).
 *   - Screen space: CSS pixels inside this overlay (== the canvas display box).
 * `computeContainViewport` gives the letterboxed rect of the stage within the
 * overlay; the clip's stage-space draw rect (`resolveDrawRect`) maps through it.
 *
 * Two things differ from text and are worth calling out:
 *   1. The selection box needs the media's *content size* (natural width/height).
 *      Text derives its box from pure clip data; media reads dimensions from the
 *      MediaLibrary asset (populated at import). When unknown (asset still
 *      probing, or no assetId) we fall back to stage size — the box is then the
 *      full contained-on-stage rect until real dimensions arrive.
 *   2. A clip with no explicit transform is drawn *contained*. On the first
 *      gesture we bake the contain-equivalent transform (`transformFromContainRect`)
 *      as the gesture baseline, so grabbing the clip never moves it.
 *
 * A third mode, Crop, sits alongside resize: a small Resize/Crop toggle floats
 * above the selection box. In Crop mode the same 8 handles resize the clip's
 * `crop` window instead of its `transform.scale`, and dragging inside the box
 * pans the source underneath a fixed crop window (`transform` untouched) rather
 * than moving the clip. Both write through the identical `previewClip` →
 * `commitInteraction` gesture protocol as move/resize, so undo/redo, preview,
 * and export all fall out for free.
 */

/** Minimum on-screen hit/handle box so tiny clips stay grabbable. */
const MIN_BOX_PX = 28
/** Visual breathing room around the draw rect, in screen px. */
const BOX_PAD = 0
/** Smallest rendered content dimension, in stage px (scale lower bound). */
const MIN_RENDER_PX = 16
/** Largest rendered content dimension as a multiple of the larger stage dim. */
const MAX_RENDER_STAGE_MULTIPLE = 8
/** Smallest crop window on either axis, as a fraction of the full (uncropped) size. */
const MIN_CROP_FRACTION = 0.05

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const clamp01 = (v: number) => clamp(v, 0, 1)

/** Rotate a local (unrotated box) vector into stage space by `rotation` radians. */
function rotateLocalToStage(v: { x: number; y: number }, rotation: number) {
  const c = Math.cos(rotation)
  const s = Math.sin(rotation)
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c }
}
/** Inverse of `rotateLocalToStage` — stage-space vector into the box's local frame. */
function rotateStageToLocal(v: { x: number; y: number }, rotation: number) {
  return rotateLocalToStage(v, -rotation)
}

type MediaClip = ActiveVideoClip | ActiveImageClip
type OverlayMode = 'resize' | 'crop'

interface MediaItem {
  clip: MediaClip
  /** Content (native) size used for the draw rect; falls back to stage size. */
  contentW: number
  contentH: number
  /** Normalized (clamped, non-degenerate) crop window; full frame when unset. */
  crop: CropRect
  /** Full (uncropped) rendered size in stage px — the box crop resizing works against. */
  fullW: number
  fullH: number
  /** Screen-space selection box (axis-aligned, pre-rotation). */
  rect: { left: number; top: number; width: number; height: number }
  /** Screen-space centre of the draw rect (rotation pivot). */
  centerScreenX: number
  centerScreenY: number
  /** Clip rotation in radians, applied to the box as a CSS transform. */
  rotation: number
}

/**
 * `sx`/`sy` mark which side of the box a handle sits on, in local
 * (unrotated) box space: -1/0/1 on each axis. The handle opposite it
 * (`-sx,-sy`) is the anchor point that must stay fixed on screen while
 * dragging, which is what makes the resize feel corner/edge-anchored
 * instead of growing from the centre.
 */
interface HandleDef {
  key: string
  sx: -1 | 0 | 1
  sy: -1 | 0 | 1
  pos: CSSProperties
  cursor: CSSProperties['cursor']
}

interface Gesture {
  type: 'move' | 'resize' | 'crop-resize' | 'crop-pan'
  id: string
  trackId: string
  /** Explicit transform at gesture start — the clip's own, or the synthesized
   *  contain-equivalent when it had none. x/y are the centre (anchor 0.5). */
  base: Transform
  contentW: number
  contentH: number
  stageW: number
  stageH: number
  // move
  startClientX: number
  startClientY: number
  // resize — anchor point (opposite the dragged handle) fixed in stage px,
  // and the gesture-start half-extents to apply the pointer delta against.
  handle?: { sx: -1 | 0 | 1; sy: -1 | 0 | 1 }
  anchorStageX?: number
  anchorStageY?: number
  halfW0?: number
  halfH0?: number
  // crop-resize / crop-pan
  baseCrop?: CropRect
  fullW?: number
  fullH?: number
}

/** Memoised for the same reason as `TextOverlay` — no props, store-driven. */
export const MediaTransformOverlay = memo(function MediaTransformOverlay() {
  const engine = useTimelineEngine()
  const scene = useResolvedScene()
  const isPlaying = usePlaybackStore((s) => s.isPlaying)
  const selectedClipIds = useSelectionStore((s) => s.selectedClipIds)
  const selectClip = useSelectionStore((s) => s.selectClip)
  const clearSelection = useSelectionStore((s) => s.clearSelection)
  const assets = useMediaLibraryStore((s) => s.assets)

  const rootRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const gestureRef = useRef<Gesture | null>(null)
  const [mode, setMode] = useState<OverlayMode>('resize')

  // A fresh selection always starts in Resize — Crop is an explicit opt-in per
  // gesture, never a state that lingers onto whatever gets selected next.
  useEffect(() => {
    setMode('resize')
  }, [selectedClipIds])

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

  // Resolve each video/image clip's content size + on-screen box. Sorted by
  // the scene's own zIndex so overlapping boxes hit-test front-to-back the
  // same way the renderer draws them (the DOM's last child otherwise always
  // wins the pointer, regardless of which clip is actually on top).
  const items = useMemo<MediaItem[]>(() => {
    if (fit.width <= 0) return []
    const clips: MediaClip[] = [...scene.videos, ...scene.images].sort(
      (a, b) => a.zIndex - b.zIndex,
    )
    return clips.map((clip) => {
      // Content size lives on the MediaLibrary asset (set at import). The active
      // clip carries no assetId, so map back through the project clip.
      const assetId = engine.findClip(clip.id)?.clip.assetId
      const asset = assetId ? assets[assetId] : undefined
      const contentW = asset?.width ?? stage.width
      const contentH = asset?.height ?? stage.height
      const crop = normalizeCrop(clip.crop)

      const r = resolveDrawRect(clip.transform, stage.width, stage.height, contentW, contentH, clip.crop)
      const centerScreenX = fit.x + (r.x + r.width / 2) * scale
      const centerScreenY = fit.y + (r.y + r.height / 2) * scale

      const rawW = r.width * scale
      const rawH = r.height * scale
      const w = Math.max(rawW, MIN_BOX_PX)
      const h = Math.max(rawH, MIN_BOX_PX)
      const left = rawW < MIN_BOX_PX ? centerScreenX - w / 2 : fit.x + r.x * scale
      const top = rawH < MIN_BOX_PX ? centerScreenY - h / 2 : fit.y + r.y * scale

      // The full (uncropped) rendered size, derived from the already-resolved
      // cropped rect: r.width == fullW * crop.width by construction (both the
      // explicit-transform and contain-fallback paths scale from the same
      // cropped content size), so this holds without re-deriving the transform.
      const fullW = r.width / crop.width
      const fullH = r.height / crop.height

      return {
        clip,
        contentW,
        contentH,
        crop,
        fullW,
        fullH,
        rect: { left, top, width: w, height: h },
        centerScreenX,
        centerScreenY,
        rotation: r.rotation,
      }
    })
  }, [scene.videos, scene.images, assets, engine, stage.width, stage.height, fit, scale])

  const ownsSelection = useMemo(
    () => items.some((it) => selectedClipIds.has(it.clip.id)),
    [items, selectedClipIds],
  )

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent) => {
      const g = gestureRef.current
      if (!g) return
      if (g.type === 'move') {
        const dx = (e.clientX - g.startClientX) / scale
        const dy = (e.clientY - g.startClientY) / scale
        const x = clamp01(g.base.x + dx / g.stageW)
        const y = clamp01(g.base.y + dy / g.stageH)
        engine.previewClip(g.id, g.trackId, { transform: { ...g.base, x, y } })
      } else if (g.type === 'resize') {
        const h = g.handle!
        const halfW0 = g.halfW0!
        const halfH0 = g.halfH0!
        const rotation = g.base.rotation

        // Pointer delta in screen px -> stage px -> the box's own (unrotated)
        // local frame, since the handle is dragged along the box's own axes.
        const dxStage = (e.clientX - g.startClientX) / scale
        const dyStage = (e.clientY - g.startClientY) / scale
        const local = rotateStageToLocal({ x: dxStage, y: dyStage }, rotation)

        const minHalf = MIN_RENDER_PX / 2
        const maxHalf = (MAX_RENDER_STAGE_MULTIPLE * Math.max(g.stageW, g.stageH)) / 2

        let newHalfW = h.sx !== 0 ? clamp(halfW0 + h.sx * local.x, minHalf, maxHalf) : halfW0
        let newHalfH = h.sy !== 0 ? clamp(halfH0 + h.sy * local.y, minHalf, maxHalf) : halfH0

        if (e.shiftKey) {
          const ratioW = newHalfW / halfW0
          const ratioH = newHalfH / halfH0
          const ratio = h.sx !== 0 && h.sy !== 0 ? Math.max(ratioW, ratioH) : h.sx !== 0 ? ratioW : ratioH
          newHalfW = clamp(halfW0 * ratio, minHalf, maxHalf)
          newHalfH = clamp(halfH0 * ratio, minHalf, maxHalf)
        }

        // Recompute the centre so the opposite corner/edge (the fixed anchor
        // captured at gesture start) stays put on screen.
        const rotatedHandleVec = rotateLocalToStage(
          { x: h.sx * newHalfW, y: h.sy * newHalfH },
          rotation,
        )
        const centerX = g.anchorStageX! + rotatedHandleVec.x
        const centerY = g.anchorStageY! + rotatedHandleVec.y

        const scaleX = (newHalfW * 2) / Math.max(1, g.contentW * g.base.scale)
        const scaleY = (newHalfH * 2) / Math.max(1, g.contentH * g.base.scale)

        engine.previewClip(g.id, g.trackId, {
          transform: {
            ...g.base,
            x: centerX / g.stageW,
            y: centerY / g.stageH,
            scaleX,
            scaleY,
          },
        })
      } else if (g.type === 'crop-resize') {
        const h = g.handle!
        const baseCrop = g.baseCrop!
        const fullW = g.fullW!
        const fullH = g.fullH!
        const rotation = g.base.rotation

        const dxStage = (e.clientX - g.startClientX) / scale
        const dyStage = (e.clientY - g.startClientY) / scale
        const local = rotateStageToLocal({ x: dxStage, y: dyStage }, rotation)

        const visW0 = fullW * baseCrop.width
        const visH0 = fullH * baseCrop.height
        const minVisW = MIN_CROP_FRACTION * fullW
        const minVisH = MIN_CROP_FRACTION * fullH

        const newVisW = h.sx !== 0 ? clamp(visW0 + h.sx * local.x, minVisW, fullW) : visW0
        const newVisH = h.sy !== 0 ? clamp(visH0 + h.sy * local.y, minVisH, fullH) : visH0

        const newCropW = newVisW / fullW
        const newCropH = newVisH / fullH

        // The edge opposite the dragged handle stays fixed in crop space too.
        let newCropX = baseCrop.x
        if (h.sx === -1) newCropX = baseCrop.x + (baseCrop.width - newCropW)
        newCropX = clamp(newCropX, 0, 1 - newCropW)

        let newCropY = baseCrop.y
        if (h.sy === -1) newCropY = baseCrop.y + (baseCrop.height - newCropH)
        newCropY = clamp(newCropY, 0, 1 - newCropH)

        // Same anchor-preserving centre recompute as plain resize, but against
        // the new *visible* half-extents (crop shrinks the box; scale is untouched).
        const rotatedHandleVec = rotateLocalToStage(
          { x: h.sx * (newVisW / 2), y: h.sy * (newVisH / 2) },
          rotation,
        )
        const centerX = g.anchorStageX! + rotatedHandleVec.x
        const centerY = g.anchorStageY! + rotatedHandleVec.y

        engine.previewClip(g.id, g.trackId, {
          crop: normalizeCrop({ x: newCropX, y: newCropY, width: newCropW, height: newCropH }),
          transform: { ...g.base, x: centerX / g.stageW, y: centerY / g.stageH },
        })
      } else {
        // crop-pan: the crop window (and therefore the box) stays fixed on
        // stage; only the source slides underneath it. `transform` untouched.
        const baseCrop = g.baseCrop!
        const fullW = g.fullW!
        const fullH = g.fullH!
        const rotation = g.base.rotation

        const dxStage = (e.clientX - g.startClientX) / scale
        const dyStage = (e.clientY - g.startClientY) / scale
        const local = rotateStageToLocal({ x: dxStage, y: dyStage }, rotation)

        const cropX = clamp(baseCrop.x - local.x / fullW, 0, 1 - baseCrop.width)
        const cropY = clamp(baseCrop.y - local.y / fullH, 0, 1 - baseCrop.height)

        engine.previewClip(g.id, g.trackId, {
          crop: { ...baseCrop, x: cropX, y: cropY },
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
      const label = g.type === 'move' ? 'Move clip' : g.type === 'resize' ? 'Resize clip' : 'Crop clip'
      engine.commitInteraction(label)
    },
    [engine],
  )

  /** The explicit transform to apply gesture deltas to: the clip's own, or the
   *  contain-equivalent baked from the *cropped* content size so grabbing it
   *  never jumps, in either Resize or Crop mode. */
  const baseTransformFor = useCallback(
    (item: MediaItem): Transform =>
      item.clip.transform ??
      transformFromContainRect(
        item.contentW * item.crop.width,
        item.contentH * item.crop.height,
        stage.width,
        stage.height,
      ),
    [stage.width, stage.height],
  )

  const beginMove = useCallback(
    (e: ReactPointerEvent, item: MediaItem) => {
      e.stopPropagation()
      if (!selectedClipIds.has(item.clip.id)) selectClip(item.clip.id)
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
      gestureRef.current = {
        type: 'move',
        id: item.clip.id,
        trackId: item.clip.trackId,
        base: baseTransformFor(item),
        contentW: item.contentW,
        contentH: item.contentH,
        stageW: stage.width,
        stageH: stage.height,
        startClientX: e.clientX,
        startClientY: e.clientY,
      }
    },
    [selectedClipIds, selectClip, baseTransformFor, stage.width, stage.height],
  )

  const beginResize = useCallback(
    (e: ReactPointerEvent, item: MediaItem, handle: HandleDef) => {
      e.stopPropagation()
      if (!selectedClipIds.has(item.clip.id)) selectClip(item.clip.id)
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
      const base = baseTransformFor(item)
      const halfW0 = (item.contentW * base.scale * (base.scaleX ?? 1)) / 2
      const halfH0 = (item.contentH * base.scale * (base.scaleY ?? 1)) / 2
      const centerX = base.x * stage.width
      const centerY = base.y * stage.height
      // Stage-space position of the corner/edge opposite the dragged handle —
      // this point stays fixed for the whole gesture.
      const rotatedAnchor = rotateLocalToStage(
        { x: -handle.sx * halfW0, y: -handle.sy * halfH0 },
        base.rotation,
      )
      gestureRef.current = {
        type: 'resize',
        id: item.clip.id,
        trackId: item.clip.trackId,
        base,
        contentW: item.contentW,
        contentH: item.contentH,
        stageW: stage.width,
        stageH: stage.height,
        startClientX: e.clientX,
        startClientY: e.clientY,
        handle: { sx: handle.sx, sy: handle.sy },
        anchorStageX: centerX + rotatedAnchor.x,
        anchorStageY: centerY + rotatedAnchor.y,
        halfW0,
        halfH0,
      }
    },
    [selectedClipIds, selectClip, baseTransformFor, stage.width, stage.height],
  )

  const beginCropResize = useCallback(
    (e: ReactPointerEvent, item: MediaItem, handle: HandleDef) => {
      e.stopPropagation()
      if (!selectedClipIds.has(item.clip.id)) selectClip(item.clip.id)
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
      const base = baseTransformFor(item)
      const baseCrop = item.crop
      const visW0 = item.fullW * baseCrop.width
      const visH0 = item.fullH * baseCrop.height
      const halfW0 = visW0 / 2
      const halfH0 = visH0 / 2
      const centerX = base.x * stage.width
      const centerY = base.y * stage.height
      const rotatedAnchor = rotateLocalToStage(
        { x: -handle.sx * halfW0, y: -handle.sy * halfH0 },
        base.rotation,
      )
      gestureRef.current = {
        type: 'crop-resize',
        id: item.clip.id,
        trackId: item.clip.trackId,
        base,
        contentW: item.contentW,
        contentH: item.contentH,
        stageW: stage.width,
        stageH: stage.height,
        startClientX: e.clientX,
        startClientY: e.clientY,
        handle: { sx: handle.sx, sy: handle.sy },
        anchorStageX: centerX + rotatedAnchor.x,
        anchorStageY: centerY + rotatedAnchor.y,
        baseCrop,
        fullW: item.fullW,
        fullH: item.fullH,
      }
    },
    [selectedClipIds, selectClip, baseTransformFor, stage.width, stage.height],
  )

  const beginCropPan = useCallback(
    (e: ReactPointerEvent, item: MediaItem) => {
      e.stopPropagation()
      if (!selectedClipIds.has(item.clip.id)) selectClip(item.clip.id)
      ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
      gestureRef.current = {
        type: 'crop-pan',
        id: item.clip.id,
        trackId: item.clip.trackId,
        base: baseTransformFor(item),
        contentW: item.contentW,
        contentH: item.contentH,
        stageW: stage.width,
        stageH: stage.height,
        startClientX: e.clientX,
        startClientY: e.clientY,
        baseCrop: item.crop,
        fullW: item.fullW,
        fullH: item.fullH,
      }
    },
    [selectedClipIds, selectClip, baseTransformFor, stage.width, stage.height],
  )

  return (
    <div
      ref={rootRef}
      // Click-through by default; only the boxes (and the deselect backdrop while
      // a media clip is selected) opt back into pointer events. zIndex keeps the
      // overlay above the imperatively-appended WebGL canvas regardless of DOM
      // insertion order; TextOverlay sits one layer above this.
      className="absolute inset-0 z-[2] pointer-events-none overflow-hidden"
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
          const cropping = selected && mode === 'crop'
          // Dynamic: position, size, border-color all depend on runtime state
          const boxStyle: CSSProperties = {
            position: 'absolute',
            left: rect.left - BOX_PAD,
            top: rect.top - BOX_PAD,
            width: rect.width + BOX_PAD * 2,
            height: rect.height + BOX_PAD * 2,
            boxSizing: 'border-box',
            border: selected ? '1px solid var(--elah-selection-color, #4c9aff)' : '1px solid transparent',
            borderRadius: 2,
            cursor: cropping ? 'grab' : 'move',
            pointerEvents: 'auto',
            touchAction: 'none',
            transform: item.rotation ? `rotate(${item.rotation}rad)` : undefined,
            zIndex: clip.zIndex,
          }
          return (
            <div key={clip.id}>
              <div
                style={boxStyle}
                onPointerDown={(e) => (cropping ? beginCropPan(e, item) : beginMove(e, item))}
                onPointerMove={handlePointerMove}
                onPointerUp={endGesture}
                onPointerCancel={endGesture}
              >
                {cropping && item.crop.width < 1 - 1e-3 && (
                  // Dashed outline of the full (uncropped) source extent, so the
                  // user can see how much headroom is left to pan into. Purely
                  // visual — clipped at the stage edge by the overlay's own
                  // overflow-hidden, which is the effect we want.
                  <div
                    style={{
                      position: 'absolute',
                      left: -(item.crop.x / item.crop.width) * rect.width,
                      top: -(item.crop.y / item.crop.height) * rect.height,
                      width: rect.width / item.crop.width,
                      height: rect.height / item.crop.height,
                      border: '1px dashed var(--elah-selection-color, #4c9aff)',
                      opacity: 0.4,
                      pointerEvents: 'none',
                    }}
                  />
                )}
                {selected &&
                  HANDLES.map((handle) => (
                    <div
                      key={handle.key}
                      onPointerDown={(e) =>
                        cropping ? beginCropResize(e, item, handle) : beginResize(e, item, handle)
                      }
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

              {selected && (
                <ModeToggle
                  mode={mode}
                  onChange={setMode}
                  left={item.centerScreenX}
                  top={rect.top}
                  zIndex={clip.zIndex + 1}
                />
              )}
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

/** The floating Resize/Crop segmented toggle anchored above a selected clip's box. */
function ModeToggle({
  mode,
  onChange,
  left,
  top,
  zIndex,
}: {
  mode: OverlayMode
  onChange: (mode: OverlayMode) => void
  left: number
  top: number
  zIndex: number
}) {
  const segment = (value: OverlayMode, Icon: typeof CropIcon, label: string) => {
    const active = mode === value
    return (
      <button
        key={value}
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onChange(value)}
        title={label}
        aria-pressed={active}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          border: 'none',
          borderRadius: 5,
          padding: '3px 8px',
          fontSize: 11,
          lineHeight: 1,
          fontWeight: 500,
          cursor: 'pointer',
          color: active ? 'var(--elah-popover-accent-text, #a5b4fc)' : 'var(--elah-text-muted, #9ca3af)',
          background: active ? 'var(--elah-selection-color, #4c9aff)' : 'transparent',
          opacity: active ? 1 : 0.9,
        }}
      >
        <Icon size={12} />
        {label}
      </button>
    )
  }

  return (
    <div
      className="pointer-events-auto"
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        left,
        top: top - 8,
        transform: 'translate(-50%, -100%)',
        display: 'flex',
        gap: 2,
        padding: 2,
        borderRadius: 7,
        background: 'var(--elah-popover-bg, #1a1f2b)',
        border: '1px solid var(--elah-popover-border, #2d3548)',
        boxShadow: 'var(--elah-popover-shadow, 0 8px 32px rgba(0, 0, 0, 0.6))',
        zIndex,
        whiteSpace: 'nowrap',
      }}
    >
      {segment('resize', MoveIcon, 'Resize')}
      {segment('crop', CropIcon, 'Crop')}
    </div>
  )
}
