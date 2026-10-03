import { describe, it, expect, vi } from 'vitest'
import { TimelineEngine } from './TimelineEngine'
import { readProjectDocument } from './projectDocument'
import { PlaybackEngine } from '../playback/PlaybackEngine'
import type { Project, ProjectLoadedEvent } from '../types'

/**
 * Restore — `getProject()` out, `loadProject()` back in.
 *
 * The bug this covers is the one a user experiences as "my work vanished": the
 * editor autosaves the composition on every edit and, on reopening, showed an
 * empty timeline because nothing ever put the saved document back. So the
 * assertions here are about the promises a restore has to keep, not about the
 * mechanics — everything comes back, undo can't walk behind it, and the
 * transport starts from the beginning of what was restored.
 */

/** A project with something in every field a restore has to carry. */
function buildProject(): { engine: TimelineEngine; project: Project } {
  const engine = new TimelineEngine({
    fps: 30,
    stage: { width: 1920, height: 1080 },
    initialTracks: [
      { kind: 'video', name: 'Video' },
      { kind: 'audio', name: 'Audio' },
      { kind: 'elements', name: 'Text', protected: true },
    ],
  })

  const [video, audio, elements] = engine.getProject().tracks

  const a = engine.addClip({
    trackId: video.id,
    type: 'video',
    startFrame: 0,
    durationFrames: 60,
    src: 'https://cdn.example/a.mp4',
    assetId: 'asset-a',
    name: 'Opening shot',
  })
  const b = engine.addClip({
    trackId: video.id,
    type: 'video',
    startFrame: 60,
    durationFrames: 60,
    src: 'https://cdn.example/b.mp4',
    assetId: 'asset-b',
    name: 'Closing shot',
  })
  engine.addClip({
    trackId: audio.id,
    type: 'audio',
    startFrame: 0,
    durationFrames: 120,
    src: 'https://cdn.example/score.mp3',
    name: 'Score',
  })
  engine.addClip({
    trackId: elements.id,
    type: 'text',
    startFrame: 10,
    durationFrames: 40,
    name: 'Title',
    text: { content: 'Hello', fontSize: 72, color: '#fff' },
  })
  engine.addTransition({
    fromClipId: a.id,
    toClipId: b.id,
    trackId: video.id,
    kind: 'fade',
    durationFrames: 12,
  })
  engine.setMasterVolume(0.8)
  engine.updateTrack(audio.id, { muted: true, volume: 0.5 })

  return { engine, project: engine.getProject() }
}

/** What the server does to a document: JSON out, JSON back. */
function throughTheWire(project: Project): unknown {
  return JSON.parse(JSON.stringify(project))
}

describe('loadProject — round trip', () => {
  it('brings back exactly what getProject wrote, through JSON', () => {
    const { project: saved } = buildProject()

    const reopened = new TimelineEngine({ fps: 30 })
    reopened.loadProject(readProjectDocument(throughTheWire(saved)))

    expect(reopened.getProject()).toEqual(saved)
  })

  it('replaces an unrelated composition wholesale, leaving nothing of it behind', () => {
    const { project: saved } = buildProject()

    // The empty default the editor mounts with before the document arrives —
    // the state the user was seeing instead of their work.
    const reopened = new TimelineEngine({ fps: 24, initialTracks: [{ kind: 'video' }] })
    reopened.addClip({
      trackId: reopened.getProject().tracks[0].id,
      type: 'text',
      startFrame: 0,
      durationFrames: 30,
      text: { content: 'scratch' },
    })

    reopened.loadProject(readProjectDocument(throughTheWire(saved)))

    const after = reopened.getProject()
    expect(after.fps).toBe(30)
    expect(after.stage).toEqual({ width: 1920, height: 1080 })
    expect(after.masterVolume).toBe(0.8)
    expect(after.transitions).toHaveLength(1)
    expect(after.tracks.map((t) => t.id)).toEqual(saved.tracks.map((t) => t.id))
    // No clip bucket keyed by a track that is gone: `getTotalFrames` walks every
    // bucket, so a leftover one stretches the timeline to a length with nothing
    // in it.
    expect(Object.keys(after.clips).sort()).toEqual(saved.tracks.map((t) => t.id).sort())
  })

  it('survives a save → restore → save round trip unchanged', () => {
    const { project: saved } = buildProject()

    const first = new TimelineEngine({ fps: 30 })
    first.loadProject(readProjectDocument(throughTheWire(saved)))

    const second = new TimelineEngine({ fps: 30 })
    second.loadProject(readProjectDocument(throughTheWire(first.getProject())))

    expect(second.getProject()).toEqual(first.getProject())
  })

  it('keeps editing after a restore — the restored ids are live, not a snapshot', () => {
    const { project: saved } = buildProject()
    const engine = new TimelineEngine({ fps: 30 })
    engine.loadProject(readProjectDocument(throughTheWire(saved)))

    const trackId = saved.tracks[0].id
    engine.removeClip(saved.clips[trackId][0].id, trackId)

    expect(engine.getProject().clips[trackId]).toHaveLength(1)
    // The transition that joined the two clips goes with it, the same way it
    // would have before the save.
    expect(engine.getProject().transitions).toHaveLength(0)
  })
})

describe('loadProject — history', () => {
  it('makes the restored composition the new baseline, not a step in the timeline', () => {
    const { project: saved } = buildProject()

    const reopened = new TimelineEngine({ fps: 30, initialTracks: [{ kind: 'video' }] })
    reopened.addClip({
      trackId: reopened.getProject().tracks[0].id,
      type: 'text',
      startFrame: 0,
      durationFrames: 30,
      text: { content: 'scratch' },
    })
    expect(reopened.canUndo()).toBe(true)

    reopened.loadProject(readProjectDocument(throughTheWire(saved)))

    // The whole point: ctrl+Z after opening a project must not walk back into
    // the empty timeline that existed for a moment before it loaded.
    expect(reopened.canUndo()).toBe(false)
    expect(reopened.canRedo()).toBe(false)
    expect(reopened.undo()).toBe(false)
    expect(reopened.getProject()).toEqual(saved)
  })

  it('undoes back to the restored state, never past it', () => {
    const { project: saved } = buildProject()
    const engine = new TimelineEngine({ fps: 30 })
    engine.loadProject(readProjectDocument(throughTheWire(saved)))
    const restored = engine.getProject()

    engine.addClip({
      trackId: saved.tracks[0].id,
      type: 'text',
      startFrame: 200,
      durationFrames: 30,
      text: { content: 'later' },
    })
    expect(engine.canUndo()).toBe(true)

    engine.undo()
    expect(engine.getProject()).toEqual(restored)
    expect(engine.undo()).toBe(false)
  })

  it('abandons an open batch rather than folding the restore into it', () => {
    const { project: saved } = buildProject()
    const engine = new TimelineEngine({ fps: 30, initialTracks: [{ kind: 'video' }] })
    const trackId = engine.getProject().tracks[0].id

    // A restore that lands mid-transaction describes edits to a composition
    // that no longer exists; leaving the batch open would push them onto the
    // restored project when it closed.
    engine.batch(() => {
      engine.addClip({
        trackId,
        type: 'text',
        startFrame: 0,
        durationFrames: 30,
        text: { content: 'scratch' },
      })
      engine.loadProject(readProjectDocument(throughTheWire(saved)))
    })

    expect(engine.getProject()).toEqual(saved)
    expect(engine.canUndo()).toBe(false)
  })
})

/**
 * The media re-link is the one caller that is *not* opening a document. It
 * lands whenever the project's own assets finish importing — after a network
 * round trip and a metadata probe per asset — and hands back the composition
 * already on screen with its library references repaired. By then the user has
 * had minutes to work, so the rules that protect an open (drop history, abandon
 * the drag) would be pure loss here.
 */
describe("loadProject — history: 'keep' (the media re-link)", () => {
  /** What `relinkProjectMedia` returns: the same composition, new asset ids. */
  function withRelinkedAssets(project: Project): Project {
    const clips: Project['clips'] = {}
    for (const [trackId, bucket] of Object.entries(project.clips)) {
      clips[trackId] = bucket.map((clip) =>
        clip.assetId === undefined ? clip : { ...clip, assetId: `relinked-${clip.assetId}` },
      )
    }
    return { ...project, clips }
  }

  it('leaves the undo stack alone — the edits since the open are the user’s', () => {
    const { engine, project: saved } = buildProject()
    const trackId = saved.tracks[0].id

    // Everything the user did while the assets were still loading.
    engine.addClip({
      trackId,
      type: 'text',
      startFrame: 200,
      durationFrames: 30,
      text: { content: 'while waiting' },
    })
    const beforeRelink = engine.getProject()
    expect(engine.canUndo()).toBe(true)

    engine.loadProject(withRelinkedAssets(beforeRelink), {
      transport: 'keep',
      history: 'keep',
    })

    // Ctrl+Z still walks back through the user's own work, and the repair rode
    // along rather than replacing it.
    expect(engine.canUndo()).toBe(true)
    expect(engine.getProject().clips[trackId][0].assetId).toBe('relinked-asset-a')
    expect(engine.undo()).toBe(true)
    expect(engine.getProject().clips[trackId]).toHaveLength(2)
  })

  it('does not silently swallow a drag that is still in progress', () => {
    const { engine, project: saved } = buildProject()
    const trackId = saved.tracks[0].id
    const clipId = saved.clips[trackId][1].id
    const startedAt = saved.clips[trackId][1].startFrame

    // A drag under the user's finger when the assets land.
    engine.previewClip(clipId, trackId, { startFrame: startedAt + 30 })

    engine.loadProject(withRelinkedAssets(engine.getProject()), {
      transport: 'keep',
      history: 'keep',
    })

    // The gesture ends normally: one history entry, and undo puts the clip back
    // where it started. With the interaction snapshot dropped this call is a
    // silent no-op and the drag is unundoable.
    engine.commitInteraction()
    expect(engine.canUndo()).toBe(true)
    engine.undo()
    expect(engine.getProject().clips[trackId][1].startFrame).toBe(startedAt)
  })

  it('still resets history by default — an open is not a repair', () => {
    const { engine, project: saved } = buildProject()

    engine.loadProject(withRelinkedAssets(saved), { transport: 'keep' })

    expect(engine.canUndo()).toBe(false)
  })
})

describe('loadProject — events', () => {
  it('syncs subscribers before announcing the load, so a listener reads the new project', () => {
    const { project: saved } = buildProject()
    const engine = new TimelineEngine({ fps: 30 })
    const order: string[] = []
    engine.on('change', () => order.push('change'))
    engine.on('history:change', () => order.push('history'))
    engine.on('project:loaded', () => order.push('loaded'))

    engine.loadProject(readProjectDocument(throughTheWire(saved)))

    expect(order).toEqual(['change', 'history', 'loaded'])
  })

  it('emits one change per restore — a restore is not a stream of edits', () => {
    const { project: saved } = buildProject()
    const engine = new TimelineEngine({ fps: 30 })
    const onChange = vi.fn()
    engine.on('change', onChange)

    engine.loadProject(readProjectDocument(throughTheWire(saved)))

    expect(onChange).toHaveBeenCalledTimes(1)
    // The payload is the engine's own snapshot, so a subscriber comparing it by
    // identity (the editor's autosave does) can tell a restore from an edit.
    expect(onChange).toHaveBeenCalledWith(engine.getProject())
  })

  it('asks the transport to rewind — the frame belonged to the old composition', () => {
    const { project: saved } = buildProject()
    const engine = new TimelineEngine({ fps: 30 })
    const seen: ProjectLoadedEvent[] = []
    engine.on('project:loaded', (e) => seen.push(e))

    engine.loadProject(readProjectDocument(throughTheWire(saved)))

    expect(seen).toHaveLength(1)
    expect(seen[0].transport).toBe('rewind')
    expect(seen[0].project).toBe(engine.getProject())
  })

  it("leaves the playhead alone for a repair pass over what's already on screen", () => {
    const { engine, project } = buildProject()
    const seen: ProjectLoadedEvent[] = []
    engine.on('project:loaded', (e) => seen.push(e))

    engine.loadProject(project, { transport: 'keep' })

    expect(seen[0].transport).toBe('keep')
  })
})

/**
 * `TimelineEngine` has no reference to `PlaybackEngine` on purpose — it is
 * Node-safe and RAF-free. `EditorProvider` joins them by listening for
 * `'project:loaded'`; this reproduces that wire so the behaviour a user
 * actually gets (open a project, it is stopped at the start) is pinned
 * somewhere, rather than only the event that implies it.
 */
function wireTransport(engine: TimelineEngine, playback: PlaybackEngine): void {
  engine.on('project:loaded', ({ transport }) => {
    if (transport !== 'rewind') return
    playback.pause()
    playback.seek(0)
  })
}

describe('restore → transport', () => {
  it('opens a project stopped at frame 0, whatever the transport was doing', () => {
    const { project: saved } = buildProject()
    const engine = new TimelineEngine({ fps: 30 })
    const playback = new PlaybackEngine({ fps: 30, getTotalFrames: () => 600 })
    wireTransport(engine, playback)

    playback.seek(420)
    expect(playback.currentFrame).toBe(420)

    engine.loadProject(readProjectDocument(throughTheWire(saved)))

    expect(playback.isPlaying).toBe(false)
    expect(playback.currentFrame).toBe(0)

    playback.destroy()
  })

  it('does not yank the playhead back for a repair pass', () => {
    const { engine, project } = buildProject()
    const playback = new PlaybackEngine({ fps: 30, getTotalFrames: () => 600 })
    wireTransport(engine, playback)

    playback.seek(90)
    engine.loadProject(project, { transport: 'keep' })

    expect(playback.currentFrame).toBe(90)

    playback.destroy()
  })
})
