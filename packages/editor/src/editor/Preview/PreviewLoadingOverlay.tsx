import { useClipLoadStore } from '@elah/react'
import type { ClipLoadState } from '@elah/core'

/**
 * Reduce the whole per-clip map to the one thing this overlay draws.
 *
 * A selector rather than a render-time reduce because the store is written per
 * clip: without it, a four-clip scene re-renders this component four times to
 * arrive at the same answer. `'error'` outranks `'loading'` — a clip that will
 * never open is worth saying so about even while another is still opening.
 */
function summarise(byClipId: Record<string, ClipLoadState>): ClipLoadState | null {
  let sawLoading = false
  for (const state of Object.values(byClipId)) {
    if (state === 'error') return 'error'
    if (state === 'loading') sawLoading = true
  }
  return sawLoading ? 'loading' : null
}

/**
 * What the preview shows while a video clip's decoder is opening.
 *
 * Until the first frame is decoded there is nothing to paint, and the canvas
 * stays at its clear colour — which reads as "the editor is broken", not as
 * "this is still loading", and is the whole complaint behind this overlay. The
 * renderer reports readiness at clip boundaries (see `RendererOptions.onClipLoad`),
 * so this subscribes to a handful of updates per clip rather than to the render
 * loop.
 *
 * Sits below the GL-recovery layer (`z-10`): a lost context is the more
 * important thing to say, and it would be absurd to promise a frame is coming
 * while the renderer is gone. `pointer-events-none` so the transform overlays
 * underneath stay grabbable while a clip loads.
 */
export function PreviewLoadingOverlay() {
  const state = useClipLoadStore((s) => summarise(s.byClipId))

  if (state === null) return null

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[9] flex flex-col items-center justify-center gap-2"
      data-testid="preview-media-loading"
      role="status"
      aria-live="polite"
    >
      {state === 'loading' ? (
        <>
          <span
            className="h-7 w-7 animate-spin rounded-full border-2 border-[color:var(--elah-spinner-track,rgba(255,255,255,0.25))] border-t-[color:var(--elah-spinner-head,rgba(255,255,255,0.9))]"
            aria-hidden="true"
          />
          <span className="sr-only">Loading media</span>
        </>
      ) : (
        <span className="rounded-md bg-[var(--elah-overlay-scrim,rgba(0,0,0,0.7))] px-3 py-1.5 text-sm text-[color:var(--elah-overlay-text,#ffffff)]">
          Couldn&apos;t load this video
        </span>
      )}
    </div>
  )
}
