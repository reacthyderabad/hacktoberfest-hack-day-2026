# Bundle Strategy

> What `@elah/*` costs a consumer, how it is measured, and why the dependency
> graph looks the way it does. The goal: a browser-native editor SDK that a
> React app can adopt without dragging in a media-processing toolchain it did
> not ask for.

---

## Measured size (0.6.0, 2026-10-02)

Reproduce with `node scripts/measure-bundle.mjs` after `npm run build:packages`.
Two measurements are printed because they answer different questions, and the
numbers in earlier versions of this file mixed them up.

### What a browser downloads

Each package barrel bundled with esbuild (`--bundle --minify --format=esm`,
then gzipped). `react`, `react-dom` and `lucide-react` are external because the
host app ships its own copy.

| Package | own code, gz | with its small runtime deps, gz |
|---|---|---|
| `@elah/core` | 40.5 KiB | 43.5 KiB |
| `@elah/react` | 0.9 KiB | 0.9 KiB |
| `@elah/timeline` | 14.7 KiB | 21.4 KiB |
| `@elah/editor` (layer only) | 18.5 KiB | 18.5 KiB |
| **Full SDK** (`editor` with `core` + `react` + `timeline` bundled in) | **69.1 KiB** | **78.7 KiB** |

"Small runtime deps" are `immer` (4.8 KiB gz), `zustand` (3.2), `clsx` (0.2)
and `tailwind-merge` (6.9). `mediabunny`, the demuxer and muxer, is **158.5 KiB
gz on its own** and is accounted for separately below, because whether it loads
at startup depends on how the app wires the demuxer.

### Three real app shapes, with code splitting

The same bundler run with `splitting: true`, which is what Vite, webpack and
Next do. "At startup" is every chunk the entry imports statically.

| App | at startup, gz | deferred to first decode / export |
|---|---|---|
| Engine only: `TimelineEngine`, `resolveTimeline`, `createTextClip` from `@elah/core` | **11 KiB** | nothing |
| Engine + React UI, demuxer injected or omitted | **68 KiB** | mediabunny, 158 KiB |
| The README quick start, which calls `createDefaultDemuxerFactory()` | **227 KiB** | export worker only |

The third row is the honest cost of the documented path. `createDefaultDemuxerFactory`
imports `mediabunny` **statically** (it is the only module in the packages that
does), so any bundle that references it pulls the codec into the startup graph.
Everything else reaches mediabunny through a dynamic `import()` in
`MediabunnyDemuxer` and `hasAudio`, which bundlers split into a chunk that loads
on first decode. An app that wants the 68 KiB startup either passes its own
factory via `createMediabunnyBackend` or passes no factory and lets the demuxer
lazy-load. Making `createDefaultDemuxerFactory` itself lazy is a tracked
follow-up; it needs a backend wrapper whose `open()` awaits the import, since
`DemuxerFactory` is synchronous.

### What `npm pack` ships

The tsc ESM output, unminified and not tree-shaken. This is the tarball, not
the runtime cost, and it overstates the latter by roughly 60 percent.

| Package | files | raw | gz |
|---|---|---|---|
| `@elah/core` | 99 | 335.9 KiB | 64.4 KiB |
| `@elah/react` | 7 | 3.8 KiB | 1.0 KiB |
| `@elah/timeline` | 26 | 105.3 KiB | 20.2 KiB |
| `@elah/editor` | 19 | 119.9 KiB | 22.5 KiB |

The 0.2.1 figures that used to live here (~41 / ~12 / ~10 / ~63 KiB) were this
tarball measurement, presented in the badges as if they were a bundle size.
They are retired; the badges now quote the bundled SDK.

---

## Dependency budget

Runtime dependencies, per package, as published:

| Package | Runtime dependencies | Why |
|---|---|---|
| `@elah/core` | `immer` | Structural-sharing mutations and undo/redo in `TimelineEngine` |
| | `zustand` | Vanilla stores (`tracksStore`, `playbackStore`, …) that `@elah/react` mirrors into React |
| | `mediabunny` | Demux for decode, mux for export, audio-track probing. Lazy except through `createDefaultDemuxerFactory`, see above |
| `@elah/react` | `zustand` | The `useStore` bridge |
| `@elah/timeline` | `clsx`, `tailwind-merge` | The `classNames` slot API and `cn` |
| `@elah/editor` | `immer`, `zustand` | Re-exported for consumers who build on the stores directly |

`react` and `react-dom` (`>= 18`) are **peer** dependencies of `react`,
`timeline` and `editor`; `lucide-react` (`>= 0.400`) is a peer of `timeline`
and `editor`. The host app owns all three.

`@elah/cli` is a **binary, not a library**: nothing it depends on reaches a
consumer bundle. Its budget:

| Dependency | Why |
|---|---|
| `@elah/core` | The engine itself. esbuild bundles it into `dist/bin.js` at build time and tree-shakes the browser-only modules out of the Node binary |
| `playwright-core` | Drives the system Chrome so `elah export` runs core's real `exportVideo` pipeline (WebCodecs and OffscreenCanvas are browser-only). No browser download |
| `mediabunny` | Probes media duration and dimensions for `elah build` in plain Node (pure-JS demux, ranged reads for remote URLs) |
| `esbuild` (dev) | Build-time bundling of the binary |

Everything else the engine needs is a browser-native API, not a dependency:
WebCodecs (`VideoDecoder`, `VideoEncoder`), WebGL2, Web Audio, `OffscreenCanvas`,
`createImageBitmap`. No WASM runtime ships in any package.

---

## Where mediabunny is allowed to appear

Demuxing and muxing are the heaviest piece of a video editor, so the rule is
that they are reachable but never load unless the app decodes or exports.

- `@elah/editor`, `@elah/timeline` and `@elah/react` never import mediabunny.
- In `@elah/core`, `MediabunnyDemuxer.open()` and `hasAudio` use `import('mediabunny')`.
  The export worker imports it statically, but the worker is its own module
  graph, loaded through `new Worker(new URL('./ExportWorker.ts', import.meta.url))`
  only when `exportVideo` runs.
- `createDefaultDemuxerFactory` is the one static import, documented above.
- The `DemuxerBackend` interface and `createMediabunnyBackend(mb, opts)` let an
  app supply its own mediabunny build, or a different decoder entirely:

```ts
import { GpuRenderer, createMediabunnyBackend } from '@elah/editor'
import * as mediabunny from 'mediabunny'

const demuxerFactory = () => createMediabunnyBackend(mediabunny)
new GpuRenderer({ demuxerFactory })
```

- Without any `demuxerFactory`, the renderer falls back to a synthetic provider,
  so the engine is usable and testable with zero media loaded.

---

## Five packages, one dependency direction

```
@elah/core  ←  @elah/react  ←  @elah/timeline  ←  @elah/editor
@elah/core  ←  @elah/cli
```

`core` has no React. `react` is the only package that imports it for the store
bridge. `timeline` and `editor` are React components. A consumer who wants the
engine alone installs `core` and pays the 11 KiB startup in the table above.
`ARCHITECTURE.md` § 9 (A6) is the rule against splitting further into
micro-packages; these five exist because each has a real, separately adopted
consumer.

---

## Tree-shaking and dead-code boundaries

- **Named exports only** from every barrel, no namespace re-exports, so bundlers
  can drop unused symbols. The engine-only row above is this working.
- **Debug tooling is import-only-when-needed.** `GpuRendererDebugPanel`,
  `DebugGpuRenderer`, `DebugOverlay` and the scenario harness are not on the
  production render path.
- **The export worker is a separate module graph**, code-split by any bundler
  that understands the `new URL(..., import.meta.url)` worker pattern.
- **Trace logging is a cheap no-op when off.** `trace()` is a single `Set`
  lookup, and `PerfSummary` is silent unless the `PERF` channel is on.

---

## Consumer build requirements

- A bundler that understands the `new URL(..., import.meta.url)` worker pattern
  and splits dynamic imports: Vite, webpack 5, Next. The `examples/` apps use
  Vite and Next.
- WebCodecs, WebGL2 and Web Audio at runtime, which today means Chromium. There
  is a WebGL1 fallback in `WebGLContext`, but decode requires WebCodecs.

---

## Future

- Make `createDefaultDemuxerFactory` lazy so the quick-start path starts at
  68 KiB instead of 227 KiB.
- Optional sub-path exports (for example `@elah/editor/export`) if apps want the
  timeline without the export worker in their module graph.
- A formal `@public` API marking so internal symbols can change without a major
  version bump.
