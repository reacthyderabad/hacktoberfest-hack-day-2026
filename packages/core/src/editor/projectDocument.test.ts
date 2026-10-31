import { describe, it, expect } from 'vitest'
import {
  PROJECT_VERSION,
  ProjectDocumentError,
  isReadableProjectDocument,
  isRecoverableMediaSrc,
  missingMediaSummary,
  readProjectDocument,
  relinkProjectMedia,
} from './projectDocument'
import type { Project } from '../types'

/**
 * The parser between a stored blob and the engine.
 *
 * Everything here is about one asymmetry: a document that is wrongly *refused*
 * costs the user a dialog and a reload, while a document that is wrongly
 * *accepted* opens an editor that looks empty and autosaves that emptiness over
 * their work. So the tests are written from both sides — what must be repaired
 * and opened, and what must be refused loudly.
 */

const stored = {
  id: 'p1',
  fps: 30,
  stage: { width: 1920, height: 1080 },
  version: 1,
  masterVolume: 0.8,
  tracks: [
    {
      id: 't-video',
      name: 'Video',
      kind: 'video',
      order: 0,
      height: 36,
      locked: false,
      disabled: false,
      muted: false,
      solo: false,
      volume: 1,
      protected: false,
    },
  ],
  clips: {
    't-video': [
      {
        id: 'c1',
        trackId: 't-video',
        type: 'video',
        name: 'Opening shot',
        startFrame: 0,
        durationFrames: 60,
        sourceStartFrame: 0,
        sourceDurationFrames: 60,
        src: 'https://cdn.example/a.mp4',
        assetId: 'gone-with-the-last-session',
      },
    ],
  },
  transitions: [],
}

const doc = (patch: Record<string, unknown> = {}) => ({ ...stored, ...patch })

describe('readProjectDocument — what it opens', () => {
  it('reads back a document written by this build', () => {
    const project = readProjectDocument(doc())
    expect(project.id).toBe('p1')
    expect(project.fps).toBe(30)
    expect(project.stage).toEqual({ width: 1920, height: 1080 })
    expect(project.masterVolume).toBe(0.8)
    expect(project.clips['t-video']).toHaveLength(1)
    expect(project.clips['t-video'][0].src).toBe('https://cdn.example/a.mp4')
  })

  it('fills in the fields a document predating them never had', () => {
    const { stage, transitions, masterVolume, ...older } = stored
    void stage
    void transitions
    void masterVolume
    const project = readProjectDocument(older)

    // Defaults, not a refusal: an older project opens, which is the point.
    expect(project.stage).toEqual({ width: 1080, height: 1920 })
    expect(project.transitions).toEqual([])
    expect(project.masterVolume).toBeUndefined()
  })

  it('gives every track a clip bucket, so `clips[track.id]` is never undefined', () => {
    const project = readProjectDocument(
      doc({
        tracks: [...stored.tracks, { id: 't-audio', kind: 'audio' }],
      }),
    )
    expect(project.clips['t-audio']).toEqual([])
  })

  it('drops a clip bucket whose track is gone rather than carrying dead length', () => {
    // `getTotalFrames` walks every bucket, so a bucket with no track stretches
    // the timeline to a duration with nothing visible in it.
    const project = readProjectDocument(
      doc({
        clips: { ...stored.clips, 't-deleted': [{ ...stored.clips['t-video'][0], id: 'x', startFrame: 9000 }] },
      }),
    )
    expect(Object.keys(project.clips)).toEqual(['t-video'])
  })

  it('files a clip under the bucket it was stored in, not the trackId it claims', () => {
    // A clip whose own `trackId` disagrees with its bucket is invisible to every
    // lookup that goes clip → track. The bucket is the one the timeline renders.
    const project = readProjectDocument(
      doc({ clips: { 't-video': [{ ...stored.clips['t-video'][0], trackId: 'nonsense' }] } }),
    )
    expect(project.clips['t-video'][0].trackId).toBe('t-video')
  })

  it('sorts each track by timeline position, whatever order it was stored in', () => {
    const first = stored.clips['t-video'][0]
    const project = readProjectDocument(
      doc({
        clips: {
          't-video': [
            { ...first, id: 'late', startFrame: 300 },
            { ...first, id: 'early', startFrame: 0 },
          ],
        },
      }),
    )
    expect(project.clips['t-video'].map((c) => c.id)).toEqual(['early', 'late'])
  })

  it('keeps track defaults identical to a freshly created track, so a round trip is an identity', () => {
    const project = readProjectDocument(
      doc({ tracks: [{ id: 't-video', kind: 'video', name: 'Video' }] }),
    )
    const track = project.tracks[0]
    expect(track.volume).toBe(1)
    expect(track.protected).toBe(false)
    expect(track.locked).toBe(false)
    expect(track.height).toBe(64)
    expect(track.pinned).toBeUndefined()
  })

  it('keeps a pinned-bottom lane pinned across a reload', () => {
    const project = readProjectDocument(
      doc({
        tracks: [
          { id: 't-video', kind: 'video', name: 'Video' },
          { id: 't-audio', kind: 'audio', name: 'Audio', pinned: 'bottom' },
        ],
      }),
    )
    expect(project.tracks.find((t) => t.id === 't-audio')!.pinned).toBe('bottom')
  })

  it('reads an unrecognised pin as unpinned rather than ordering tracks around it', () => {
    const project = readProjectDocument(
      doc({ tracks: [{ id: 't-video', kind: 'video', name: 'Video', pinned: 'top' }] }),
    )
    expect(project.tracks[0].pinned).toBeUndefined()
  })

  it('drops a transition whose clips are gone instead of refusing the whole video', () => {
    const project = readProjectDocument(
      doc({
        transitions: [
          { id: 'x', kind: 'fade', fromClipId: 'c1', toClipId: 'deleted', trackId: 't-video', startFrame: 0, durationFrames: 12 },
        ],
      }),
    )
    // Nothing of the user's is lost — the clips it joined are already not there.
    expect(project.transitions).toEqual([])
  })

  it('drops a transition this build has no renderer for, and keeps the clips', () => {
    const project = readProjectDocument(
      doc({
        transitions: [
          { id: 'x', kind: 'kaleidoscope', fromClipId: 'c1', toClipId: 'c1', trackId: 't-video', startFrame: 0, durationFrames: 12 },
        ],
      }),
    )
    expect(project.transitions).toEqual([])
    expect(project.clips['t-video']).toHaveLength(1)
  })
})

describe('readProjectDocument — what it refuses', () => {
  const refuses = (document: unknown) => {
    expect(() => readProjectDocument(document)).toThrow(ProjectDocumentError)
    expect(isReadableProjectDocument(document)).toBe(false)
  }

  it('refuses anything that is not an object', () => {
    refuses('{}')
    refuses([])
    refuses(42)
    refuses(null)
  })

  it('refuses a document with no frame rate — every position in it is unreadable', () => {
    refuses(doc({ fps: undefined }))
    refuses(doc({ fps: 0 }))
    refuses(doc({ fps: -30 }))
    refuses(doc({ fps: Number.NaN }))
    refuses(doc({ fps: '30' }))
  })

  it('refuses clips stored as a list — it is indexed by track id', () => {
    // An array satisfies `typeof === 'object'` and then reads as `undefined`
    // for every track: an empty editor, and no error anywhere.
    refuses(doc({ clips: [] }))
    refuses(doc({ tracks: undefined }))
  })

  it('refuses a clip with no position or no length', () => {
    refuses(doc({ clips: { 't-video': [{ ...stored.clips['t-video'][0], startFrame: undefined }] } }))
    refuses(doc({ clips: { 't-video': [{ ...stored.clips['t-video'][0], durationFrames: 0 }] } }))
  })

  it('refuses a clip type it cannot render, rather than showing a gap', () => {
    refuses(doc({ clips: { 't-video': [{ ...stored.clips['t-video'][0], type: 'hologram' }] } }))
  })

  it('refuses two tracks with the same id — one of them would be unreachable', () => {
    refuses(doc({ tracks: [stored.tracks[0], { ...stored.tracks[0], name: 'Copy' }] }))
  })

  it('names the reason, so the editor can say something true about it', () => {
    try {
      readProjectDocument(doc({ tracks: undefined }))
      expect.unreachable()
    } catch (err) {
      expect(err).toBeInstanceOf(ProjectDocumentError)
      expect((err as ProjectDocumentError).code).toBe('unreadable')
    }
  })
})

describe('readProjectDocument — version guard', () => {
  it('accepts a document with no version stamp as the first one', () => {
    // The field's absence is what "written before the stamp existed" looks
    // like; refusing it would strand the earliest saved projects.
    const project = readProjectDocument(doc({ version: undefined }))
    expect(project.version).toBe(PROJECT_VERSION)
  })

  it('accepts and stamps the current version', () => {
    expect(readProjectDocument(doc({ version: PROJECT_VERSION })).version).toBe(PROJECT_VERSION)
  })

  it('refuses a document from a newer build, and says which one', () => {
    // The fields this build doesn't know about are exactly the ones the next
    // autosave would silently drop, so opening it is the destructive option.
    try {
      readProjectDocument(doc({ version: PROJECT_VERSION + 1 }))
      expect.unreachable()
    } catch (err) {
      expect(err).toBeInstanceOf(ProjectDocumentError)
      expect((err as ProjectDocumentError).code).toBe('unsupported-version')
      expect((err as ProjectDocumentError).documentVersion).toBe(PROJECT_VERSION + 1)
    }
  })

  it('separates a newer document from a broken one — they are different sentences', () => {
    const newer = (() => {
      try {
        readProjectDocument(doc({ version: 99 }))
      } catch (err) {
        return (err as ProjectDocumentError).code
      }
    })()
    const broken = (() => {
      try {
        readProjectDocument(doc({ tracks: 'nope' }))
      } catch (err) {
        return (err as ProjectDocumentError).code
      }
    })()
    expect(newer).toBe('unsupported-version')
    expect(broken).toBe('unreadable')
  })

  it('refuses a version stamp that is not a whole number at all', () => {
    expect(() => readProjectDocument(doc({ version: 'one' }))).toThrow(ProjectDocumentError)
    expect(() => readProjectDocument(doc({ version: 1.5 }))).toThrow(ProjectDocumentError)
    expect(() => readProjectDocument(doc({ version: 0 }))).toThrow(ProjectDocumentError)
  })
})

// ---------------------------------------------------------------------------

describe('isRecoverableMediaSrc', () => {
  it('accepts a URL that will still resolve tomorrow', () => {
    expect(isRecoverableMediaSrc('https://cdn.example/a.mp4')).toBe(true)
    expect(isRecoverableMediaSrc('/api/assets/a.mp4')).toBe(true)
  })

  it('rejects the URLs that die with the session that made them', () => {
    // `URL.createObjectURL` output, baked into a clip when a user drags a file
    // in from their device. It comes back tomorrow pointing at nothing.
    expect(isRecoverableMediaSrc('blob:https://app.example/9f2c')).toBe(false)
    expect(isRecoverableMediaSrc('data:video/mp4;base64,AAAA')).toBe(false)
    expect(isRecoverableMediaSrc(undefined)).toBe(false)
    expect(isRecoverableMediaSrc('')).toBe(false)
  })
})

describe('relinkProjectMedia', () => {
  const project = () => readProjectDocument(doc()) as Project

  it('points a restored clip back at the library asset with the same source', () => {
    // The library is rebuilt on every page load with fresh ids, so the stored
    // `assetId` names nothing. Without this the clip still plays and still has
    // no filmstrip.
    const result = relinkProjectMedia(project(), [
      { id: 'fresh-id', src: 'https://cdn.example/a.mp4' },
    ])
    expect(result.relinked).toBe(1)
    expect(result.project.clips['t-video'][0].assetId).toBe('fresh-id')
    expect(result.missing).toEqual([])
  })

  it('changes nothing else about the clip', () => {
    const before = project()
    const after = relinkProjectMedia(before, [{ id: 'fresh-id', src: 'https://cdn.example/a.mp4' }])
    expect(after.project.clips['t-video'][0]).toEqual({
      ...before.clips['t-video'][0],
      assetId: 'fresh-id',
    })
  })

  it('returns the same object when nothing needed repairing', () => {
    // Identity is the signal the editor uses to skip a second `loadProject`
    // and a pointless autosave.
    const before = project()
    expect(relinkProjectMedia(before, []).project).toBe(before)
  })

  it('leaves a clip already pointing at a live asset alone', () => {
    const before = project()
    const result = relinkProjectMedia(before, [
      { id: 'gone-with-the-last-session', src: 'https://cdn.example/somewhere-else.mp4' },
    ])
    expect(result.relinked).toBe(0)
    expect(result.project).toBe(before)
  })

  it('keeps a clip whose file cannot come back, and names it', () => {
    // Dropping it would be the one outcome the user can neither see nor undo:
    // the clip is still their work, with a name, a place and a length.
    const orphan = readProjectDocument(
      doc({
        clips: {
          't-video': [
            { ...stored.clips['t-video'][0], src: 'blob:https://app.example/9f2c', name: 'Beach.mp4' },
          ],
        },
      }),
    )
    const result = relinkProjectMedia(orphan, [{ id: 'x', src: 'https://cdn.example/a.mp4' }])

    expect(result.project.clips['t-video']).toHaveLength(1)
    expect(result.project.clips['t-video'][0].name).toBe('Beach.mp4')
    expect(result.missing).toEqual([{ clipId: 'c1', clipName: 'Beach.mp4', kind: 'video' }])
  })

  it('ignores clips that never had a source file', () => {
    const withText = readProjectDocument(
      doc({
        tracks: [...stored.tracks, { id: 't-text', kind: 'elements' }],
        clips: {
          ...stored.clips,
          't-text': [
            { id: 'c2', type: 'text', name: 'Title', startFrame: 0, durationFrames: 30, content: 'Hi' },
          ],
        },
      }),
    )
    const result = relinkProjectMedia(withText, [])
    expect(result.missing).toEqual([])
  })
})

describe('missingMediaSummary', () => {
  const missing = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      clipId: `c${i}`,
      clipName: `Clip ${i + 1}`,
      kind: 'video' as const,
    }))

  it('says nothing when nothing is missing', () => {
    expect(missingMediaSummary([])).toBeNull()
  })

  it('names one or two outright', () => {
    expect(missingMediaSummary(missing(1))).toBe('Clip 1')
    expect(missingMediaSummary(missing(2))).toBe('Clip 1 and Clip 2')
  })

  it('stays readable on a project where a lot went missing', () => {
    expect(missingMediaSummary(missing(3))).toBe('Clip 1, Clip 2 and 1 more')
    expect(missingMediaSummary(missing(30))).toBe('Clip 1, Clip 2 and 28 more')
  })
})
