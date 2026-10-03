# @elah/core

Framework-agnostic video timeline engine. No React. No renderer. Just the pure logic layer — project state, playback, frame resolution, and media management.

Used internally by `@elah/react`, `@elah/timeline`, and `@elah/editor`, but can be consumed directly for custom rendering pipelines or headless environments.

React hooks are **not** in this package — they live in [`@elah/react`](https://www.npmjs.com/package/@elah/react), which wraps the stores below for component use.

[![npm](https://img.shields.io/npm/v/@elah/core)](https://www.npmjs.com/package/@elah/core)
[![gzip size](https://img.shields.io/badge/gzip-~41%20KiB-brightgreen)](../../BUNDLE_STRATEGY.md)
[![license](https://img.shields.io/badge/license-Apache--2.0-blue)](https://github.com/elahlabs/elah/blob/main/LICENSE)

---

## Install

```bash
npm install @elah/core
```

**Bundle size:** ~41 KiB gzipped, minified and tree-shaken (an engine-only app starts at ~11 KiB). Runtime deps: `immer` (~5 KiB gz), `zustand` (~3 KiB gz), and `mediabunny` (~159 KiB gz), which the demuxer and export worker load lazily on first decode or export — except through `createDefaultDemuxerFactory`, which imports it statically. See [BUNDLE_STRATEGY.md](../../BUNDLE_STRATEGY.md) for the measured shapes.

---

## What's inside

| Module | Description |
|---|---|
| `TimelineEngine` | Manages project state — tracks, clips, undo/redo |
| `PlaybackEngine` | Frame-accurate playback clock |
| `resolveTimeline` | Pure function — project → active scene at a given frame |
| `GpuRenderer` | WebGL2 renderer for video, image, text, shape, and freehand layers |
| `AudioPlaybackController` | Multi-track audio mixer on the playback clock |
| `tracksStore` | Vanilla Zustand store mirroring project state — bind it with `useTracksStore` from `@elah/react` |
| `playbackStore` | Vanilla Zustand store mirroring playback state — bind it with `usePlaybackStore` from `@elah/react` |
| `selectionStore` | Vanilla Zustand store for clip selection — bind it with `useSelectionStore` from `@elah/react` |
| `transitionsStore` | Vanilla Zustand store mirroring transitions — bind it with `useTransitionsStore` from `@elah/react` |
| `textStylePresetsStore` | Reusable text looks (built-ins plus user presets) — bind it with `useTextStylePresetsStore` from `@elah/react` |
| `clipLoadStore` | Which clips the preview cannot draw yet (`'loading'` / `'error'`). Renderer state, never saved or undoable — bind it with `useClipLoadStore` from `@elah/react` |
| `mediaLibraryStore` | Media asset registry (vanilla store) — bind it with `useMediaLibrary` from `@elah/react` |
| `importFiles` / `importUrl` / `importBlob` | Import local files, remote URLs, or blobs into the media library |
| `beginImportUrl` | Like `importUrl` but returns a `status: 'pending'` asset immediately, so a clip can be placed before the media is probed |
| `determineAssetHasAudio` / `probeHasAudio` | Whether a video carries an audio track |
| `serializeProject` / `deserializeProject` | Save the engine's project as JSON and load it back (a facade over `readProjectDocument`) |
| `readProjectDocument` / `relinkProjectMedia` | Validate a stored document into a `Project`; re-point restored clips at the media library |
| `BUILT_IN_TEXT_TEMPLATES` / `applyTextTemplate` | 14 text looks with layered entry/exit motion; `applyTextTemplate(template, clip)` returns an undoable `Partial<Clip>` patch |
| `sampleTextAnimation` | Pure sampler for text/shape entry-exit animation (`TextAnimation`, `MotionSpec`) |
| `createFrameSequence` / `FrameSequenceController` | Ordered image sets (360° orbits, storyboards) with scrub, loop and preload; `frameSequenceToProject` makes one editable |
| `snapshotMediaLibrary` / `hydrateMediaLibrary` | Turn the media library into storable entries and put them back (ids kept) after a page load; storage is yours |
| `sourceBlobCache` | Shared cache that de-duplicates video downloads between the demuxer and preview |
| `PerfSummary` | Once-a-second render-loop cost summary; silent unless the `PERF` trace channel is on |
| `exportVideo` | Export the timeline to MP4 via a web worker |

These stores are **vanilla** (`zustand/vanilla`) — no React, subscribable from anywhere (`store.getState()`, `store.subscribe()`). They are also **module-level singletons**: one `tracksStore`, one `playbackStore`, etc. per JS realm. `@elah/editor`'s `<EditorProvider>` wires each `TimelineEngine`/`PlaybackEngine` instance it creates into these same shared stores, so only **one active project per page** is supported today — mounting two `<EditorProvider>` (or two manually-wired engines) at once will have them overwrite each other's state in the stores. Multiple independent editors on one page need separate tabs/iframes/windows until scoped stores land.

---

## Quick start

```ts
import { TimelineEngine, PlaybackEngine, resolveTimeline } from '@elah/core'

const engine = new TimelineEngine({ fps: 30, stage: { width: 1920, height: 1080 } })
const playback = new PlaybackEngine({ fps: 30, getTotalFrames: () => engine.getTotalFrames() })

// Add a track, then a clip onto it. addClip takes a single typed
// options object (a discriminated union keyed on `type`) and returns the Clip.
const track = engine.addTrack('video')
engine.addClip({ trackId: track.id, type: 'video', src: 'video.mp4', startFrame: 0, durationFrames: 90 })

// Resolve the scene at frame 15 — pure (frame, project) → Scene.
const scene = resolveTimeline(15, engine.getProject())
```

---

## Save and restore

`serializeProject` / `deserializeProject` are the simple pair. Underneath them,
`readProjectDocument` is the total reader: it returns a `Project` or throws
`ProjectDocumentError` (`code: 'unreadable' | 'unsupported-version'`), never half a
project. A document with no `version` stamp reads as version 1; one from a newer
build (`PROJECT_VERSION`) is refused.

```ts
import {
  serializeProject, deserializeProject,
  readProjectDocument, relinkProjectMedia, missingMediaSummary,
} from '@elah/core'

const json = serializeProject(engine)
deserializeProject(engine, json) // throws, leaving the engine untouched, if unreadable

// Or in two steps, so a refusal can be shown before the editor is cleared:
const project = readProjectDocument(JSON.parse(json))
engine.loadProject(project) // options: { transport?: 'rewind' | 'keep', history?: 'reset' | 'keep' }

// Media imported from disk is a blob: URL and does not survive a reload.
// After the library is rebuilt, repair the clips' assetIds and report what is gone:
const { project: repaired, relinked, missing } = relinkProjectMedia(engine.getProject(), assets)
engine.loadProject(repaired, { transport: 'keep', history: 'keep' })
const note = missingMediaSummary(missing) // e.g. "a.mp4, b.mp4 and 3 more"
```

The engine emits `project:loaded` (`ProjectLoadedEvent`) after every load, carrying the
new project and the requested `transport`.

---

## Text templates and animation

```ts
import { BUILT_IN_TEXT_TEMPLATES, findTextTemplate, applyTextTemplate } from '@elah/core'

const template = findTextTemplate(BUILT_IN_TEXT_TEMPLATES[0].id)!
engine.updateClip(clip.id, trackId, applyTextTemplate(template, clip)) // one undo entry
```

Applying a template is clean, not cumulative: fields the template does not use are
cleared. `TextAnimation` keeps the single-kind `in`/`out` enum and adds `inMotion` /
`outMotion` (a `MotionSpec`: `opacity`, `offsetX`, `offsetY`, `scale`, `rotation`,
`ease`, `opacityEase`), which replace the enum when present.

Two things a template carries are **data only**: `stagger` (split a line into clips that
enter one after another) and `tracking` (fake letterspacing). `applyTextTemplate` ignores
them and nothing in these packages runs them; a host that wants either builds it from the
template itself. Rotation is text-only: the shape renderers do not apply `transform.rotation`,
so `spin` (and a `rotation` channel in a `MotionSpec`) has no visible effect on a shape clip.

---

## Transitions

```ts
engine.addTransition({ fromClipId, toClipId, trackId, kind: 'slide', durationFrames: 12, direction: 'left' })
```

`kind` is `'fade' | 'slide' | 'wipe'`; all three are implemented in preview and in export.
`slide` moves left when `direction` is `'left'` and right for anything else; `wipe` ignores
`direction`. `TransitionDirection` also types `'up'` and `'down'`, but neither is implemented.

---

## Frame sequences

```ts
import { createFrameSequence, frameSequenceToProject } from '@elah/core'

const seq = createFrameSequence({ frames: urls.map((src) => ({ src })), fps: 12, loop: 'wrap' })
engine.loadProject(frameSequenceToProject(seq, { holdFrames: 6 })) // edit/export as image clips
```

`FrameSequenceController` drives a sequence from a clock or a drag;
`createFramePreloader` warms frames ahead of the index; `pickFrameSource` chooses
the right responsive candidate.

---

## Clip and track fields

| Field | Applies to | Meaning |
|---|---|---|
| `Clip.speed` | video | Playback multiplier, clamped to 0.25–4 (`engine.setClipSpeed`); timeline length follows it |
| `Clip.crop` | video, image | Normalized source window `{ x, y, width, height }`; see `normalizeCrop`, `FULL_CROP` |
| `Clip.cornerRadius` | video, image | Rounded-corner mask, 0–0.5 of the shorter side |
| `Track.protected` | any | The user cannot remove the track |
| `Track.pinned` | any | `'bottom'` keeps the lane below every non-pinned track; `addTrack` honours it |

Any number of video tracks is allowed; they composite in track order, topmost lane on top.

---

## Keeping the media library across a page load

```ts
import {
  mediaLibraryStore, snapshotMediaLibrary, hydrateMediaLibrary, refreshMissingThumbnails,
} from '@elah/core'

// Save: plain entries (assets still being probed are skipped). Where they go is up to you.
const entries = snapshotMediaLibrary(mediaLibraryStore.getState())

// Restore: ids are kept, so restored clips resolve their `assetId` directly.
const { hydrated, needsThumbnail } = hydrateMediaLibrary(entries, {
  referencedSrcs: new Set(/* every media clip's src in the project being opened */),
})
refreshMissingThumbnails(needsThumbnail) // cosmetic, fire-and-forget
```

This carries asset metadata and thumbnails only. A file imported from disk is a `blob:` URL
that dies with the session; its bytes are not stored, and `relinkProjectMedia` reports such
clips as `missing`.

---

## Diagnostics

```ts
import { PerfSummary } from '@elah/core'
// In the browser console: __trace.on('PERF') turns the once-a-second summary on.
```

`PerfSummary` measures the whole render tick (phase timings, budget overruns), not
just GPU upload. It allocates nothing while the `PERF` channel is off.

---

## Clip factories

Standalone builders that return a fully-normalized `Clip` object (rounded frames, default volume/opacity, generated id) without an engine — useful for headless pipelines that feed `resolveTimeline` directly. When you have an engine, prefer `engine.addClip(options)` instead, which builds the clip and records an undo entry.

```ts
import {
  createVideoClip,
  createAudioClip,
  createTextClip,
  createImageClip,
  createShapeClip,
  createFreehandClip,
} from '@elah/core'

const clip = createVideoClip({ trackId: 'v1', src: 'video.mp4', startFrame: 0, durationFrames: 90 })
const rect = createShapeClip({
  trackId: 'el1',
  startFrame: 0,
  durationFrames: 90,
  shape: { shapeKind: 'rect', shapeFill: '#22d3ee' }, // 'rect' | 'circle' | 'triangle'
})
```

---

## Export

```ts
import { exportVideo } from '@elah/core'

const blob = await exportVideo(engine.getProject(), {
  videoBitrate: 8_000_000,
  outputHeight: 1080, // short edge — optional, defaults to the stage's own
  onProgress: ({ frame, totalFrames }) => console.log(frame, '/', totalFrames),
})
```

`outputHeight` is the stage's *short* edge (`1080` = 1920×1080 or 1080×1920); the other
edge follows the aspect ratio and is rounded to an even number, as codecs require.

---

## Links

- [Website](https://www.elah.dev)
- [GitHub](https://github.com/elahlabs/elah)
- [React bindings — @elah/react](https://www.npmjs.com/package/@elah/react)
- [Full SDK — @elah/editor](https://www.npmjs.com/package/@elah/editor)
- [Headless CLI — @elah/cli](https://www.npmjs.com/package/@elah/cli)
- [License](https://github.com/elahlabs/elah/blob/main/LICENSE)
- [Commercial licensing](mailto:paul@elah.dev)
