import { describe, expect, it } from 'vitest'
import { createFrameSequence } from '../frameSequence'
import { frameSequenceToProject } from '../frameSequenceProject'
import { TimelineEngine } from '../../editor/TimelineEngine'
import { getTotalFrames } from '../../utils/frames'

const sequence = createFrameSequence({
  frames: Array.from({ length: 36 }, (_, i) => `frame-${i}.webp`),
  fps: 24,
  seamless: true,
  label: 'Riverside penthouse',
})

describe('frameSequenceToProject', () => {
  it('lays every frame end to end on one track', () => {
    const project = frameSequenceToProject(sequence)
    const trackId = project.tracks[0]?.id as string
    const clips = project.clips[trackId] ?? []

    expect(project.tracks).toHaveLength(1)
    expect(clips).toHaveLength(36)
    expect(clips.map((c) => c.startFrame)).toEqual(
      Array.from({ length: 36 }, (_, i) => i),
    )
  })

  it('makes every clip an image clip pointing at its frame', () => {
    const project = frameSequenceToProject(sequence)
    const clips = project.clips[project.tracks[0]?.id as string] ?? []
    expect(clips.every((c) => c.type === 'image')).toBe(true)
    expect(clips[7]?.src).toBe('frame-7.webp')
  })

  it('inherits the sequence fps and label', () => {
    const project = frameSequenceToProject(sequence)
    expect(project.fps).toBe(24)
    expect(project.tracks[0]?.name).toBe('Riverside penthouse')
  })

  it('holdFrames stretches each frame, so index and timeline time can differ', () => {
    const project = frameSequenceToProject(sequence, { holdFrames: 6 })
    const clips = project.clips[project.tracks[0]?.id as string] ?? []
    expect(clips[0]?.durationFrames).toBe(6)
    expect(clips[1]?.startFrame).toBe(6)
    expect(getTotalFrames(project.clips)).toBe(36 * 6)
  })

  it('defaults to one timeline frame per sequence frame', () => {
    const project = frameSequenceToProject(sequence)
    expect(getTotalFrames(project.clips)).toBe(36)
  })

  it('coerces a nonsensical holdFrames to a usable minimum', () => {
    const project = frameSequenceToProject(sequence, { holdFrames: 0 })
    const clips = project.clips[project.tracks[0]?.id as string] ?? []
    expect(clips[0]?.durationFrames).toBe(1)
  })

  it('produces clips with unique ids', () => {
    const project = frameSequenceToProject(sequence)
    const clips = project.clips[project.tracks[0]?.id as string] ?? []
    expect(new Set(clips.map((c) => c.id)).size).toBe(clips.length)
  })

  it('loads into a real TimelineEngine — the point of the bridge', () => {
    const engine = new TimelineEngine({ fps: 24 })
    engine.loadProject(frameSequenceToProject(sequence))

    const project = engine.getProject()
    const trackId = project.tracks[0]?.id as string
    expect(project.clips[trackId]).toHaveLength(36)
    expect(project.fps).toBe(24)
  })

  it('handles an empty sequence without producing a broken project', () => {
    const project = frameSequenceToProject(createFrameSequence({ frames: [] }))
    expect(project.tracks).toHaveLength(1)
    expect(project.clips[project.tracks[0]?.id as string]).toEqual([])
  })
})
