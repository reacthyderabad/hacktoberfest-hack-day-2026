import { beforeEach, describe, expect, it } from 'vitest'
import {
  BUILT_IN_TEXT_STYLE_PRESETS,
  textStylePresetsStore,
  type TextStylePreset,
} from './textStylePresets.store'

const draft: Omit<TextStylePreset, 'id'> = {
  name: 'Mine',
  fontFamily: 'serif',
  fontWeight: 'bold',
  fontSize: 40,
  textAlign: 'left',
  color: '#123456',
  opacity: 0.8,
}

describe('textStylePresetsStore', () => {
  beforeEach(() => {
    textStylePresetsStore.setState({ presets: [] })
  })

  it('starts with an empty user list — built-ins are not copied into it', () => {
    expect(textStylePresetsStore.getState().presets).toEqual([])
  })

  it('addPreset assigns a unique id and keeps the fields', () => {
    const { addPreset } = textStylePresetsStore.getState()
    addPreset(draft)
    addPreset(draft)

    const { presets } = textStylePresetsStore.getState()
    expect(presets).toHaveLength(2)
    expect(presets[0]).toMatchObject(draft)
    expect(presets[0].id).toEqual(expect.any(String))
    expect(presets[0].id).not.toBe('')
    expect(presets[0].id).not.toBe(presets[1].id)
  })

  it('added presets never collide with, or duplicate, the built-ins', () => {
    textStylePresetsStore.getState().addPreset({ ...draft, name: BUILT_IN_TEXT_STYLE_PRESETS[0].name })

    const builtInIds = new Set(BUILT_IN_TEXT_STYLE_PRESETS.map((p) => p.id))
    const { presets } = textStylePresetsStore.getState()
    expect(presets).toHaveLength(1)
    expect(presets.some((p) => builtInIds.has(p.id))).toBe(false)
    expect(builtInIds.size).toBe(BUILT_IN_TEXT_STYLE_PRESETS.length)
  })

  it('removePreset removes only the matching preset', () => {
    const { addPreset, removePreset } = textStylePresetsStore.getState()
    addPreset({ ...draft, name: 'one' })
    addPreset({ ...draft, name: 'two' })
    const [one, two] = textStylePresetsStore.getState().presets

    removePreset(one.id)

    expect(textStylePresetsStore.getState().presets).toEqual([two])
  })

  it('removePreset cannot delete a built-in (they are not in the store)', () => {
    textStylePresetsStore.getState().addPreset(draft)
    textStylePresetsStore.getState().removePreset(BUILT_IN_TEXT_STYLE_PRESETS[0].id)
    expect(textStylePresetsStore.getState().presets).toHaveLength(1)
    expect(BUILT_IN_TEXT_STYLE_PRESETS.length).toBeGreaterThan(0)
  })
})
