# @elah/react

React bindings for the [Elah](https://www.elah.dev) video engine.

`@elah/core` is framework-agnostic — it has zero React imports and runs in Node, workers, and non-React apps (Vue, Svelte, plain JS). This package is the React layer on top of it:

- **Editor context** — `EditorContext`, `useEditor`, `useTimelineEngine`, `usePlaybackEngine`
- **Store hooks** — `useTracksStore`, `usePlaybackStore`, `useSelectionStore`, `useTransitionsStore`, `useTextStylePresetsStore`, `useClipLoadStore`, `useMediaLibraryStore`, `useMediaLibrary` (alias `useAssets`) — React views over core's vanilla Zustand stores
- **Audio hooks** — `useAudioMixer`, `useMasterVolume`, `useTrackLevels`

`useTextStylePresetsStore` reads the reusable text looks; `useClipLoadStore(s => s.byClipId[clipId])` reports `'loading'` or `'error'` for a clip the preview cannot draw yet.

Each store hook also carries the vanilla store API, so `useTracksStore(s => s.tracks)` and `useTracksStore.getState()` both work.

`@elah/core` ships the stores as **module-level singletons** (one `tracksStore`, one `playbackStore`, etc. per JS realm), and this package's hooks bind to those exact instances — so only one active engine/project per page is supported today. `@elah/editor`'s `<EditorProvider>` wires a `TimelineEngine` + `PlaybackEngine` into these shared stores on mount; mounting a second `<EditorProvider>` (or manually wiring a second engine into `EditorContext.Provider`) on the same page will have both write into the same stores and clobber each other's state.

**Version note:** install `@elah/react` at the same release line as whatever `@elah/core` (and, if used, `@elah/timeline`/`@elah/editor`) version you're on — see each package's `peerDependencies`/`dependencies` range. A mismatched `@elah/core` copy (e.g. hoisted to a different version than what `@elah/react`/`@elah/timeline`/`@elah/editor` resolve internally) means two separate copies of these singleton stores exist, and state silently stops syncing between them.

## Install

```bash
npm install @elah/react @elah/core react
```

Peer dependency: `react` >= 18.

Most apps should install [`@elah/editor`](https://www.npmjs.com/package/@elah/editor) instead — the batteries-included SDK that re-exports everything here alongside the timeline UI and `<EditorProvider>`.

## Usage

```tsx
import { useTimelineEngine, useTracksStore } from '@elah/react'

function TrackCount() {
  const engine = useTimelineEngine()
  const tracks = useTracksStore((s) => s.tracks)
  return <span>{tracks.length} tracks in {engine.getProject().id}</span>
}
```

## License

Apache-2.0
