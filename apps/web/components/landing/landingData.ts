// Content for the landing-v2 marketing home. Kept as plain data so the section
// components stay presentational. Copy mirrors the approved design; hrefs point
// at the app's real routes.

// Navigation lives in config/nav.ts: one registry for the header and footer.
import { GITHUB_URL } from '@/config/nav'
export { navLinks, footerColumns, GITHUB_URL, DISCORD_URL, GET_STARTED_URL, EDITOR_URL } from '@/config/nav'

export interface Library {
  pkg: string
  title: string
  subtitle: string
  href: string
  variant: 'editor' | 'timeline' | 'headless' | 'core' | 'react'
  /** Extra copyable command shown as a second line under the install command. */
  extraCmd?: string
}

export const libraries: Library[] = [
  { pkg: '@elah/editor', title: 'Editor SDK', subtitle: 'Full editor — EditorProvider, Preview, AssetPanel, and Timeline in one composition.', href: '/playground/production', variant: 'editor' },
  { pkg: '@elah/timeline', title: 'Timeline UI', subtitle: 'React timeline — tracks, clips, drag/trim/split, ruler, playhead.', href: '/playground/timeline', variant: 'timeline' },
  { pkg: '@elah/cli', title: 'Headless Rendering', subtitle: 'Server-side render pipeline — split/trim/build/export and an HTTP render server.', href: '/docs/cli', variant: 'headless', extraCmd: 'npx @elah/cli serve' },
  { pkg: '@elah/react', title: 'React Bindings', subtitle: 'React bindings — EditorContext, useEditor, store hooks, and the audio mixer hooks.', href: '/docs/react', variant: 'react' },
  { pkg: '@elah/core', title: 'Media Runtime', subtitle: 'Framework-agnostic engine — resolver, WebGL2 renderer, WebCodecs decode, MP4 export.', href: '/docs', variant: 'core' },
]

export interface Feature {
  idx: string
  title: string
  body: string
  tags: string[]
}

export const features: Feature[] = [
  {
    idx: '01',
    title: 'Frame-Accurate Time Model',
    body: 'All time is integer frames — no floating-point drift, no sync bugs. Same project + same frame = same pixels, always.',
    tags: ['Immer', 'Zustand'],
  },
  {
    idx: '02',
    title: 'WebCodecs Decode Pipeline',
    body: 'Push-based StreamingFrameProducer with ahead-of-playhead decoding. Frames are copied to ImageBitmap so the hardware output pool never starves, and a shared sourceBlobCache keeps one copy of each video’s bytes.',
    tags: ['WebCodecs', 'ImageBitmap', 'mediabunny'],
  },
  {
    idx: '03',
    title: 'WebGL2 GPU Renderer',
    body: 'GpuRenderer turns each resolved Scene into sorted textured-quad draws composited by zIndex. Layers: Video, Image, Text, Shape, and Freehand.',
    tags: ['WebGL2', 'OffscreenCanvas', 'GLSL'],
  },
  {
    idx: '04',
    title: 'Pure Resolver Architecture',
    body: 'resolveTimeline(frame, project) → Scene is deterministic and side-effect-free. Runs identically in preview, tests, and export workers.',
    tags: ['Pure function', 'Worker-safe'],
  },
  {
    idx: '05',
    title: 'Zero-Drift Export — Browser & Server',
    body: 'The export worker steps resolveTimeline frame-by-frame in the browser — and @elah/cli runs the exact same pipeline headlessly on your server. outputHeight sets the short edge, so one value suits landscape and portrait.',
    tags: ['Web Worker', 'MP4', '@elah/cli'],
  },
  {
    idx: '06',
    title: 'Interactive Transform Overlays',
    body: 'Video and image clips get eight resize handles, non-uniform scale (Shift keeps aspect), and a Resize/Crop toggle. Text clips add inline edit and a rotate knob that snaps to 15°. Crop and corner radius are clip properties you set through the engine.',
    tags: ['React', 'CSS transforms'],
  },
  {
    idx: '07',
    title: 'Edit History & Stored Projects',
    body: 'Every edit goes through TimelineEngine.commit() — Immer-backed structural sharing with batching, undo/redo, and typed events. Projects round-trip as versioned documents: readProjectDocument to load, relinkProjectMedia to reconnect files.',
    tags: ['Immer', 'Undo/Redo', 'Project documents'],
  },
  {
    idx: '08',
    title: 'Transitions & Layered Motion',
    body: 'Fade, slide, and wipe transitions render the same in preview and export. Text and shapes take layered in/out motion with back, elastic, and bounce easings, plus 14 built-in text templates.',
    tags: ['MotionSpec', 'Easings', 'Templates'],
  },
  {
    idx: '09',
    title: 'Multi-Track Editing',
    body: 'Stack multiple video tracks, retime clips from 0.25× to 4× with engine.setClipSpeed, and protect or pin tracks in place. Audio runs through a multi-track mixer with per-track levels and a master volume.',
    tags: ['Tracks', 'Clip speed', 'Audio mixer'],
  },
]

export interface FlowLayer {
  name: string
  items: string[]
}

export const flow: FlowLayer[] = [
  { name: 'REACT UI', items: ['Timeline', 'Preview', 'AssetPanel', 'TransformOverlay'] },
  { name: 'REACT BINDINGS', items: ['EditorContext', 'useEditor', 'store hooks', 'audio mixer hooks'] },
  { name: 'ENGINE LAYER', items: ['TimelineEngine', 'PlaybackEngine', 'AudioPlaybackController'] },
  { name: 'PURE RESOLVER', items: ['resolveTimeline(frame, project) → Scene'] },
  { name: 'RENDERERS', items: ['GpuRenderer (WebGL2)', 'Video · Image · Text layers', 'Shape · Freehand layers', 'ExportWorker (OffscreenCanvas)'] },
  { name: 'MEDIA PIPELINE', items: ['StreamingFrameProducer', 'WebCodecs', 'mediabunny demux'] },
]

export interface WhatsNewItem {
  title: string
  body: string
  href: string
}

export const whatsNew: WhatsNewItem[] = [
  {
    title: 'Multiple video tracks, clip speed, crop and corner radius',
    body: 'Stack video lanes, retime clips from 0.25× to 4×, and pin or protect tracks.',
    href: '/docs/clips',
  },
  {
    title: 'Layered text motion and 14 templates',
    body: 'In and out motion with back, elastic, and bounce easings, applied as one template call.',
    href: '/docs/text-templates-and-motion',
  },
  {
    title: 'Frame sequences',
    body: 'Turn a numbered image set — a 360° orbit, a flipbook — into a scrubbable timeline clip.',
    href: '/docs/frame-sequences',
  },
  {
    title: 'Stored project documents and re-linking',
    body: 'Save a versioned project, load it back, and reconnect media that moved.',
    href: '/docs/project-documents',
  },
  {
    title: 'Theming tokens',
    body: 'Restyle the editor and overlays with --elah-* tokens and per-slot classNames.',
    href: '/docs/theming',
  },
  {
    title: '@elah/react',
    body: 'The React bindings now ship as their own package: EditorContext, hooks, and the audio mixer.',
    href: '/docs/react',
  },
]

export const AGENTS_GUIDE_URL = `${GITHUB_URL}/blob/main/docs/ai/ELAH_FOR_AI_AGENTS.md`

export interface AgentPoint {
  title: string
  body: string
  href: string
  external?: boolean
}

export const agentPoints: AgentPoint[] = [
  {
    title: 'One-file integration guide',
    body: 'ELAH_FOR_AI_AGENTS.md is a self-contained brief: the API surface and the gotchas, with no repo checkout needed.',
    href: AGENTS_GUIDE_URL,
    external: true,
  },
  {
    title: 'Render what the model writes',
    body: 'npx @elah/cli serve renders AI-generated specs to MP4 on your own hardware, frame-identical to the browser.',
    href: '/docs/cli#serve',
  },
  {
    title: 'llms.txt for discovery',
    body: 'Every docs page is indexed in plain text at /llms.txt, so an agent can find the right page without scraping.',
    href: '/llms.txt',
  },
]

export interface PlaygroundEntry {
  badge: 'live' | 'preview'
  badgeColor: string
  playhead: string
  delay: string
  title: string
  body: string
  href: string
  variant: 'full' | 'timeline' | 'demo'
}

/** Status-pill colours, shared by the playground cards and the showcase cards. */
export const badgeColors = { live: '#3ddc97', preview: '#e0b33c' } as const

export const playgrounds: PlaygroundEntry[] = [
  {
    badge: 'live',
    badgeColor: badgeColors.live,
    playhead: '38%',
    delay: '0s',
    title: 'Full Editor',
    body: 'Complete editor with asset panel, GPU-accelerated preview, interactive overlays, timeline, and export pipeline. The full @elah/editor composition.',
    href: '/playground/production',
    variant: 'full',
  },
  {
    badge: 'live',
    badgeColor: badgeColors.live,
    playhead: '62%',
    delay: '-3s',
    title: 'Timeline Only',
    body: 'Isolated timeline UI demo. Explore tracks, clips, snapping, keyboard shortcuts, and the TimelineEngine without the full editor stack.',
    href: '/playground/timeline',
    variant: 'timeline',
  },
  {
    badge: 'preview',
    badgeColor: badgeColors.preview,
    playhead: '22%',
    delay: '-6s',
    title: 'Full Editor Demo',
    body: 'Guided demo with pre-loaded sample media. Walks through the major features — cut, trim, text, transitions, and export — in a single session.',
    href: '/playground/raw',
    variant: 'demo',
  },
]

export interface IntegrationPoint {
  code: string
  rest: string
}

export const integrationPoints: IntegrationPoint[] = [
  { code: 'EditorProvider', rest: 'wires all engines with a single fps prop' },
  { code: 'Preview', rest: 'mounts the WebGL2 renderer and drives the RAF loop' },
  { code: 'Timeline', rest: 'handles all interaction: drag, trim, split, snap' },
  { code: 'AssetPanel', rest: 'manages the media library and drag-drop import' },
  { code: 'exportVideo()', rest: 'runs the full pipeline in a dedicated worker' },
]

export interface FaqItem {
  q: string
  a: string
  /** Optional follow-up link rendered under the answer. */
  href?: string
  hrefLabel?: string
}

export const faq: FaqItem[] = [
  {
    q: 'Does elah need a server to edit or export video?',
    a: 'No — by default everything runs in the browser: decoding (WebCodecs), rendering (WebGL2), and MP4 export (a Web Worker drawing to an OffscreenCanvas), so footage never leaves the user’s machine. When you want server-side rendering — batch jobs, AI-generated video, CI — @elah/cli runs the exact same export pipeline headlessly on your own hardware, with bit-identical output.',
  },
  {
    q: 'Can elah render video on a server?',
    a: 'Yes. npx @elah/cli serve starts a self-hosted HTTP render server: POST a seconds-based JSON spec to /render and get MP4 bytes back. It keeps a warm headless Chrome and runs core’s real exportVideo pipeline, so server output is frame-identical to the browser. There is also elah build / elah export for one-shot CLI renders, and a Node library API.',
  },
  {
    q: 'What can I build with elah?',
    a: 'An embeddable video editor inside your own product: the SDK ships EditorProvider, Preview, AssetPanel, and Timeline React components on top of a headless TypeScript engine, so you can compose a full editor in under 20 lines or drive the engine directly.',
  },
  {
    q: 'Is the exported video identical to the preview?',
    a: 'Yes. Preview and export run the same pure resolver — resolveTimeline(frame, project) → Scene — and the same placement math, so the frame you scrub is the frame you ship. Same project, same frame, same pixels.',
  },
  {
    q: 'How is elah different from Remotion?',
    a: 'Remotion turns React components into video — programmatic composition rendered by headless Chromium. elah is an editing engine: an integer-frame timeline data model with undo history, drag/trim/split UI, and a GPU export pipeline that runs in the user’s browser or headlessly via @elah/cli. The difference is the editing foundation, not where rendering happens.',
  },
  {
    q: 'Which frameworks does elah support?',
    a: 'The core engine is framework-agnostic TypeScript with zero React imports. React bindings live in @elah/react (EditorContext, useEditor, store hooks, audio mixer hooks), and Next.js works through @elah/editor and @elah/timeline; React Native support is experimental, with more frameworks planned.',
  },
  {
    q: 'What changed in 0.6.0?',
    a: 'Multiple video tracks, clip speed, crop and corner radius, layered text motion with 14 templates, frame sequences, and stored project documents with media re-linking, plus fixes for eight defects found while verifying the port.',
    href: '/blog/elah-0-6-0',
    hrefLabel: 'Read the 0.6.0 release post',
  },
  {
    q: 'Can an AI agent drive the editor?',
    a: 'Today an agent can build against elah using the single-file ELAH_FOR_AI_AGENTS.md guide, and render the specs it writes with npx @elah/cli serve. A WebMCP surface, so agents could drive an open editor directly, is planned but not built and has no date.',
    href: '/docs/agents',
    hrefLabel: 'Read the agents guide',
  },
  {
    q: 'Is elah open source?',
    a: 'Yes — elah is open source under the Apache-2.0 license, copyright Elah Labs Private Limited. It’s free to use, modify, embed, self-host, and ship in commercial products, including hosted and white-label offerings. Paid support and services are available if you want them, but nothing is gated behind a license.',
  },
  {
    q: 'What export formats does elah support?',
    a: 'MP4 with H.264 video by default (VP9 and VP8 are also available) and AAC or Opus audio, at any aspect ratio — 9:16, 16:9, 1:1, or a custom stage — up to the project’s native resolution.',
  },
]

export interface TrackClip {
  left: string
  width: string
  bg: string
  border: string
  shadow: string
  label: string
  wave?: boolean
  waveColor?: string
}

export interface Track {
  name: string
  short: string
  clips: TrackClip[]
}

export const tracks: Track[] = [
  {
    name: 'Video',
    short: 'V',
    clips: [
      {
        left: '1.5%',
        width: '32%',
        bg: 'linear-gradient(180deg,#3b82f6,#1d4ed8)',
        border: '#00c2ff',
        shadow: '0 0 0 1px rgba(0,194,255,.4)',
        label: 'intro.mp4',
      },
      {
        left: '34.5%',
        width: '30%',
        bg: 'linear-gradient(180deg,#3b82f6,#1d4ed8)',
        border: '#60a5fa',
        shadow: '0 1px 2px rgba(0,0,0,.25)',
        label: 'b-roll-city.mp4',
      },
    ],
  },
  {
    name: 'Video 2',
    short: 'V2',
    clips: [
      {
        left: '8%',
        width: '22%',
        bg: 'linear-gradient(180deg,#3b82f6,#1d4ed8)',
        border: '#60a5fa',
        shadow: '0 1px 2px rgba(0,0,0,.25)',
        label: 'overlay.mp4',
      },
      {
        left: '46%',
        width: '16%',
        bg: 'linear-gradient(180deg,#3b82f6,#1d4ed8)',
        border: '#60a5fa',
        shadow: '0 1px 2px rgba(0,0,0,.25)',
        label: 'logo.png',
      },
    ],
  },
  {
    name: 'Elements',
    short: 'E',
    clips: [
      {
        left: '17%',
        width: '24%',
        bg: '#7a2e10',
        border: '#ad5621',
        shadow: '0 1px 2px rgba(0,0,0,.25)',
        label: 'Launch Day',
      },
    ],
  },
  {
    name: 'Audio (Main)',
    short: 'A1',
    clips: [
      {
        left: '1.5%',
        width: '63%',
        bg: '#0c2a26',
        border: '#0d4d3c',
        shadow: '0 1px 2px rgba(0,0,0,.25)',
        label: 'bg-music.mp3',
        wave: true,
        waveColor: '#248f6c',
      },
    ],
  },
  {
    name: 'Audio 2',
    short: 'A2',
    clips: [
      {
        left: '40%',
        width: '14%',
        bg: '#0c2a26',
        border: '#0d4d3c',
        shadow: '0 1px 2px rgba(0,0,0,.25)',
        label: 'whoosh.wav',
        wave: true,
        waveColor: '#248f6c',
      },
    ],
  },
]
