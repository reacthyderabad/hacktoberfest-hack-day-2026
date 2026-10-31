import { describe, expect, it } from 'vitest'
import { TimelineEngine } from '../editor/TimelineEngine'
import { ProjectDocumentError } from '../editor/projectDocument'
import { deserializeProject, serializeProject } from './serialization'

function buildNonTrivialEngine(): TimelineEngine {
  const engine = new TimelineEngine({
    fps: 30,
    stage: { width: 1080, height: 1920 },
    initialTracks: [{ kind: 'video', name: 'Video 1' }],
  })

  const videoTrack = engine.getProject().tracks[0]
  const textTrack = engine.addTrack('elements', { name: 'Text 1' })

  const clipA = engine.addClip({
    trackId: videoTrack.id,
    type: 'video',
    src: 'blob:clip-a',
    startFrame: 0,
    durationFrames: 90,
  })
  const clipB = engine.addClip({
    trackId: videoTrack.id,
    type: 'video',
    src: 'blob:clip-b',
    startFrame: 90,
    durationFrames: 60,
  })
  engine.addClip({
    trackId: textTrack.id,
    type: 'text',
    startFrame: 10,
    durationFrames: 45,
    text: { content: 'Hello world', fontSize: 48, color: '#ff0000' },
  })
  engine.addTransition({
    fromClipId: clipA.id,
    toClipId: clipB.id,
    trackId: videoTrack.id,
    kind: 'fade',
    durationFrames: 12,
  })
  engine.setStage(1920, 1080)
  engine.setMasterVolume(0.5)
  return engine
}

describe('serializeProject / deserializeProject', () => {
  it('round-trips a non-trivial project into a fresh engine', () => {
    const original = buildNonTrivialEngine()
    const json = serializeProject(original)

    const fresh = new TimelineEngine({ fps: 30 })
    deserializeProject(fresh, json)

    expect(fresh.getProject()).toEqual(original.getProject())
    expect(serializeProject(fresh)).toEqual(json)
  })

  it('throws with a "Not valid project JSON:" prefix on malformed JSON and leaves the engine untouched', () => {
    const engine = buildNonTrivialEngine()
    const before = engine.getProject()

    expect(() => deserializeProject(engine, '{nope')).toThrowError(/^Not valid project JSON:/)
    expect(engine.getProject()).toEqual(before)
  })

  it('throws the document error for a version far in the future', () => {
    const engine = buildNonTrivialEngine()
    const before = engine.getProject()
    const json = JSON.stringify({ ...before, version: 999 })

    let caught: unknown
    try {
      deserializeProject(engine, json)
    } catch (err) {
      caught = err
    }
    expect(caught).toBeInstanceOf(ProjectDocumentError)
    expect((caught as ProjectDocumentError).code).toBe('unsupported-version')
    expect(engine.getProject()).toEqual(before)
  })

  it('loads a document with no version field (saved by an older build)', () => {
    const original = buildNonTrivialEngine()
    const { version, ...withoutVersion } = original.getProject() as unknown as Record<string, unknown>
    void version

    const fresh = new TimelineEngine({ fps: 30 })
    deserializeProject(fresh, JSON.stringify(withoutVersion))

    const loaded = fresh.getProject()
    expect(loaded.version).toBe(1)
    expect(loaded.tracks).toHaveLength(original.getProject().tracks.length)
    expect(loaded.clips).toEqual(original.getProject().clips)
  })

  it('rejects a document that is not an object', () => {
    const engine = new TimelineEngine({ fps: 30 })
    expect(() => deserializeProject(engine, 'null')).toThrow(ProjectDocumentError)
    expect(() => deserializeProject(engine, '[]')).toThrow(ProjectDocumentError)
  })
})
