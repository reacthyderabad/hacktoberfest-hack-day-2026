// Single source of truth for blog posts — consumed by the listing (`/blog`) and
// the article route (`/blog/[slug]`). Article bodies are structured as block
// arrays so the detail page can render them and derive a table of contents.

export type Block =
  | { type: 'p'; text: string }
  | { type: 'h2'; id: string; text: string }
  | { type: 'code'; language?: string; filename?: string; code: string }
  | { type: 'note'; title?: string; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'quote'; text: string }

export interface Post {
  slug: string
  date: string
  category: 'Architecture' | 'Design' | 'Implementation' | 'Release'
  title: string
  excerpt: string
  readingTime: string
  content: Block[]
}

export const posts: Post[] = [
  {
    slug: 'elah-0-6-0',
    date: '2026-10-02',
    category: 'Release',
    title: '0.6.0: multiple video tracks, clip speed, layered text motion and stored projects',
    excerpt:
      'The engine used to refuse a second video track. 0.6.0 allows several, adds clip speed, crop and corner radius, layered text motion with 14 templates, and a way to open a stored project without ever getting half of one back.',
    readingTime: '8 min read',
    content: [
      {
        type: 'p',
        text: "Until now, `addTrack('video')` has been a polite lie. Call it on a project that already had a video track and you did not get a new lane; you got the old one back, handed over as if it were new. That was a deliberate cap, and it was the right call while the engine was a single-lane editor. It stopped being the right call the moment someone wanted a picture-in-picture, a lower-third video over a b-roll, or a logo sting that sits on top of everything.",
      },
      {
        type: 'p',
        text: '0.6.0 is the release that lifts the cap. It is also the release that ports a large body of editor work from our premium product into the open-source packages, so there is more in it than one headline. This post is a tour of the parts we think matter, with the reasons for each. The changelog is the complete list; this is the why.',
      },
      {
        type: 'h2',
        id: 'multiple-video-tracks',
        text: 'Multiple video tracks',
      },
      {
        type: 'p',
        text: "The behaviour change first, because it is the one that can surprise existing code. `addTrack('video')` now adds a track. Video tracks composite in track order: the resolver derives each clip's stacking from its track's `order`, and the topmost lane draws on top. Two clips on separate video lanes that overlap in time no longer conflict. They layer.",
      },
      {
        type: 'p',
        text: "Where the new lane lands is a small decision with large consequences. A new video track is placed directly below the last existing video track, which keeps the video lanes grouped together at the top, above audio and elements. Every other kind of track is appended below everything that exists. Tracks can also now be marked `protected` (the user cannot remove them) or `pinned: 'bottom'`, in which case `addTrack` keeps a freely added track above that pinned block instead of after it.",
      },
      {
        type: 'code',
        language: 'ts',
        filename: 'multi-track.ts',
        code: `import { TimelineEngine } from '@elah/core'

const engine = new TimelineEngine({ fps: 30, stage: { width: 1920, height: 1080 } })

// A fresh engine starts with one video track, 'Track 1'.
// Before 0.6.0 this call returned that same track. Now it adds a second
// lane, placed directly below the last video track.
const overlay = engine.addTrack('video')`,
      },
      {
        type: 'note',
        title: 'One consequence for @elah/cli',
        text: 'The build spec that `elah build` and `elah serve` consume puts every video clip on a single video track, and it has no field to say which track a clip belongs to. `@elah/cli` 0.1.2, released alongside this version, depends on `@elah/core@^0.6.0` and documents the consequence: overlapping video clips in a spec are a spec error, reported by the build, not something the engine rejects. The engine allows several video tracks; the spec format does not yet have a way to ask for them.',
      },
      {
        type: 'h2',
        id: 'speed-crop-corner-radius',
        text: 'Speed, crop and corner radius',
      },
      {
        type: 'p',
        text: 'Three new fields on `Clip` do most of what people reach for when they start composing rather than cutting.',
      },
      {
        type: 'p',
        text: "`Clip.speed` is a playback multiplier for video clips, clamped to the range 0.25 to 4. Changing it changes the clip's length on the timeline: `durationFrames` follows the speed, while `sourceStartFrame` and `sourceDurationFrames` keep describing the trim window into the source at 1x. Only the rate at which that window is consumed changes. Slowing a clip down grows it, and `setClipSpeed` will not ripple into the next clip; growth is clamped to the gap in front of it. Export honours the speed, so what you preview is what you render.",
      },
      {
        type: 'p',
        text: "`Clip.crop` is a source window, normalized from 0 to 1 against the media's natural size with the origin at the top left. Omit it and you get the full frame. `Clip.cornerRadius` is a fraction from 0 to 0.5 of the shorter rendered side, so 0.5 on a square draw rectangle is a circle. Both apply to video and image clips, and neither one needs a new kind of layer: they are ordinary clip fields that the preview and the export worker already know how to read.",
      },
      {
        type: 'code',
        language: 'ts',
        filename: 'speed-and-crop.ts',
        code: `// Half speed, cropped to the left half of the frame, softly rounded.
engine.setClipSpeed(clip.id, clip.trackId, 0.5)
engine.updateClip(clip.id, clip.trackId, {
  crop: { x: 0, y: 0, width: 0.5, height: 1 },
  cornerRadius: 0.08,
})`,
      },
      {
        type: 'h2',
        id: 'layered-motion-and-templates',
        text: 'Layered text motion and templates',
      },
      {
        type: 'p',
        text: 'Text animation used to be one kind per end: a clip could fade in, or rise in, or scale in, and you picked one. Real motion design is several channels moving together. `TextAnimation` now takes `inMotion` and `outMotion`, each a `MotionSpec` that can drive opacity, `offsetX` and `offsetY`, `scale` and `rotation` at once, with an `ease` for the geometric channels and a separate `opacityEase` so opacity can stay linear while the geometry overshoots.',
      },
      {
        type: 'p',
        text: "A `MotionSpec` describes only the far end of a ramp. The near end is always the clip's authored resting state: opacity 1, no offset, a scale multiplier of 1, no rotation delta. We chose that on purpose. If a spec could store both ends, someone would eventually write one whose resting state is not the one the author set in the properties panel, which is a clip that never arrives where you put it. Storing only the extreme makes that bug unrepresentable.",
      },
      {
        type: 'p',
        text: 'The new easings are `back-in`, `back-out`, `elastic-out` and `bounce-out`, alongside the existing curves. The first three overshoot: they return values outside 0 to 1 partway through, which is most of what separates deliberate motion from a linear slide. Opacity is clamped at the point of use, so an overshooting curve can pass its target and come back without producing an opacity above 1.',
      },
      {
        type: 'p',
        text: 'On top of that sit 14 built-in text templates, `BUILT_IN_TEXT_TEMPLATES`, each bundling a style (font, size, colour, an optional background chip) with an entry and an exit. The part worth explaining is `applyTextTemplate(template, clip)`. It does not mutate the clip, and it does not touch the engine. It returns a `Partial<Clip>` patch, and you hand that patch to `engine.updateClip`.',
      },
      {
        type: 'code',
        language: 'ts',
        filename: 'apply-template.ts',
        code: `import { findTextTemplate, applyTextTemplate } from '@elah/core'

const template = findTextTemplate('template-title-card')
if (template) {
  engine.updateClip(clip.id, clip.trackId, applyTextTemplate(template, clip))
}`,
      },
      {
        type: 'p',
        text: 'Returning a patch is what makes a template a normal edit. It lands on the undo stack, it is saved with the project, and the export worker renders it with no template-specific code, because by the time anything downstream sees it, it is just clip fields. The patch also sets every optional box field, to `undefined` where the template does not use it, so switching from a template with a background panel to one without clears the panel instead of leaving it behind. The ramp length is expressed as a fraction of the clip and resolved into a legal frame count for the specific clip, capped at half the clip so the entry and exit never overlap and leave the text permanently half-faded.',
      },
      {
        type: 'h2',
        id: 'project-documents-and-relinking',
        text: 'Stored projects and relinking',
      },
      {
        type: 'p',
        text: 'A `Project` that has been through `JSON.stringify` and back is not a `Project`; it is `unknown`. It may come from an older build, a newer one, or nothing we ever wrote. `readProjectDocument(document)` is the single door every stored project should go through. It returns a project the engine and the stores can dereference without guards, or it throws a `ProjectDocumentError` whose `code` is `unreadable` or `unsupported-version`. It never returns half a project.',
      },
      {
        type: 'p',
        text: "The reasoning is about autosave. If a document with a broken track list were opened as an empty project, the first autosave would overwrite the user's real file with that emptiness and make the loss permanent. So the reader repairs what is merely missing (a document from before stages existed gets the default stage) and refuses what is wrong, and it is the caller's job to tell the user why. `isReadableProjectDocument` is the boolean form for deciding what to show.",
      },
      {
        type: 'p',
        text: 'Media is the other half of the problem. A clip imported from a local file carries a `blob:` or `data:` URL that dies with the session that minted it. `relinkProjectMedia(project, assets)` points restored clips back at the media library by `src`, and for clips whose source cannot be fetched again it does the honest thing: it lists them in `missing` and leaves them exactly where they are, with their name, position and length intact. Dropping a clip the user cannot see or undo is the one outcome we refuse to ship.',
      },
      {
        type: 'code',
        language: 'ts',
        filename: 'restore.ts',
        code: `import { readProjectDocument, relinkProjectMedia, missingMediaSummary } from '@elah/core'

const project = readProjectDocument(JSON.parse(stored)) // throws ProjectDocumentError
engine.loadProject(project)

// Later, once the media library has been rebuilt:
const { project: relinked, missing } = relinkProjectMedia(engine.getProject(), libraryAssets)
engine.loadProject(relinked, { history: 'keep' }) // do not discard undo
const warning = missingMediaSummary(missing) // e.g. "intro.mp4 and logo.png"`,
      },
      {
        type: 'p',
        text: "`loadProject` gained options for exactly this flow. `history: 'keep'` is for the relink pass, which must not throw away the undo stack, and the engine now emits a `project:loaded` event so the transport can rewind.",
      },
      {
        type: 'h2',
        id: 'upgrade-notes',
        text: 'Upgrade notes',
      },
      {
        type: 'p',
        text: 'Three things deserve a line in your own upgrade checklist.',
      },
      {
        type: 'p',
        text: "`ExportOptions.outputHeight` is now the stage's short edge. `1080` means 1920 by 1080 on a landscape stage and 1080 by 1920 on a portrait one; the other edge is derived from the stage's aspect ratio and rounded to an even number. Previously the option scaled against the stage height, which only equals the short edge on a landscape stage. A 9:16 stage asked for 1080 used to come out 608 by 1080. If you passed `outputHeight` on a portrait project, your output size changes, and it changes to the number you asked for.",
      },
      {
        type: 'p',
        text: 'Playback preferences (zoom, volume, mute, playback rate, loop and snap) are still saved to `localStorage` under the same key and the same envelope, so nobody loses their settings. What changed is when: the write now happens when a preference changes. The middleware we used before re-serialised them on every frame of playback and every scrub move.',
      },
      {
        type: 'p',
        text: '`serializeProject` and `deserializeProject` were briefly removed from `@elah/core` and the `@elah/editor` barrel during the port. They are back, as a facade over `readProjectDocument`, so no consumer break ships. One difference to know about: a document with no `version` stamp is now read as version 1 instead of rejected, and a document from a newer build throws `ProjectDocumentError`.',
      },
      {
        type: 'quote',
        text: 'A new capability is a promise about what the old ones do next. Ship the lane, and say out loud what the spec still cannot express.',
      },
    ],
  },
  {
    slug: 'verifying-a-25-commit-port',
    date: '2026-09-30',
    category: 'Implementation',
    title: 'Verifying a 25-commit port: the eight defects',
    excerpt:
      'We ported a premium editor into the open-source packages and the tests passed. Verifying it anyway found eight real defects, from a disposed GPU texture to a ruler that read 00:90. Here is each one, and what only a build catches.',
    readingTime: '7 min read',
    content: [
      {
        type: 'p',
        text: 'The 0.6.0 work was a port. Twenty-five commits of editor work, built in a premium product, had to be carried into the open-source `@elah/*` packages without dragging along the parts that product does not share. The unit tests passed. It would have been very easy to merge on the strength of that.',
      },
      {
        type: 'p',
        text: 'We verified it instead, by running the thing and reading what the port had actually produced. That surfaced eight real defects. They are the `Fixed` list in the 0.6.0 changelog, and this post is about why they were there and what finding them took.',
      },
      {
        type: 'h2',
        id: 'why-verify-a-port',
        text: 'Why verify a port at all',
      },
      {
        type: 'p',
        text: 'A port is a translation, and translation loses things at the seams. Code is copied across a boundary where the surrounding context is different: a different set of exports, a different stylesheet, a different set of callers. Anything the original code relied on implicitly is a candidate for going missing, and implicit reliance is by definition not something a test was written to protect.',
      },
      {
        type: 'p',
        text: 'That is the shape of every defect below. Not one of them is a logic error a type checker would flag. They are an ordering mistake, a missing registration, a dropped optimisation, a stylesheet that did not travel. A port whose tests pass is not a port that works, because the tests describe the behaviour someone thought to write down, and a port is exactly the situation where the behaviour that matters is the behaviour nobody wrote down.',
      },
      {
        type: 'h2',
        id: 'the-eight-defects',
        text: 'The eight defects',
      },
      {
        type: 'list',
        items: [
          "Video frames could upload into a disposed GPU texture after a clip's source changed. The layer read the texture before it replaced the provider, so a re-pointed clip kept writing into the old one.",
          'A preview loading spinner could never clear after a failed decoder re-open. The failure watcher was never re-armed on the replacement provider.',
          "A borrowed frame was stretched to the stage between clips, because the held-over frame was fitted by the incoming clip's dimensions, which were not known yet.",
          'The timeline ruler showed 00:90 where it should have shown 01:30. Seconds never rolled over into minutes.',
          'The clip loading shimmer had no CSS at all, so a pending clip showed nothing.',
          'Horizontal clip virtualisation had been silently dropped in the port, so every clip on a long timeline was mounted.',
          'Preview overlays and clip badges used hard-coded colours and could not be themed.',
          'In the web playground, deleted imported media was resurrected from IndexedDB, and its object URLs were never revoked.',
        ],
      },
      {
        type: 'p',
        text: 'Read down that list and notice how few of them announce themselves. The ruler bug is visible, if you look at a ruler past a minute. The virtualisation bug is invisible until a timeline is long enough to hurt. The shimmer defect is the absence of something: a loading state that looks, to the user, exactly like nothing happening. The theming defect is invisible in the one theme the author was looking at.',
      },
      {
        type: 'h2',
        id: 'the-disposed-texture-bug',
        text: 'The disposed texture bug',
      },
      {
        type: 'p',
        text: 'The first one is the deepest, and it is a good example of a bug that lives in the order of two lines. In the video layer, `draw()` needs a texture to upload the current frame into, and it needs a provider (the thing that decodes frames for this clip). Usually both exist already, created when the clip entered the scene. But a clip can have its `src` changed while it is on screen, and when that happens the layer has to throw away the old provider and make a new one.',
      },
      {
        type: 'p',
        text: "Throwing away the provider also disposes the clip's texture and removes it from the layer's map. A `VideoTexture` hands its pooled GL texture back to the pool when it is disposed. The defect was that `draw()` read the clip's texture into a local variable first, and only then asked for the provider. When the source had changed, the provider call disposed and unmapped the texture, but the local variable still held it and was still truthy. The frame was then uploaded into a texture the layer had already given up. A texture that is no longer in the layer's map is one the layer will never bind for that clip and never release again.",
      },
      {
        type: 'p',
        text: 'The fix is an ordering change. `draw()` now makes sure the provider is current before it reads the texture, and if the texture is missing afterwards it creates a fresh one and tracks it. The comment in the code says it plainly: ensure the provider before reading the texture, because a source change disposes and unmaps the old texture inside the ensure step.',
      },
      {
        type: 'p',
        text: 'The second half of the fix is about reference counts, and it is the part that is easy to miss. The layer keeps a reference count per clip, raised when the clip is acquired for drawing, and a provider sitting at a count of zero is fair game for two things: idle eviction, which disposes it after a timeout, and the prewarm pass, which seeks it ahead of an upcoming cut. When a provider is replaced because the source changed, the new one used to start at zero. The clip was still being drawn, but the layer now believed nobody was using its decoder. A replaced provider now inherits the reference count of the one it replaces, so a live provider is never exposed to eviction or a prewarm seek.',
      },
      {
        type: 'note',
        title: 'The same family of bug',
        text: "The spinner defect is its sibling. A provider can fail to re-open its container, and the watcher that turns that failure into an error state on the clip was attached to the old provider only. The fix re-arms it on the replacement, and disposing a provider now always clears the clip's load state, so the preview can never be left showing a spinner for a clip nobody is waiting on.",
      },
      {
        type: 'h2',
        id: 'what-only-a-build-catches',
        text: 'What only a build catches',
      },
      {
        type: 'p',
        text: 'Some of these defects cannot be found by running tests against local source, because the thing that is wrong is not in the source. The shimmer is the cleanest example. The component rendered, carrying the right class name. The class name had no rule behind it, because the stylesheet that defines it, `@elah/timeline/styles`, had not been given the shimmer. A test that renders the component sees the class on the element and passes.',
      },
      {
        type: 'p',
        text: 'The only check in the repository that exercises the published packages instead of local source is the root `verify:examples` script. It builds the three apps in `examples/` (a minimal Vite app, a fuller React editor and a Next.js app) against the packages as they are published to npm. Those apps import what a real consumer imports and load the stylesheets a real consumer loads, so a missing export or a missing rule fails the build of an app that has no knowledge of our internals.',
      },
      {
        type: 'p',
        text: 'Be precise about what that gives you. It checks what is published, so it can only confirm a release after the packages are on npm; the examples were verified against 0.4.1 from a clean registry install, with full MP4 exports in the React and Next apps under both the dev server and a production build. For a release that is not yet published, the same discipline applies by hand: import the package the way a consumer does, from a place that does not know where your source lives.',
      },
      {
        type: 'h2',
        id: 'a-checklist-for-your-own-ports',
        text: 'A checklist for your own ports',
      },
      {
        type: 'p',
        text: 'None of this is specific to a video editor. If you are carrying code across a boundary, these are the questions that found our eight.',
      },
      {
        type: 'list',
        items: [
          'Diff the public surface, not just the code. List what the source exports and what the destination exports, and explain every difference. A silently removed export is a break you have not met yet.',
          'Diff what the code assumed was there: stylesheets, design tokens, polyfills, build config. A class name that no rule defines is invisible to every test that renders it.',
          'Check every optimisation survived. Virtualisation, memoisation and caching are easy to drop because removing them changes no behaviour, only cost.',
          'Look for ordering in lifecycle code. Wherever one step disposes something and a later step reads it, check which comes first.',
          'Follow every counter and every owner through a replacement. When you swap an object for a successor, say what the successor inherits.',
          'Try the long input. Past a minute on a ruler, past a screenful of clips, past a session restart. Most of these defects appear only at the edge of the data.',
          'Build the consumers against the real artefact, and mutation-check each fix by reverting that one change and confirming the check fails.',
        ],
      },
      {
        type: 'quote',
        text: 'A green test suite is a statement about what you thought to check. A port is the moment to check what you did not.',
      },
    ],
  },
  {
    slug: 'frame-sequences-as-timelines',
    date: '2026-09-26',
    category: 'Architecture',
    title: 'Frame sequences: 360° orbits as timelines',
    excerpt:
      'A product orbit, a generated image set and a storyboard are all the same thing: ordered images addressed by index. The core now models that directly, and turns it into an ordinary project when you want to edit or export it.',
    readingTime: '6 min read',
    content: [
      {
        type: 'p',
        text: 'Spin a product on a shop page and you are scrubbing a video that is not a video. Behind the drag handler there is usually a folder of stills, thirty-six of them if the turntable moved ten degrees at a time, and a function that maps the pointer to a number. The pointer position is an index. The picture is whichever file that index names.',
      },
      {
        type: 'p',
        text: 'That shape turns up everywhere once you look for it. Generated image sets are the same. A storyboard is the same. We added it to `@elah/core` in 0.6.0 as a small, React-free abstraction, and the interesting part is not the abstraction. It is how little work it takes to turn it back into an ordinary timeline.',
      },
      {
        type: 'h2',
        id: 'what-a-frame-sequence-is',
        text: 'What a frame sequence is',
      },
      {
        type: 'p',
        text: 'A `FrameSequence` is an ordered list of frames plus a rule for moving through them. Each `Frame` has an `id`, an `index` that always equals its position in the array, a base `src`, and optionally a list of responsive `sources` (a width and a MIME type each, the same information a `srcset` needs). The sequence carries a playback `fps`, a `loop` mode, and one flag worth explaining: `seamless`.',
      },
      {
        type: 'p',
        text: '`seamless` is true only when the last frame joins the first without a visible jump, which is to say a genuine closed 360° orbit. It is a fact about the asset, not a preference about the interface, which is why it lives on the sequence. A camera arc that stops at 200 degrees looks broken when wrapped, because the subject snaps back. So `loop` defaults from it: a seamless sequence wraps, and anything else bounces.',
      },
      {
        type: 'code',
        language: 'ts',
        filename: 'create-sequence.ts',
        code: `import { createFrameSequence, frameAt, frameCount } from '@elah/core'

const orbit = createFrameSequence({
  frames: ['orbit-000.webp', 'orbit-010.webp', 'orbit-020.webp' /* ... */],
  seamless: true, // closed orbit, so loop defaults to 'wrap'
  label: 'Chair, 360 degrees',
})

frameCount(orbit)  // 3 here
frameAt(orbit, -1) // wraps to the last frame`,
      },
      {
        type: 'p',
        text: 'Frames can be bare strings, as above, or partial frames with their own `id` and `sources`; `createFrameSequence` fills in the ids and indices. `normalizeFrameIndex(sequence, index)` is the single place that decides what an out-of-range index means. Under `none` it clamps. Under `wrap` it takes a true modulo, which matters because the JavaScript remainder operator returns negatives for negative input. Under `pingpong` it reflects at each end over a period of twice the frame count minus two, so the end frames are each visited once and there is no stutter at the turn.',
      },
      {
        type: 'h2',
        id: 'the-controller',
        text: 'The controller',
      },
      {
        type: 'p',
        text: '`FrameSequenceController` is what you attach a viewer to. It owns the current index, a clock, and drag-to-scrub, and it is deliberately per-instance: nothing in it is module-scoped, so a page can run several sequences independently. That is the property that lets several orbit viewers coexist on one page where only one `EditorProvider` can.',
      },
      {
        type: 'p',
        text: "The clock is not new code. The controller owns a `PlaybackEngine`, the same anchor-and-integrate clock the editor's transport uses, so autoplay inherits the integer-frame notification guard and the tab-visibility handling for free, and behaves the way the timeline does. The clock counts linearly and its output is mapped through `normalizeFrameIndex`, which is how `wrap` and `pingpong` both ride one counter without the controller knowing the difference.",
      },
      {
        type: 'p',
        text: "Drag is where the design has an opinion. The distance the pointer must travel per frame is derived from the viewer's width, and `dragSensitivity` is how many sequence-lengths one full-width drag covers, defaulting to 1, so by default one full-width drag sweeps through the whole sequence once and the gesture feels the same on a phone and on a wide monitor. A fixed pixels-per-frame rule makes a wide viewer sluggish and a narrow one twitchy. The fractional position is accumulated as a float during the drag and rounded only when emitting, so a slow drag still advances instead of rounding to zero on every move.",
      },
      {
        type: 'code',
        language: 'ts',
        filename: 'controller.ts',
        code: `import { FrameSequenceController } from '@elah/core'

const controller = new FrameSequenceController({ sequence: orbit })

controller.setViewportWidth(viewer.clientWidth)
viewer.addEventListener('pointerdown', (e) => controller.beginDrag(e.clientX))
window.addEventListener('pointermove', (e) => controller.drag(e.clientX))
window.addEventListener('pointerup', () => controller.endDrag())

controller.subscribe(({ index }) => showFrame(index))`,
      },
      {
        type: 'p',
        text: 'The snapshot the controller exposes is reference-stable between changes, which is what lets React bind it with `useSyncExternalStore` without an adapter. And because a React effect cleanup is not proof of unmount, there is a reversible `detach()` and `reattach()` pair alongside the final `destroy()`. A StrictMode remount runs setup, cleanup, setup against one controller; tearing the clock down irreversibly there left a transport that claimed to be playing while the index never moved.',
      },
      {
        type: 'h2',
        id: 'preloading',
        text: 'Preloading without starving the frame you are looking at',
      },
      {
        type: 'p',
        text: 'Thirty-six frames is thirty-six network requests. Fire them all at once and the frame the user is looking at competes with the one on the far side of the orbit. Load them lazily and every drag lands on an undecoded image. `createFramePreloader(sequence, options)` loads outward from the focus: the current frame first, then one either side, then two, under a concurrency cap. You call `focus(index)` as the index changes and it re-prioritises. Under `wrap` it measures distance the short way round, so focusing frame 0 of a closed orbit treats the last frame as its neighbour.',
      },
      {
        type: 'p',
        text: 'What it warms is the subtle part. It does not warm `frame.src`. It warms whatever `pickFrameSource(frame, sizeHint)` resolves, which is the URL the browser will actually paint: the first source whose MIME type the browser supports, then the narrowest candidate that still meets the target width, falling back to `frame.src` when nothing applies. `supportsImageType(type)` probes AVIF and WebP support once and memoizes the answer for the session. Warming a different URL than the one that will be painted downloads bytes nobody sees and delays the ones somebody needs, and that was the bug this module exists to close.',
      },
      {
        type: 'p',
        text: "Decoding goes through core's existing image cache rather than a second one, so a frame preloaded here is the same decoded object the renderer picks up if the sequence is later dropped on a timeline.",
      },
      {
        type: 'h2',
        id: 'frame-sequence-to-project',
        text: 'From a sequence to a project',
      },
      {
        type: 'p',
        text: 'Here is the bridge. `frameSequenceToProject(sequence, options)` is a pure function that builds a `Project`: one video track, and one image clip per frame laid end to end. Nothing about the result is special. You hand it to `engine.loadProject()` and it is a composition like any other.',
      },
      {
        type: 'code',
        language: 'ts',
        filename: 'to-project.ts',
        code: `import { frameSequenceToProject } from '@elah/core'

// One timeline frame per sequence frame: timeline time and index are the same number.
engine.loadProject(frameSequenceToProject(orbit))

// Hold each angle for 6 timeline frames instead, for a slower, slideshow-like pass.
engine.loadProject(frameSequenceToProject(orbit, { holdFrames: 6, fps: 30 }))`,
      },
      {
        type: 'p',
        text: "The defaults are chosen to keep that identity. `holdFrames` is 1, so index and timeline frame coincide, and the stage is 1920 by 1080, landscape on purpose, because orbits and storyboards usually are and it matches the CLI's spec default. The moment you want to trim the orbit, caption it, reorder it, put a transition between two angles or export it as an MP4, you are not doing anything special. It is a project. The editor did not need to learn what a sequence is.",
      },
      {
        type: 'h2',
        id: 'why-not-just-a-video',
        text: 'Why not just a video',
      },
      {
        type: 'p',
        text: 'You could render the orbit to a video and seek it. Plenty of viewers do. We did not, for reasons we can defend from how the pieces work.',
      },
      {
        type: 'p',
        text: "A sequence is addressed by index. Frame 17 is the seventeenth image, full stop, with no keyframe to find and no decoder to warm; the cost of asking for a frame does not depend on which frame it is or where you were a moment ago. A video is a different structure: compressed frames depend on earlier ones, and arriving at an arbitrary frame means starting from the nearest keyframe before it. For a drag that jumps backwards and forwards at the pointer's whim, that is the wrong access pattern.",
      },
      {
        type: 'p',
        text: "And every frame in a sequence is a still image in its own right, encoded on its own. Nothing in frame 17 was produced by compressing it against frame 16, so there is no inter-frame compression to smear detail while you are scrubbing. We are not claiming that stills are better for every use. A sequence is a poor fit for continuous motion with sound, which is what a video is for. For a product on a turntable, where the only thing that moves is the viewer's hand, indexed stills are the honest representation of what the data is.",
      },
      {
        type: 'quote',
        text: 'If the thing you are scrubbing is really a list of images, model it as a list of images. Then, when you want a video, you can have one.',
      },
    ],
  },
  {
    slug: 'webmcp-and-the-editor-as-a-tool-surface',
    date: '2026-10-02',
    category: 'Design',
    title: 'WebMCP and the editor as a tool surface',
    excerpt:
      'Agents already drive Elah from a one-file guide and a JSON render spec. WebMCP would let them drive an open editor in the browser. What the timeline already gets right for that, and where this stands: planned, with no date.',
    readingTime: '6 min read',
    content: [
      {
        type: 'p',
        text: 'Status first, because this post is about a direction and it would be easy to read it as an announcement. WebMCP support for Elah is planned. Nothing in this repository implements it today, there is no beta, and we have no date to give you. Everything below the status line is about why we think the engine is shaped well for it, and what we would expose when we build it.',
      },
      {
        type: 'h2',
        id: 'agents-already-use-elah',
        text: 'Agents already use Elah',
      },
      {
        type: 'p',
        text: 'It is worth being concrete about the part that is real. Coding agents use Elah now, through two doors, and both were designed for a reader that gets one shot.',
      },
      {
        type: 'p',
        text: 'The first is a single file, `docs/ai/ELAH_FOR_AI_AGENTS.md`. It is a complete integration guide for building a custom editor UI on `@elah/editor`, written so that nothing in it requires reading another file or having the repository checked out. That matters for the tools that generate an app in a hosted sandbox with no repo access. It also contains the unglamorous section that earns its keep, the common mistakes: the three stylesheets people forget, the bundler setup, the places a first attempt goes wrong.',
      },
      {
        type: 'p',
        text: 'The second is the headless one. `npx @elah/cli serve` starts an HTTP render server that accepts a JSON build spec: times in seconds, assets by name, no engine bookkeeping. If the spec is wrong, the error is addressed by path, in the form `clips[2].duration must be …`, and the server answers with a 422. A generating model can read that, fix `clips[2]`, and try again. The point of the format is that the failure message names the field the model wrote.',
      },
      {
        type: 'p',
        text: 'Both doors share an assumption: the agent produces text, and the engine turns text into a video. What they do not give an agent is a way to work inside an editor a person already has open. That is the gap WebMCP is aimed at.',
      },
      {
        type: 'h2',
        id: 'what-webmcp-is',
        text: 'What WebMCP is',
      },
      {
        type: 'p',
        text: 'WebMCP is a proposal in the W3C Web Machine Learning Community Group, put forward by Google and Microsoft. The idea is that a web page can tell the browser, and through it any agent, what it can do. A page registers tools with `document.modelContext.registerTool()`, a name that replaced `navigator.modelContext` around August 2026, and each tool describes its arguments with JSON Schema. An agent that visits the page discovers those tools, instead of having to guess at buttons by reading the DOM or looking at screenshots.',
      },
      {
        type: 'p',
        text: "Support is early and uneven, and we will state what we verified rather than what we hope. Chrome shipped it in Canary 146 and ran an origin trial from Chrome 149. ChatGPT's desktop browser and Codex can discover WebMCP tools on a page, and Claude Code reaches them through an MCP bridge. Firefox and Safari are engaged but have not committed. The specification itself has already been renamed once, so treat any code written against it today as provisional.",
      },
      {
        type: 'code',
        language: 'ts',
        filename: 'illustration-only.ts',
        code: `// Illustrates the WebMCP standard. This is NOT an elah API, and nothing in
// this repository calls it. The exact shape is still moving.
document.modelContext.registerTool({
  name: 'get_weather',
  description: 'Look up the current weather for a city',
  inputSchema: {
    type: 'object',
    properties: { city: { type: 'string' } },
    required: ['city'],
  },
  async execute({ city }) {
    return { content: [{ type: 'text', text: 'Sunny in ' + city }] }
  },
})`,
      },
      {
        type: 'h2',
        id: 'what-a-timeline-exposes-well',
        text: 'What a timeline exposes well',
      },
      {
        type: 'p',
        text: 'A tool surface is only as good as the thing behind it. Handing an agent a poorly shaped model, one where meaning is implicit and every action half-works, produces an agent that fails in interesting ways. A timeline engine happens to have three properties that suit an agent unusually well, all of which exist because of decisions we made for other reasons.',
      },
      {
        type: 'p',
        text: 'The first is integer frames. Every position and duration in the model is a whole number of frames, so when an agent says frame 240 there is exactly one thing it can mean. There is no rounding to argue about, no question of whether 8.0 seconds and 8.0000003 seconds are the same instant, and the half-open interval rule settles which clip owns a seam. An agent that reasons in seconds has to be taught our rounding. An agent that reasons in frames just has to count.',
      },
      {
        type: 'p',
        text: 'The second is one mutation funnel. Every project edit goes through `TimelineEngine`; the stores that the interface reads are mirrors, never written to. For a person that is an architecture rule. For an agent it is a guarantee: whatever an agent does, it does through the same methods a human drag does, which means it is validated the same way, it lands in the same history, and it shows up in the interface because the interface is listening to the same engine. There is no second, privileged path for an agent to use or to break.',
      },
      {
        type: 'p',
        text: 'The third is batching. `engine.batch(recipe, description)` groups several mutations into a single undo entry. A multi-step edit that an agent plans as a unit becomes a unit for the person too.',
      },
      {
        type: 'code',
        language: 'ts',
        filename: 'batch.ts',
        code: `// Several steps, one undo entry.
engine.batch(() => {
  engine.setClipSpeed(clip.id, clip.trackId, 2)
  engine.updateClip(clip.id, clip.trackId, { cornerRadius: 0.1 })
}, 'Tighten the intro')`,
      },
      {
        type: 'p',
        text: 'Put those together and you get the property that makes an agent tolerable to work beside: when it does something you did not want, you press undo once and it is gone. An agent that edits your project is only usable if its mistakes are cheap, and the history model was already built to make mistakes cheap.',
      },
      {
        type: 'h2',
        id: 'what-we-plan-to-expose',
        text: 'What we plan to expose',
      },
      {
        type: 'p',
        text: 'This section is intent, not a specification, and the names will change. The surface we have in mind is deliberately small, because a long list of tools is a long list of ways for a model to pick the wrong one.',
      },
      {
        type: 'list',
        items: [
          'Describe the project: read the current tracks, clips and their frame positions, so an agent starts from what is on the timeline and not from a guess.',
          'Apply edits: change the project through the engine, as a batch, so the result is one step the person can undo.',
          'Export: render the result to a file, with the same pipeline a person would use.',
        ],
      },
      {
        type: 'p',
        text: 'Describing before editing is the part we care most about. An agent that cannot see the timeline will invent one, and a plausible invention is worse than an error. Reading first, then proposing, then applying as one undoable step is the loop we would want even if no standard existed.',
      },
      {
        type: 'h2',
        id: 'status',
        text: 'Status',
      },
      {
        type: 'p',
        text: 'To repeat what we said at the top, without softening it. WebMCP support is planned. It is not shipped and it is not in beta. There is no date, and this post is not one. What exists today is the single-file guide for agents building on the SDK and `npx @elah/cli serve` for agents rendering from a spec. If you are building something that would benefit from the open-editor version, open an issue on GitHub and tell us what you would want an agent to be able to do, and in what order. That is more useful to us than a date would be to you.',
      },
      {
        type: 'quote',
        text: 'Expose the model you already trust your own interface with. If an agent needs a second, looser path, the first one was not good enough.',
      },
    ],
  },
  {
    slug: 'webcodecs-frame-pool-exhaustion',
    date: '2026-06-07',
    category: 'Architecture',
    title: 'Solving WebCodecs Frame Pool Exhaustion',
    excerpt:
      "When the hardware output pool fills up, WebCodecs VideoDecoder stalls silently. Here's how we found it, why the copy-and-close pattern fixes it, and what to watch for in your own decode pipeline.",
    readingTime: '8 min read',
    content: [
      {
        type: 'p',
        text: 'Playback would run for a fraction of a second — about 18 frames — and then freeze. No error, no exception, no rejected promise. The decoder simply went silent and our `flush()` waited forever for an output that never came. This is the story of a bug that hides in the lifetime semantics of a single object: the WebCodecs `VideoFrame`.',
      },
      {
        type: 'h2',
        id: 'a-videoframe-is-borrowed',
        text: 'A VideoFrame is a borrowed library book, not a photo',
      },
      {
        type: 'p',
        text: 'The hardware video decoder is a tiny library with a fixed shelf of roughly 16 books — its internal frame pool. Each time it decodes a picture it hands you one book: a `VideoFrame`. Crucially, a `VideoFrame` is not a copy of the pixels. It is a borrowed handle to one shelf slot inside the decoder.',
      },
      {
        type: 'p',
        text: "The library's rule is strict: you may read the book (upload it to the GPU), but you must return it by calling `frame.close()` so the slot frees up. If you keep books, the shelf empties. And with an empty shelf the librarian — the decoder — cannot make new books. It does not crash. It just stops.",
      },
      {
        type: 'code',
        language: 'text',
        code: `Decoder's shelf (~16 slots):
[B][B][B][B][B][B][B][B][B][B][B][B][B][B][ ][ ]
 every B = one VideoFrame you are still holding open
 keep ~16 open  ->  shelf full  ->  decoder can't decode  ->  FREEZE`,
      },
      {
        type: 'h2',
        id: 'the-bug',
        text: 'The bug: a cache that never gave the books back',
      },
      {
        type: 'p',
        text: 'Our `FrameCache` stored the raw `VideoFrame` and only closed it much later, on eviction. That sounds fine until you look at the numbers: the cache was sized at 30 entries, but a short clip only ever decodes around 14 frames. Eviction never fired. No frame was ever closed. The shelf filled to ~16, the decoder went silent, and the next `flush()` hung waiting for a slot that would never come back.',
      },
      {
        type: 'p',
        text: 'The breaking line was `cache.put(frame)` — the cache held the book itself. Everything downstream was correct; the ownership model was the defect.',
      },
      {
        type: 'h2',
        id: 'copy-and-close',
        text: 'The fix: photocopy the book, return the original immediately',
      },
      {
        type: 'p',
        text: '`createImageBitmap(frame)` makes a photocopy on plain paper. The `ImageBitmap` is yours forever and costs the decoder nothing — it holds no pool slot. So the instant a frame arrives we copy it, hand the book straight back with `frame.close()`, and then cache the photocopy.',
      },
      {
        type: 'code',
        language: 'ts',
        filename: 'StreamingFrameProducer.ts',
        code: `// onFrame fires from VideoDecoder.output for every decoded frame
private async _copyAndCache(frame: VideoFrame, index: number) {
  // 1. Photocopy: an ImageBitmap holds no decoder pool slot
  const bitmap = await createImageBitmap(frame)
  // 2. Return the book NOW — the slot is free again immediately
  frame.close()
  // 3. Cache the copy; the cache is its sole owner
  this.cache.put(index, bitmap)
}`,
      },
      {
        type: 'p',
        text: 'The result: the shelf is almost always empty, the decoder never starves, and playback is smooth. Both `VideoFrame` and `ImageBitmap` are valid `TexImageSource`, so the copy uploads to the GPU exactly like the original would have.',
      },
      {
        type: 'h2',
        id: 'single-owner',
        text: 'The knock-on simplification: one owner, one closer',
      },
      {
        type: 'p',
        text: "Before the fix, `VideoLayer.draw` called `frame.clone()` before uploading, because two owners both believed they had to close the frame: the cache and the texture upload's `finally` block. Cloning was a smell that said nobody had agreed who owns this. Once the cache held a photocopy that only it owned, the clone disappeared and upload became a pure borrow. The whole pipeline collapsed to one sentence:",
      },
      {
        type: 'quote',
        text: 'The FrameCache owns every cached frame and is the only thing that closes it. Everyone else borrows and never closes.',
      },
      {
        type: 'note',
        title: 'A second benefit: context-loss safety',
        text: "Because the cache holds plain-memory copies rather than GPU objects, it survives a WebGL context loss (driver reset, tab backgrounded, alt-tab). When the GPU comes back, the next render re-uploads from the surviving cache — no re-decode, no stutter. A photocopy is just as re-uploadable as the original book.",
      },
      {
        type: 'p',
        text: 'The lesson generalizes beyond video: any time you cache a borrowed, pool-backed resource, decide who owns it and who closes it before you store it. The instant two code paths both think they own it, you have either a leak or a freeze — you just have not hit it yet.',
      },
    ],
  },
  {
    slug: 'renderer-agnostic-core',
    date: '2026-06-04',
    category: 'Architecture',
    title: 'Why the Core Has No Renderer Imports',
    excerpt:
      "A renderer-agnostic core means resolveTimeline() runs identically in the browser, in a worker, and in tests. Here's the interface boundary we drew and how it keeps preview and export in sync.",
    readingTime: '6 min read',
    content: [
      {
        type: 'p',
        text: 'The single most important rule in the engine is also the most boring to state: a renderer takes a `Scene` and produces pixels, and it knows nothing else. It does not ask the engine what time it is. It does not look up clips by id. It does not know what a `Project` is. Everything a renderer needs is in the `Scene` it receives.',
      },
      {
        type: 'p',
        text: 'That constraint sounds like an inconvenience. It is actually the thing that makes the whole system testable, exportable, and future-proof.',
      },
      {
        type: 'h2',
        id: 'the-interface',
        text: 'Four methods, nothing else',
      },
      {
        type: 'code',
        language: 'ts',
        filename: 'core/renderer/types.ts',
        code: `interface Renderer {
  mount(container: HTMLElement): void
  resize(cssWidth: number, cssHeight: number, dpr?: number): void
  render(scene: Scene): void
  dispose(): void
}`,
      },
      {
        type: 'p',
        text: '`render(scene)` is synchronous and idempotent on equal references — if `scene === lastScene`, it is a no-op. The renderer reads only the `Scene`; it never imports `Project`, `Clip`, the engines, the stores, or React. Any async decode or upload work happens out-of-band on subsequent ticks, never inside the render call.',
      },
      {
        type: 'h2',
        id: 'the-pure-function',
        text: 'The pure function in the middle',
      },
      {
        type: 'p',
        text: 'The bridge between mutable editor state and a dumb renderer is one pure function:',
      },
      {
        type: 'code',
        language: 'ts',
        code: `function resolveTimeline(frame: number, project: Project): Scene`,
      },
      {
        type: 'p',
        text: 'Given the same `(frame, project)`, it always produces a structurally-equal `Scene`. No DOM access, no React, no Zustand, no side effects. It decides what is visible and audible at a given frame and returns plain data: `videos`, `audios`, `texts`, `images`, and `transitions`. Callers do the side effects; the resolver only computes.',
      },
      {
        type: 'note',
        title: 'Why purity pays off',
        text: 'Because resolveTimeline is pure, it is unit-testable without a DOM, safe to run inside a Web Worker, and memoizable by (frame, project) reference equality. It runs 60 times per second — bugs there are invisible without tests, so the test suite is the spec.',
      },
      {
        type: 'h2',
        id: 'preview-and-export',
        text: 'How this keeps preview and export in sync',
      },
      {
        type: 'p',
        text: 'Export is not a `Renderer`. The export worker draws to a 2D `OffscreenCanvas` rather than instantiating the WebGL renderer. So what stops preview and export from drifting apart? They consume the same `resolveTimeline` output and reuse the same pure placement helpers — `resolveDrawRect`, `computeTextLayout`. It is the shared resolution, not a shared draw call, that guarantees identical geometry.',
      },
      {
        type: 'p',
        text: 'This is the payoff of the boundary. The live preview runs WebGL2 on the main thread; export runs Canvas2D in a worker with no GPU context at all. Two completely different draw paths, one source of truth for what to draw and where. They cannot drift because the math that decides geometry lives in one place that both import.',
      },
      {
        type: 'h2',
        id: 'future-renderers',
        text: 'What this buys for the future',
      },
      {
        type: 'p',
        text: 'A WebGPU backend — for shader effects and richer transitions — would implement the same four-method `Renderer` interface and consume the same `Scene`. No change to the engine, the resolver, or the React layer. The same is true for a hypothetical DOM or server-side renderer. The contract is the `Scene`, and the `Scene` is small.',
      },
      {
        type: 'quote',
        text: 'The renderer that knows about the project is the renderer you cannot test, cannot move to a worker, and cannot replace. Draw the line at the Scene and never cross it.',
      },
    ],
  },
  {
    slug: 'integer-frames',
    date: '2026-05-28',
    category: 'Design',
    title: 'Frames as the Primitive Unit of Time',
    excerpt:
      'Every NLE that uses floating-point seconds eventually ships a subtle drift bug. Using integer frames eliminates an entire class of problems at the cost of one invariant every developer needs to know.',
    readingTime: '5 min read',
    content: [
      {
        type: 'p',
        text: 'Here is a bug that has shipped in more video editors than anyone wants to admit: two clips that should be perfectly flush end up 0.0000003 seconds apart. At the join frame, the renderer has to pick which clip wins, and it picks arbitrarily. Sometimes you get a one-frame flash of the wrong clip. Sometimes a gap. It is intermittent, it is data-dependent, and it is miserable to reproduce.',
      },
      {
        type: 'p',
        text: 'The root cause is always the same: time was stored as floating-point seconds, and floating-point addition is not associative. Split a clip, move it, trim it, and the rounding errors compound until flush is no longer flush.',
      },
      {
        type: 'h2',
        id: 'the-decision',
        text: 'The decision: integer frames everywhere',
      },
      {
        type: 'p',
        text: 'In this engine, `currentFrame` is an integer, and so is everything that describes time. Clips carry `startFrame`, `durationFrames`, `sourceStartFrame`, and `sourceDurationFrames` — all integers. Seconds exist at exactly one place: the rendering boundary, when we set `videoEl.currentTime = sourceFrame / fps`. Nowhere else.',
      },
      {
        type: 'code',
        language: 'ts',
        code: `// Bad — floating seconds compound rounding on every edit
clip.start = 1.5
clip.duration = 3.2
currentTime = 4.7

// Good — integer frames are exact, forever
clip.startFrame = 45
clip.durationFrames = 96
currentFrame = 141`,
      },
      {
        type: 'p',
        text: 'Integer math is exact. Adjacent clips are flush when `clipA.startFrame + clipA.durationFrames === clipB.startFrame`, and that equality never decays no matter how many times you split, slip, or move.',
      },
      {
        type: 'h2',
        id: 'the-half-open-interval',
        text: 'The one invariant: the half-open interval',
      },
      {
        type: 'p',
        text: "Integers remove rounding, but you still need one rule to decide which clip is active at a seam. A clip is active if and only if `startFrame <= frame < startFrame + durationFrames`. The interval is half-open: the start frame is included, the end frame is not.",
      },
      {
        type: 'p',
        text: 'This is the single most important thing to internalize. It means adjacent clips never both fire on the same frame — clip A ends exactly where clip B begins, and frame B-start belongs unambiguously to B. Source mapping then becomes pure arithmetic:',
      },
      {
        type: 'code',
        language: 'ts',
        code: `// The only place trim semantics live
sourceFrame = (frame - clip.startFrame) + clip.sourceStartFrame`,
      },
      {
        type: 'h2',
        id: 'two-coordinate-systems',
        text: 'Why two frame coordinate systems',
      },
      {
        type: 'p',
        text: 'There are two kinds of frames in the model, and keeping them distinct is what makes non-destructive editing possible:',
      },
      {
        type: 'list',
        items: [
          'Timeline frame — where on the timeline the clip lives (startFrame).',
          'Source frame — what part of the source media plays (sourceStartFrame).',
        ],
      },
      {
        type: 'p',
        text: 'A split is then trivially correct: create two clips with the same `src`, adjust their `startFrame` and `sourceStartFrame`, and no media is re-encoded. Trims and slips are likewise just integer adjustments to those two windows.',
      },
      {
        type: 'note',
        title: 'The clock follows the same rule',
        text: 'The PlaybackEngine integrates a float frame position internally for sub-frame seeking, but the store and UI consume Math.floor(getFrameAt()). Float lives at the boundary; integers are the contract.',
      },
      {
        type: 'p',
        text: 'The cost of all this is one invariant every contributor must know — the half-open interval. That is a cheap price for permanently deleting an entire category of drift bugs.',
      },
    ],
  },
  {
    slug: 'transition-architecture',
    date: '2026-06-01',
    category: 'Implementation',
    title: 'Snapshot-Overlay Transitions: Preview and Export in Sync',
    excerpt:
      'GPU crossfade is the obvious approach. It is also the wrong one for a renderer-agnostic system. Here is the snapshot-overlay architecture that keeps CSS preview and OffscreenCanvas export using the same resolver output.',
    readingTime: '7 min read',
    content: [
      {
        type: 'p',
        text: 'When you set out to build a crossfade, the obvious move is to do it on the GPU: render both clips to textures, blend them in a shader with a time-varying alpha, done. It works beautifully — in the preview. Then you go to export, where there is no GPU context in the worker, and you have to reimplement the entire blend a second way. Now you own two crossfade implementations that must produce pixel-identical results, and they will drift.',
      },
      {
        type: 'p',
        text: 'For a renderer-agnostic system, the GPU-crossfade is the wrong primitive. The right one keeps the transition logic out of the renderer entirely.',
      },
      {
        type: 'h2',
        id: 'the-resolver-decides',
        text: 'The resolver decides opacity, not the renderer',
      },
      {
        type: 'p',
        text: 'In a fade, the resolver does the work that matters. During the overlap window it sets the outgoing clip to `opacity = 0` and the incoming clip to `opacity = 1`, and emits the transition descriptor on `Scene.transitions`. The renderer never learns the word "fade" — it just draws clips at the opacities it is handed.',
      },
      {
        type: 'code',
        language: 'ts',
        code: `interface Scene {
  frame: number
  videos: ActiveVideoClip[]
  audios: ActiveAudioClip[]
  texts: ActiveTextClip[]
  images: ActiveImageClip[]
  transitions: SceneTransition[]   // describes the fade; renderer ignores semantics
}`,
      },
      {
        type: 'h2',
        id: 'snapshot-overlay',
        text: 'The snapshot-overlay trick in preview',
      },
      {
        type: 'p',
        text: "Here is the part that keeps preview simple: instead of blending two live clips, the preview freezes a canvas snapshot of the outgoing frame and fades that snapshot out over the top of the incoming clip using plain CSS opacity. One frozen image, one CSS transition. No second live decode, no shader blend, no per-frame compositing math on the hot path.",
      },
      {
        type: 'p',
        text: 'A `TransitionOverlay` component owns the snapshot and its CSS fade. The underlying renderer just keeps drawing the incoming clip at full opacity. The crossfade you see is the snapshot dissolving away on top.',
      },
      {
        type: 'h2',
        id: 'export-mirrors',
        text: 'Export mirrors it with one line of canvas math',
      },
      {
        type: 'p',
        text: 'Export cannot use CSS, but it does not need the snapshot trick either — it has every frame available deterministically. It mirrors the same fade by drawing the outgoing content with a time-varying global alpha:',
      },
      {
        type: 'code',
        language: 'ts',
        code: `// Export worker, per transition frame at progress t in [0, 1]
ctx.globalAlpha = 1 - t
drawOutgoing(ctx, scene)
ctx.globalAlpha = 1
drawIncoming(ctx, scene)`,
      },
      {
        type: 'p',
        text: 'Both paths are driven by the same resolver output — the same opacities, the same transition descriptor, the same timing. Preview fades a frozen snapshot with CSS; export composites with `globalAlpha`. Two mechanisms, one source of truth, no drift.',
      },
      {
        type: 'note',
        title: 'Status',
        text: 'The snapshot-overlay architecture is in place and fade is fully implemented in both preview and export. Slide and wipe transitions reuse the same Scene.transitions plumbing; only fade is shipped so far.',
      },
      {
        type: 'h2',
        id: 'the-principle',
        text: 'The principle underneath',
      },
      {
        type: 'p',
        text: 'The reason this works is the same reason the whole engine works: the renderer stays dumb. The moment a transition becomes "a thing the renderer knows how to do," you have coupled visual effects to a specific draw backend, and every new backend owes you a reimplementation. Keep the semantics in the resolver, hand the renderer plain opacities, and let each output path realize the fade with whatever primitive it has — CSS here, `globalAlpha` there.',
      },
      {
        type: 'quote',
        text: 'A transition is not something a renderer does. It is something the resolver describes and every renderer happens to obey.',
      },
    ],
  },
  {
    slug: 'webgl2-gpu-renderer',
    date: '2026-05-20',
    category: 'Implementation',
    title: 'Building a WebGL2 Renderer for an NLE',
    excerpt:
      'Textured quads, zIndex sorting, context-loss recovery, and the 2D-canvas-to-texture pipeline for text. A walkthrough of the GpuRenderer architecture.',
    readingTime: '10 min read',
    content: [
      {
        type: 'p',
        text: 'The GpuRenderer has exactly one job: turn a `Scene` into a sorted list of textured-quad draw calls, using GPU memory that is pooled and async work that never blocks the render path. Everything under the `gpu/` folder collaborates around that single idea. This is a walkthrough of how the pieces fit.',
      },
      {
        type: 'h2',
        id: 'everything-is-a-quad',
        text: 'Everything is a textured quad',
      },
      {
        type: 'p',
        text: 'There is no per-element shader zoo. Video frames, static images, and text all become the same primitive: a textured quad drawn with one shared quad shader. Three layers feed it — `VideoLayer` pulls frames from the decode pipeline, `ImageLayer` loads static bitmaps, and `TextLayer` rasterizes glyphs to a 2D canvas and uploads that as a texture. Once a layer has a texture, the draw path is identical for all three.',
      },
      {
        type: 'p',
        text: 'Placement math — object-fit contain, per-clip transforms, text layout — lives in pure helpers (`drawRect.ts`, `objectFit.ts`, `textLayout.ts`) that the export path reuses verbatim. The renderer does not invent geometry; it consumes it.',
      },
      {
        type: 'h2',
        id: 'rendergraph',
        text: 'RenderGraph: diff, acquire, release, sort',
      },
      {
        type: 'p',
        text: 'On each tick, the `RenderGraph` diffs the active clips in the new `Scene` against the previous one. Clips that left are released (their textures returned to the pool); clips that entered are acquired (a fresh texture allocated). Then it builds one global draw list and sorts it by `zIndex` ascending, so the last element drawn lands on top.',
      },
      {
        type: 'code',
        language: 'ts',
        code: `// zIndex comes from the resolver, derived from track order:
// zIndex = (maxOrder - track.order) * 1000
// track.order 0 (topmost in UI) -> highest zIndex -> front-most on screen.
// The * 1000 reserves room for sub-layer offsets (e.g. text +100 later).
drawList.sort((a, b) => a.zIndex - b.zIndex)`,
      },
      {
        type: 'h2',
        id: 'the-render-tick',
        text: 'The render tick is strictly synchronous',
      },
      {
        type: 'p',
        text: 'Called once per RAF tick, `render(scene)` runs top to bottom with no awaits. If `scene === lastScene` or the context is lost, it is a no-op. Otherwise it clears, asks the RenderGraph to execute, and for each draw entry the layer pulls its current frame and uploads it:',
      },
      {
        type: 'code',
        language: 'ts',
        code: `// VideoLayer.draw, per clip, inside the synchronous tick
provider.setPlayhead(sourceFrame)        // fire-and-forget; drives decode out-of-band
const frame = provider.getCurrent(sourceFrame)  // synchronous cache read
if (frame) {
  videoTexture.upload(gl, frame)         // borrow; never closes the frame
} else {
  // cache miss: keep the last texture content -> no flicker
}`,
      },
      {
        type: 'p',
        text: 'Two invariants this enforces: `render()` never awaits, and `render()` never throws on a missed frame — on a cache miss it simply draws the last upload, so a decoder that is still warming up produces a held frame rather than a black flash.',
      },
      {
        type: 'h2',
        id: 'out-of-band-decode',
        text: 'Decode happens out-of-band, push-based',
      },
      {
        type: 'p',
        text: 'The frame provider is the boundary between the synchronous render thread and the asynchronous decode work. The contract is push-based: `VideoLayer` calls `setPlayhead(N)` before `getCurrent(N)` on every tick, and the provider drives decoding internally. The render path never schedules individual frame requests.',
      },
      {
        type: 'p',
        text: 'A contiguous advance (|delta| <= 1) feeds only the new tail to the decoder, which stays warm — there is no per-frame `flush()`. A discontinuity (a seek, |delta| > 1, or the first call) triggers a `reset()` to the nearest keyframe and re-feeds the window. The decoder is reset only when the playhead actually jumps.',
      },
      {
        type: 'note',
        title: 'Frame ownership, one rule',
        text: 'The FrameCache is the single owner and only closer of every cached frame. On the real decode path the cache holds ImageBitmap copies; the decoded VideoFrame is closed in onFrame the instant the copy exists. VideoTexture.upload borrows and never closes. Violate this and you either leak GPU memory or freeze playback.',
      },
      {
        type: 'h2',
        id: 'the-gl-free-line',
        text: 'The GL-free line and context-loss recovery',
      },
      {
        type: 'p',
        text: 'A WebGL context can be lost at any moment — driver reset, laptop sleep, a tab backgrounded too long. When it happens, every GPU object is instantly dead: textures, shaders, the pool. Plain JavaScript memory is untouched. So the system draws a hard line: everything above it (VideoTexture, ShaderProgram, TexturePool) is rebuildable; everything below it (StreamingFrameProducer, VideoDecoderManager, demuxer, FrameCache) holds no GL and keeps running.',
      },
      {
        type: 'code',
        language: 'text',
        code: `GPU ZONE  — wiped on context loss
  VideoTexture · ShaderProgram · TexturePool      -> rebuilt on restore
=================== GL-free line ===================
SAFE MEMORY ZONE — survives a GPU reset
  StreamingFrameProducer · VideoDecoderManager
  Demuxer · FrameCache (ImageBitmap)              -> keeps running`,
      },
      {
        type: 'p',
        text: 'On `webglcontextlost` the renderer nulls its GL handles, releases all active items, and sets `lastScene = null`. On `webglcontextrestored` it re-acquires the context and re-runs GL state init. The next `render()` treats every clip as entering, rebuilds the shader program and VAO, and re-uploads from the surviving frame cache — no re-decode, no stutter. This is the second reason the copy-and-close fix matters: an ImageBitmap is just as re-uploadable to a brand-new context as the original VideoFrame.',
      },
      {
        type: 'h2',
        id: 'construction-order',
        text: 'Construction and disposal order is load-bearing',
      },
      {
        type: 'p',
        text: 'Dispose runs in reverse of construction for a reason: tearing down the texture pool before the render graph would leak acquired textures. So mount builds context, then pool, then layers, then graph; dispose releases the graph first (returning textures to the pool free-list), then deletes every pooled texture, then loses the context. Order is not stylistic here — it is correctness.',
      },
      {
        type: 'quote',
        text: 'A good renderer is mostly bookkeeping: who owns this texture, is this frame still borrowed, did the context just die. Get the ownership rules right and the pixels take care of themselves.',
      },
    ],
  },
  {
    slug: 'immer-timeline-engine',
    date: '2026-05-15',
    category: 'Architecture',
    title: 'One Mutation Funnel: TimelineEngine with Immer',
    excerpt:
      'All edits go through one commit path. Structural sharing, batching, typed events, and a redo stack that does not bloat memory — how the TimelineEngine is designed.',
    readingTime: '6 min read',
    content: [
      {
        type: 'p',
        text: 'The fastest way to make an editor unmaintainable is to scatter its mutations. Project data in one store, history in a class, the current frame in a hook, and a dozen components all writing wherever is convenient. Three sources of truth, one nominal truth, and infinite bugs. The `TimelineEngine` exists to make that impossible.',
      },
      {
        type: 'h2',
        id: 'one-funnel',
        text: 'Every change goes through commit()',
      },
      {
        type: 'p',
        text: 'There is exactly one place project state changes: `TimelineEngine.commit()`. Visitors — `add`, `remove`, `update`, `split`, `clone` — apply Immer drafts. `commit` records history, fires events, and swaps the project reference. There are no side-channel writes. A component cannot reach in and mutate a clip; it calls an engine method, and that method funnels through commit like everything else.',
      },
      {
        type: 'code',
        language: 'ts',
        code: `// A visitor describes the change as an Immer draft mutation...
engine.addClip({ trackId, type: 'video', startFrame: 0, durationFrames: 90 })

// ...and commit() does the rest, atomically:
//   1. produce() the next immutable project (structural sharing)
//   2. push a history entry
//   3. emit('change', project) and emit('history:change')`,
      },
      {
        type: 'h2',
        id: 'immer-structural-sharing',
        text: 'Why Immer: structural sharing for free',
      },
      {
        type: 'p',
        text: 'Immer lets visitors write code that looks like mutation — `draft.clips[trackId].push(clip)` — while producing a new immutable project under the hood. Unchanged subtrees are shared by reference between versions. That matters for two reasons: history snapshots are cheap (they share everything that did not change), and React consumers can use reference equality to skip re-renders for the parts of the tree that did not move.',
      },
      {
        type: 'note',
        title: 'The redo stack stays small',
        text: 'Because each commit produces a structurally-shared snapshot rather than a deep copy, the history and redo stacks do not bloat memory — two adjacent versions differ only by the nodes that actually changed.',
      },
      {
        type: 'h2',
        id: 'three-rings',
        text: 'The three-ring state model',
      },
      {
        type: 'p',
        text: 'The engine is Ring 0 — the immutable source of truth, owned by classes. Ring 1 is the reactive mirror: Zustand stores (`useTracksStore`, `usePlaybackStore`, `useMediaLibraryStore`) that sync from Ring 0 when the engine emits. Ring 2 is throwaway UI state — selection, drag handles, panel toggles. The rule is one-directional: outer rings read inner rings, never the reverse.',
      },
      {
        type: 'list',
        items: [
          'Ring 0 owns history, batching, and events. Replays are deterministic.',
          'Ring 1 is the React boundary. Components subscribe with granular selectors; one engine event triggers one sync().',
          'Ring 2 is transient. Selection and drag state never pollute the project history.',
        ],
      },
      {
        type: 'p',
        text: 'The forbidden patterns fall straight out of this: components must not write to Ring 0, Ring 0 must not read Ring 1 or Ring 2, and engine state must never live in `useState` or `useRef` instead of the engine.',
      },
      {
        type: 'h2',
        id: 'batching',
        text: 'Batching: many edits, one undo',
      },
      {
        type: 'p',
        text: 'Some user actions are logically one change but mechanically several mutations — dropping a video that has audio adds both a video clip and an audio clip. Those should undo together. `engine.batch()` wraps multiple mutations into a single commit and a single history entry:',
      },
      {
        type: 'code',
        language: 'ts',
        code: `engine.batch(() => {
  engine.addClip({ trackId, type: 'video', ...videoOpts })
  engine.addClip({ trackId: audioTrackId, type: 'audio', ...audioOpts })
}, 'Add video + audio')   // one undo entry`,
      },
      {
        type: 'h2',
        id: 'invariants',
        text: 'Invariants live inside the engine',
      },
      {
        type: 'p',
        text: 'Because every mutation funnels through one place, the engine is also the one place to enforce the data-model invariants: clips within a track are always sorted by `startFrame` and never overlap; `startFrame >= 0` and `durationFrames >= 1`; for media clips the trim window stays within the source. `moveClip` and `trimClip` enforce these as part of their commit. There is no other code path that could violate them, because there is no other code path at all.',
      },
      {
        type: 'quote',
        text: 'A single source of truth is not a diagram you draw. It is a mutation funnel you enforce — one commit(), no back doors.',
      },
    ],
  },
]

export function getPost(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug)
}

// Theme-aware category badge styles: flat filled chips (no border — tinted
// borders rendered as a muddy outline). Using the secondary/tertiary tokens
// (which flip per theme) keeps all four consistent in light and dark mode.
export const categoryColors: Record<Post['category'], string> = {
  Architecture: 'text-secondary bg-secondary/10',
  Design: 'text-tertiary bg-tertiary/10',
  Implementation: 'text-on-surface-variant bg-surface-high',
  Release: 'text-primary bg-primary/10',
}
