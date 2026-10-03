import { describe, expect, it, vi } from 'vitest'
import type { AutosaveScheduler, AutosaveStatus } from './project-autosave'
import {
  AUTOSAVE_DEBOUNCE_MS,
  AutosaveConflictError,
  createAutosave,
  isVersionConflict,
} from './project-autosave'

/** A scheduler whose only clock is `fire()`. Nothing here waits on real time. */
function manualScheduler() {
  let next = 1
  const timers = new Map<number, { fn: () => void; ms: number }>()
  const scheduler: AutosaveScheduler = {
    set(fn, ms) {
      const handle = next++
      timers.set(handle, { fn, ms })
      return handle
    },
    clear(handle) {
      timers.delete(handle as number)
    },
  }
  return {
    scheduler,
    get pending() {
      return timers.size
    },
    /** Runs every armed timer, newest last. */
    fire() {
      const entries = [...timers.entries()]
      timers.clear()
      for (const [, t] of entries) t.fn()
    },
    lastDelay() {
      return [...timers.values()].at(-1)?.ms
    },
  }
}

interface Doc {
  n: number
}

function harness(
  save: (doc: Doc, version: number) => Promise<{ documentVersion: number }>,
  version = 3,
  baseline: Doc | null = null,
) {
  const clock = manualScheduler()
  const statuses: AutosaveStatus[] = []
  const autosave = createAutosave<Doc>({
    version,
    baseline,
    save,
    onStatus: (s) => statuses.push(s),
    scheduler: clock.scheduler,
    now: () => 1_000,
  })
  return { autosave, clock, statuses, kinds: () => statuses.map((s) => s.kind) }
}

/** Lets the microtask queue drain so an already-resolved `save` has settled. */
const settle = () => new Promise<void>((r) => setTimeout(r, 0))

describe('createAutosave — debounce', () => {
  it('does not save until the timer fires', async () => {
    const save = vi.fn().mockResolvedValue({ documentVersion: 4 })
    const { autosave, clock } = harness(save)

    autosave.schedule({ n: 1 })
    expect(save).not.toHaveBeenCalled()

    clock.fire()
    await settle()
    expect(save).toHaveBeenCalledWith({ n: 1 }, 3)
  })

  it('restarts the timer on every edit and sends only the latest document', async () => {
    const save = vi.fn().mockResolvedValue({ documentVersion: 4 })
    const { autosave, clock } = harness(save)

    autosave.schedule({ n: 1 })
    autosave.schedule({ n: 2 })
    autosave.schedule({ n: 3 })
    expect(clock.pending).toBe(1)

    clock.fire()
    await settle()
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith({ n: 3 }, 3)
  })

  it('uses the documented debounce window', () => {
    const { autosave, clock } = harness(vi.fn().mockResolvedValue({ documentVersion: 4 }))
    autosave.schedule({ n: 1 })
    expect(clock.lastDelay()).toBe(AUTOSAVE_DEBOUNCE_MS)
  })

  it('reports dirty → saving → saved', async () => {
    const { autosave, clock, kinds } = harness(vi.fn().mockResolvedValue({ documentVersion: 4 }))
    autosave.schedule({ n: 1 })
    clock.fire()
    await settle()
    expect(kinds()).toEqual(['dirty', 'saving', 'saved'])
  })
})

describe('createAutosave — one write at a time', () => {
  it('holds an edit made during a save and sends it after, never concurrently', async () => {
    let release: (v: { documentVersion: number }) => void = () => {}
    const save = vi
      .fn()
      .mockImplementationOnce(() => new Promise((r) => { release = r }))
      .mockResolvedValue({ documentVersion: 9 })
    const { autosave, clock } = harness(save)

    autosave.schedule({ n: 1 })
    clock.fire()
    expect(save).toHaveBeenCalledTimes(1)

    // Edit lands mid-flight. Nothing may be sent yet.
    autosave.schedule({ n: 2 })
    expect(clock.pending).toBe(0)
    expect(save).toHaveBeenCalledTimes(1)

    release({ documentVersion: 8 })
    await settle()

    // Now — and only now — a timer is armed for the held edit.
    expect(clock.pending).toBe(1)
    clock.fire()
    await settle()
    expect(save).toHaveBeenCalledTimes(2)
  })

  it('sends the version the previous save returned, not the one it was opened at', async () => {
    const save = vi
      .fn()
      .mockResolvedValueOnce({ documentVersion: 4 })
      .mockResolvedValueOnce({ documentVersion: 5 })
    const { autosave, clock } = harness(save, 3)

    autosave.schedule({ n: 1 })
    clock.fire()
    await settle()

    autosave.schedule({ n: 2 })
    clock.fire()
    await settle()

    expect(save.mock.calls[0][1]).toBe(3)
    expect(save.mock.calls[1][1]).toBe(4)
    expect(autosave.version).toBe(5)
  })
})

describe('createAutosave — conflict', () => {
  const conflict = () => Promise.reject(new AutosaveConflictError('saved elsewhere'))

  it('suspends saving on a 409 rather than retrying a version that can only lose', async () => {
    const save = vi.fn().mockImplementation(conflict)
    const { autosave, clock, kinds } = harness(save)

    autosave.schedule({ n: 1 })
    clock.fire()
    await settle()
    expect(kinds().at(-1)).toBe('conflict')

    // Further edits arm nothing — the loop is stopped, not merely slowed.
    autosave.schedule({ n: 2 })
    autosave.schedule({ n: 3 })
    clock.fire()
    await settle()
    expect(save).toHaveBeenCalledTimes(1)
    expect(clock.pending).toBe(0)
  })

  it('does not report a conflict as a save failure the user should retry', async () => {
    const { autosave, clock, statuses } = harness(vi.fn().mockImplementation(conflict))
    autosave.schedule({ n: 1 })
    clock.fire()
    await settle()
    expect(statuses.some((s) => s.kind === 'error')).toBe(false)
  })

  it('resumes from the reloaded version and drops the edit built on the losing one', async () => {
    const save = vi
      .fn()
      .mockImplementationOnce(conflict)
      .mockResolvedValue({ documentVersion: 12 })
    const { autosave, clock } = harness(save, 3)

    autosave.schedule({ n: 1 })
    clock.fire()
    await settle()

    autosave.resume(11)
    expect(autosave.version).toBe(11)

    // The pending edit was discarded with the document it was built on, so a
    // bare resume saves nothing.
    clock.fire()
    await settle()
    expect(save).toHaveBeenCalledTimes(1)

    autosave.schedule({ n: 7 })
    clock.fire()
    await settle()
    expect(save).toHaveBeenLastCalledWith({ n: 7 }, 11)
  })
})

describe('createAutosave — a restore is not an edit', () => {
  it('writes nothing when the engine re-announces the document it was opened with', () => {
    const restored: Doc = { n: 1 }
    const save = vi.fn().mockResolvedValue({ documentVersion: 4 })
    const { autosave, clock, kinds } = harness(save, 3, restored)

    autosave.schedule(restored)

    expect(clock.pending).toBe(0)
    expect(kinds()).toEqual([])
    clock.fire()
    expect(save).not.toHaveBeenCalled()
  })

  it('saves the first real edit after a restore', () => {
    const restored: Doc = { n: 1 }
    const save = vi.fn().mockResolvedValue({ documentVersion: 4 })
    const { autosave, clock } = harness(save, 3, restored)

    autosave.schedule(restored)
    autosave.schedule({ n: 2 })

    expect(clock.pending).toBe(1)
  })

  it('is identity, not equality — an edit that lands on the same values still saves', async () => {
    const restored: Doc = { n: 1 }
    const save = vi.fn().mockResolvedValue({ documentVersion: 4 })
    const { autosave, clock } = harness(save, 3, restored)

    autosave.schedule({ n: 1 })
    clock.fire()
    await settle()

    expect(save).toHaveBeenCalledTimes(1)
  })

  it('rebase makes a later document the baseline — the media re-link path', async () => {
    const save = vi.fn().mockResolvedValue({ documentVersion: 4 })
    const { autosave, clock, kinds } = harness(save, 3, { n: 1 })

    const relinked: Doc = { n: 2 }
    autosave.rebase(relinked)
    autosave.schedule(relinked)

    expect(clock.pending).toBe(0)
    expect(kinds()).toEqual([])
    await settle()
    expect(save).not.toHaveBeenCalled()
  })

  it('rebase cancels a save already queued for that same document', () => {
    const save = vi.fn().mockResolvedValue({ documentVersion: 4 })
    const { autosave, clock, kinds } = harness(save, 3)

    const reloaded: Doc = { n: 9 }
    autosave.schedule(reloaded)
    expect(clock.pending).toBe(1)

    autosave.rebase(reloaded)

    expect(clock.pending).toBe(0)
    expect(kinds()).toEqual(['dirty', 'idle'])
  })

  it('rebase leaves a genuine pending edit alone', () => {
    const save = vi.fn().mockResolvedValue({ documentVersion: 4 })
    const { autosave, clock } = harness(save, 3)

    autosave.schedule({ n: 5 })
    autosave.rebase({ n: 9 })

    expect(clock.pending).toBe(1)
  })

  it('does not re-save what it just saved when the engine replays it', async () => {
    const save = vi.fn().mockResolvedValue({ documentVersion: 4 })
    const { autosave, clock } = harness(save)

    const edited: Doc = { n: 7 }
    autosave.schedule(edited)
    clock.fire()
    await settle()
    expect(save).toHaveBeenCalledTimes(1)

    autosave.schedule(edited)
    expect(clock.pending).toBe(0)
    clock.fire()
    await settle()
    expect(save).toHaveBeenCalledTimes(1)
  })
})

describe('createAutosave — failure and teardown', () => {
  it('keeps the edit after a transport failure so the next change retries it', async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ documentVersion: 4 })
    const { autosave, clock, kinds } = harness(save)

    autosave.schedule({ n: 1 })
    clock.fire()
    await settle()
    expect(kinds().at(-1)).toBe('error')

    expect(clock.pending).toBe(1)
    clock.fire()
    await settle()
    expect(save).toHaveBeenLastCalledWith({ n: 1 }, 3)
  })

  it('treats a non-conflict error as a retryable failure, not a conflict', async () => {
    const save = vi.fn().mockRejectedValue(new Error('boom'))
    const { autosave, clock, kinds } = harness(save)
    autosave.schedule({ n: 1 })
    clock.fire()
    await settle()
    expect(kinds().at(-1)).toBe('error')
  })

  it('flush saves immediately instead of waiting out the window', async () => {
    const save = vi.fn().mockResolvedValue({ documentVersion: 4 })
    const { autosave, clock } = harness(save)

    autosave.schedule({ n: 1 })
    await autosave.flush()
    expect(save).toHaveBeenCalledWith({ n: 1 }, 3)
    expect(clock.pending).toBe(0)
  })

  it('flush is a no-op with nothing pending', async () => {
    const save = vi.fn().mockResolvedValue({ documentVersion: 4 })
    const { autosave } = harness(save)
    await autosave.flush()
    expect(save).not.toHaveBeenCalled()
  })

  it('flush issues the request before it yields, so disposing right after still saves', async () => {
    let release: (v: { documentVersion: number }) => void = () => {}
    const save = vi.fn().mockImplementation(() => new Promise((r) => { release = r }))
    const { autosave, statuses } = harness(save)

    autosave.schedule({ n: 1 })
    void autosave.flush()
    autosave.dispose()

    expect(save).toHaveBeenCalledWith({ n: 1 }, 3)

    const before = statuses.length
    release({ documentVersion: 4 })
    await settle()
    expect(statuses).toHaveLength(before)
  })

  it('dispose stops the timer and reports nothing onto an unmounted page', async () => {
    let release: (v: { documentVersion: number }) => void = () => {}
    const save = vi.fn().mockImplementation(() => new Promise((r) => { release = r }))
    const { autosave, clock, statuses } = harness(save)

    autosave.schedule({ n: 1 })
    clock.fire()
    const before = statuses.length

    autosave.dispose()
    release({ documentVersion: 4 })
    await settle()

    expect(statuses).toHaveLength(before)
    autosave.schedule({ n: 2 })
    expect(clock.pending).toBe(0)
  })
})

describe('isVersionConflict', () => {
  it('is true only for an AutosaveConflictError', () => {
    expect(isVersionConflict(new AutosaveConflictError('stale'))).toBe(true)
    expect(isVersionConflict(new Error('gone'))).toBe(false)
    expect(isVersionConflict(new Error('409'))).toBe(false)
    expect(isVersionConflict(null)).toBe(false)
  })
})
