import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clipLoadStore } from './clipLoad.store'

describe('clipLoadStore', () => {
  beforeEach(() => {
    clipLoadStore.getState().clear()
  })

  it('records and forgets per-clip state', () => {
    const { set } = clipLoadStore.getState()

    set('a', 'loading')
    set('b', 'error')
    expect(clipLoadStore.getState().byClipId).toEqual({ a: 'loading', b: 'error' })

    set('a', null)
    expect(clipLoadStore.getState().byClipId).toEqual({ b: 'error' })

    clipLoadStore.getState().clear()
    expect(clipLoadStore.getState().byClipId).toEqual({})
  })

  it('does not notify when the reported state is unchanged', () => {
    // acquire() reports 'loading' on every tick a clip is in the scene, so a
    // repeat write that notified would put React back on the render loop —
    // exactly what this store exists to avoid.
    const listener = vi.fn()
    const unsubscribe = clipLoadStore.subscribe(listener)

    clipLoadStore.getState().set('a', 'loading')
    expect(listener).toHaveBeenCalledTimes(1)

    clipLoadStore.getState().set('a', 'loading')
    clipLoadStore.getState().set('a', 'loading')
    expect(listener).toHaveBeenCalledTimes(1)

    clipLoadStore.getState().set('a', 'error')
    expect(listener).toHaveBeenCalledTimes(2)

    unsubscribe()
  })

  it('does not notify when clearing a clip that has no entry', () => {
    const listener = vi.fn()
    const unsubscribe = clipLoadStore.subscribe(listener)

    clipLoadStore.getState().set('never-seen', null)
    expect(listener).not.toHaveBeenCalled()

    unsubscribe()
  })

  it('does not notify when clearing an already-empty store', () => {
    const listener = vi.fn()
    const unsubscribe = clipLoadStore.subscribe(listener)

    clipLoadStore.getState().clear()
    expect(listener).not.toHaveBeenCalled()

    unsubscribe()
  })
})
