import { describe, expect, it, vi } from 'vitest'

/**
 * `@elah/editor` resolves to a built bundle full of React components,
 * which a node-environment run cannot import. The only thing this module needs
 * from it is `projectDocument` — pure, dependency-free, and reachable at its
 * source. Mocking to the *real* implementation keeps the round trip honest:
 * these tests parse with the same code the editor does.
 */
vi.mock('@elah/editor', async () => {
  return await import('../../../packages/core/src/editor/projectDocument')
})

const { LOCAL_PROJECT_BACKUP_KEY, LOCAL_PROJECT_KEY, backupUnreadableLocalProject, readLocalProject, writeLocalProject } =
  await import('./local-project')

const TRACK_HEIGHT = 36
const OPTIONS = { defaultTrackHeight: TRACK_HEIGHT }

/** A `Storage`-shaped `Map`, plus hooks to make either half fail. */
function fakeStore(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial))
  return {
    map,
    failWrites: false,
    failReads: false,
    getItem(key: string) {
      if (this.failReads) throw new Error('read blocked')
      return map.get(key) ?? null
    },
    setItem(key: string, value: string) {
      if (this.failWrites) throw new DOMException('quota', 'QuotaExceededError')
      map.set(key, value)
    },
    removeItem(key: string) {
      map.delete(key)
    },
  }
}

function project(overrides: Record<string, unknown> = {}) {
  return {
    id: 'local',
    fps: 30,
    stage: { width: 1080, height: 1920 },
    tracks: [{ id: 't1', name: 'Video', kind: 'video', order: 0, height: TRACK_HEIGHT }],
    clips: {
      t1: [
        {
          id: 'c1',
          trackId: 't1',
          type: 'text',
          name: 'Title',
          startFrame: 12,
          durationFrames: 60,
          sourceStartFrame: 0,
          sourceDurationFrames: 60,
          content: 'Hello',
        },
      ],
    },
    transitions: [],
    version: 1,
    ...overrides,
  }
}

describe('readLocalProject', () => {
  it('restores a composition written by writeLocalProject', () => {
    const store = fakeStore()
    expect(writeLocalProject(store, project() as never)).toBe(true)

    const restore = readLocalProject(store, OPTIONS)

    expect(restore.kind).toBe('ready')
    if (restore.kind !== 'ready') return
    expect(restore.project.fps).toBe(30)
    expect(restore.project.tracks.map((t) => t.id)).toEqual(['t1'])
    expect(restore.project.clips.t1).toHaveLength(1)
    expect(restore.project.clips.t1[0]).toMatchObject({
      id: 'c1',
      startFrame: 12,
      durationFrames: 60,
      content: 'Hello',
    })
  })

  it('reads nothing as empty rather than as a failure', () => {
    expect(readLocalProject(fakeStore(), OPTIONS)).toEqual({ kind: 'empty' })
  })

  it('treats a storage that throws on read as empty', () => {
    const store = fakeStore({ [LOCAL_PROJECT_KEY]: JSON.stringify(project()) })
    store.failReads = true
    expect(readLocalProject(store, OPTIONS)).toEqual({ kind: 'empty' })
  })

  it('refuses invalid JSON without touching what is stored', () => {
    const store = fakeStore({ [LOCAL_PROJECT_KEY]: '{"tracks":[' })

    expect(readLocalProject(store, OPTIONS)).toEqual({ kind: 'refused', reason: 'unreadable' })
    // The blob is the user's only copy until it is backed up — reading must
    // never be what destroys it.
    expect(store.map.get(LOCAL_PROJECT_KEY)).toBe('{"tracks":[')
  })

  it('refuses a document shaped like something else', () => {
    const store = fakeStore({ [LOCAL_PROJECT_KEY]: JSON.stringify({ hello: 'world' }) })
    expect(readLocalProject(store, OPTIONS)).toEqual({ kind: 'refused', reason: 'unreadable' })
  })

  it('refuses a document written by a newer build, and says so distinctly', () => {
    const store = fakeStore({
      [LOCAL_PROJECT_KEY]: JSON.stringify(project({ version: 999 })),
    })
    expect(readLocalProject(store, OPTIONS)).toEqual({
      kind: 'refused',
      reason: 'unsupported-version',
    })
  })

  it('gives a track with no stored height the editor’s own lane height', () => {
    const store = fakeStore({
      [LOCAL_PROJECT_KEY]: JSON.stringify(
        project({ tracks: [{ id: 't1', name: 'Video', kind: 'video', order: 0 }] }),
      ),
    })

    const restore = readLocalProject(store, OPTIONS)

    expect(restore.kind).toBe('ready')
    if (restore.kind !== 'ready') return
    expect(restore.project.tracks[0].height).toBe(TRACK_HEIGHT)
  })

  it('keeps a clip whose blob: media cannot come back', () => {
    const store = fakeStore({
      [LOCAL_PROJECT_KEY]: JSON.stringify(
        project({
          clips: {
            t1: [
              {
                id: 'c1',
                trackId: 't1',
                type: 'video',
                name: 'clip.mp4',
                startFrame: 0,
                durationFrames: 90,
                sourceStartFrame: 0,
                sourceDurationFrames: 90,
                src: 'blob:http://localhost/dead',
              },
            ],
          },
        }),
      ),
    })

    const restore = readLocalProject(store, OPTIONS)

    expect(restore.kind).toBe('ready')
    if (restore.kind !== 'ready') return
    // Position, length and name survive; only the pixels are gone, and
    // `ProjectMediaNotice` is what says so.
    expect(restore.project.clips.t1[0]).toMatchObject({
      id: 'c1',
      name: 'clip.mp4',
      startFrame: 0,
      durationFrames: 90,
    })
  })
})

describe('writeLocalProject', () => {
  it('reports a quota failure instead of throwing', () => {
    const store = fakeStore()
    store.failWrites = true
    expect(() => writeLocalProject(store, project() as never)).not.toThrow()
    expect(writeLocalProject(store, project() as never)).toBe(false)
  })
})

describe('backupUnreadableLocalProject', () => {
  it('copies the raw blob aside and leaves the original in place', () => {
    const store = fakeStore({ [LOCAL_PROJECT_KEY]: 'not json{' })

    backupUnreadableLocalProject(store)

    expect(store.map.get(LOCAL_PROJECT_BACKUP_KEY)).toBe('not json{')
    expect(store.map.get(LOCAL_PROJECT_KEY)).toBe('not json{')
  })

  it('does nothing when there is nothing stored', () => {
    const store = fakeStore()
    backupUnreadableLocalProject(store)
    expect(store.map.has(LOCAL_PROJECT_BACKUP_KEY)).toBe(false)
  })

  it('survives a storage that refuses the copy', () => {
    const store = fakeStore({ [LOCAL_PROJECT_KEY]: 'not json{' })
    store.failWrites = true
    expect(() => backupUnreadableLocalProject(store)).not.toThrow()
  })
})

describe('with createAutosave', () => {
  it('debounces edits into one write, and writes nothing for the restored baseline', async () => {
    const { createAutosave } = await import('./project-autosave')
    const store = fakeStore()
    let pending: (() => void) | null = null

    const baseline = project() as never
    const autosave = createAutosave<never>({
      version: 0,
      baseline,
      save: (document) => {
        writeLocalProject(store, document)
        return Promise.resolve({ documentVersion: 0 })
      },
      onStatus: () => {},
      scheduler: {
        set: (fn) => {
          pending = fn
          return 1
        },
        clear: () => {
          pending = null
        },
      },
    })

    // The change `loadProject` emits is not an edit.
    autosave.schedule(baseline)
    expect(pending).toBeNull()
    expect(store.map.size).toBe(0)

    const edited = project({ id: 'edited' }) as never
    autosave.schedule(edited)
    expect(pending).not.toBeNull()
    await autosave.flush()

    expect(JSON.parse(store.map.get(LOCAL_PROJECT_KEY) as string).id).toBe('edited')
  })
})
