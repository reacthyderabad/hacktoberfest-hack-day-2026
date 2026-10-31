import { afterEach, describe, expect, it, vi } from 'vitest'

// The real determination reads the media container over the network. Stub it to
// echo the library's `hasAudio`, which is what the old code read directly —
// individual tests override it to model a probe that disagrees with the seed.
vi.mock('@elah/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@elah/core')>()
  return {
    ...actual,
    determineAssetHasAudio: vi.fn(async (assetId: string) =>
      Boolean(actual.mediaLibraryStore.getState().getAsset(assetId)?.hasAudio),
    ),
  }
})

import {
  TimelineEngine,
  determineAssetHasAudio,
  mediaLibraryStore,
  playbackStore,
  type MediaAsset,
} from '@elah/core'
import { useAudioDropDialogStore } from './audioDropDialog.store'
import { growClipToAssetDuration, insertElement, insertMediaAsset, resolveDropPosition } from './insertAsset'

const originalAudioRequest = useAudioDropDialogStore.getState().request
const originalAudioRespond = useAudioDropDialogStore.getState().respond

afterEach(() => {
  mediaLibraryStore.setState({ assets: {}, order: [] })
  playbackStore.setState({ currentFrame: 0 })
  useAudioDropDialogStore.setState({
    open: false,
    assetName: '',
    resolve: null,
    request: originalAudioRequest,
    respond: originalAudioRespond,
  })
  vi.mocked(determineAssetHasAudio).mockClear()
  vi.restoreAllMocks()
})

describe('insertMediaAsset', () => {
  it('inserts media into the first compatible unlocked track at the playhead', async () => {
    const engine = new TimelineEngine({ fps: 30 })
    const videoTrack = engine.getProject().tracks[0]
    addAsset({ id: 'asset-video', kind: 'video', durationSec: 2 })
    playbackStore.setState({ currentFrame: 12 })

    const result = await insertMediaAsset(engine, 'asset-video')

    expect(result).toMatchObject({ ok: true, kind: 'video', trackId: videoTrack.id })
    expect(engine.getClipsOnTrack(videoTrack.id)).toMatchObject([
      {
        type: 'video',
        assetId: 'asset-video',
        startFrame: 12,
        durationFrames: 60,
      },
    ])
  })

  it('skips locked compatible tracks', async () => {
    const engine = new TimelineEngine({ fps: 30 })
    const lockedAudio = engine.addTrack('audio', { name: 'Locked audio' })
    engine.updateTrack(lockedAudio.id, { locked: true })
    const unlockedAudio = engine.addTrack('audio', { name: 'Open audio' })
    addAsset({ id: 'asset-audio', kind: 'audio', durationSec: 1 })
    playbackStore.setState({ currentFrame: 7 })

    const result = await insertMediaAsset(engine, 'asset-audio')

    expect(result).toMatchObject({ ok: true, kind: 'audio', trackId: unlockedAudio.id })
    expect(engine.getClipsOnTrack(lockedAudio.id)).toHaveLength(0)
    expect(engine.getClipsOnTrack(unlockedAudio.id)[0]).toMatchObject({
      type: 'audio',
      startFrame: 7,
      durationFrames: 30,
    })
  })

  it('creates an audio track when inserting audio with no audio lane', async () => {
    const engine = new TimelineEngine({ fps: 30 })
    addAsset({ id: 'asset-audio', kind: 'audio', durationSec: 1 })

    const result = await insertMediaAsset(engine, 'asset-audio', { desiredStartFrame: 4 })

    const audioTrack = engine.getProject().tracks.find((t) => t.kind === 'audio')
    expect(audioTrack).toBeDefined()
    expect(result).toMatchObject({ ok: true, kind: 'audio', trackId: audioTrack?.id })
    expect(engine.getClipsOnTrack(audioTrack!.id)[0]).toMatchObject({
      type: 'audio',
      startFrame: 4,
    })
  })

  it('returns a refusal when no compatible track can receive the asset', async () => {
    const engine = new TimelineEngine({
      fps: 30,
      initialTracks: [{ kind: 'audio', name: 'Audio only' }],
    })
    addAsset({ id: 'asset-image', kind: 'image', durationSec: 0 })

    const result = await insertMediaAsset(engine, 'asset-image')

    expect(result).toEqual({ ok: false, kind: 'image', reason: 'no-track' })
    expect(Object.values(engine.getProject().clips).flat()).toHaveLength(0)
  })

  it('resolves desiredStartFrame overlaps with the existing drop placement behavior', async () => {
    const engine = new TimelineEngine({ fps: 30 })
    const videoTrack = engine.getProject().tracks[0]
    engine.addClip({
      trackId: videoTrack.id,
      type: 'video',
      name: 'Existing',
      src: 'existing.mp4',
      startFrame: 10,
      durationFrames: 20,
    })
    addAsset({ id: 'asset-image', kind: 'image', durationSec: 1 })

    const result = await insertMediaAsset(engine, 'asset-image', { desiredStartFrame: 15 })

    expect(result).toMatchObject({ ok: true, kind: 'image' })
    expect(engine.getClipsOnTrack(videoTrack.id).map((clip) => ({
      type: clip.type,
      startFrame: clip.startFrame,
      durationFrames: clip.durationFrames,
    }))).toEqual([
      { type: 'video', startFrame: 10, durationFrames: 20 },
      { type: 'image', startFrame: 30, durationFrames: 30 },
    ])
  })

  it('places the video clip, then the audio split, as two undo steps', async () => {
    const engine = new TimelineEngine({ fps: 30 })
    const videoTrack = engine.getProject().tracks[0]
    addAsset({
      id: 'asset-video-audio',
      kind: 'video',
      durationSec: 2,
      hasAudio: true,
    })
    const request = vi.fn(async () => 'both' as const)
    useAudioDropDialogStore.setState({ request })

    const result = await insertMediaAsset(engine, 'asset-video-audio', { desiredStartFrame: 3 })

    expect(request).toHaveBeenCalledWith('asset-video-audio.mov')
    expect(result).toMatchObject({ ok: true, kind: 'video', trackId: videoTrack.id })
    const audioTrack = engine.getProject().tracks.find((t) => t.kind === 'audio')
    expect(audioTrack).toBeDefined()
    expect(engine.getClipsOnTrack(videoTrack.id)[0]).toMatchObject({
      type: 'video',
      startFrame: 3,
      durationFrames: 60,
    })
    expect(engine.getClipsOnTrack(audioTrack!.id)[0]).toMatchObject({
      type: 'audio',
      startFrame: 3,
      durationFrames: 60,
    })

    // The split is its own step because the video clip was placed before the
    // dialog was even asked — see the note on `insertMediaAsset`. Undoing it
    // takes the audio lane and its clip, and leaves the video where it is.
    expect(engine.undo()).toBe(true)
    expect(engine.getProject().tracks.some((t) => t.kind === 'audio')).toBe(false)
    expect(engine.getClipsOnTrack(videoTrack.id)).toHaveLength(1)

    expect(engine.undo()).toBe(true)
    expect(engine.canUndo()).toBe(false)
    expect(engine.getClipsOnTrack(videoTrack.id)).toHaveLength(0)
  })

  it('places the clip before the audio probe answers', async () => {
    // The whole point of the reorder: a drop must not look dead while a
    // container read that can take seconds is in flight.
    const engine = new TimelineEngine({ fps: 30 })
    const videoTrack = engine.getProject().tracks[0]
    addAsset({ id: 'asset-slow', kind: 'video', durationSec: 2, hasAudio: true })

    let answerProbe!: (hasAudio: boolean) => void
    vi.mocked(determineAssetHasAudio).mockReturnValueOnce(
      new Promise<boolean>((resolve) => {
        answerProbe = resolve
      }),
    )
    const request = vi.fn(async () => 'video-only' as const)
    useAudioDropDialogStore.setState({ request })

    const pending = insertMediaAsset(engine, 'asset-slow', { desiredStartFrame: 3 })
    // Let the synchronous placement and its microtasks flush, without resolving
    // the probe.
    await Promise.resolve()
    await Promise.resolve()

    expect(engine.getClipsOnTrack(videoTrack.id)).toMatchObject([
      { type: 'video', startFrame: 3, durationFrames: 60 },
    ])
    expect(request).not.toHaveBeenCalled()

    answerProbe(true)
    await expect(pending).resolves.toMatchObject({ ok: true, kind: 'video' })
    expect(request).toHaveBeenCalledOnce()
    // 'video-only' leaves exactly what was already on screen.
    expect(engine.getProject().tracks.some((t) => t.kind === 'audio')).toBe(false)
    expect(engine.getClipsOnTrack(videoTrack.id)).toHaveLength(1)
  })

  it('swaps the placed video clip for an audio clip on "audio-only"', async () => {
    const engine = new TimelineEngine({ fps: 30 })
    const videoTrack = engine.getProject().tracks[0]
    addAsset({ id: 'asset-va', kind: 'video', durationSec: 2, hasAudio: true })
    useAudioDropDialogStore.setState({ request: vi.fn(async () => 'audio-only' as const) })

    const result = await insertMediaAsset(engine, 'asset-va', { desiredStartFrame: 3 })

    const audioTrack = engine.getProject().tracks.find((t) => t.kind === 'audio')
    expect(result).toMatchObject({ ok: true, kind: 'video', trackId: audioTrack?.id })
    expect(engine.getClipsOnTrack(videoTrack.id)).toHaveLength(0)
    expect(engine.getClipsOnTrack(audioTrack!.id)[0]).toMatchObject({
      type: 'audio',
      startFrame: 3,
      durationFrames: 60,
    })

    // One step back restores the video clip the user watched appear.
    expect(engine.undo()).toBe(true)
    expect(engine.getClipsOnTrack(videoTrack.id)).toHaveLength(1)
  })

  it('keeps the video and its audio on one start frame when only the audio lane is occupied', async () => {
    const engine = new TimelineEngine({ fps: 30 })
    const videoTrack = engine.getProject().tracks[0]
    const audioTrack = engine.addTrack('audio')
    engine.addClip({
      trackId: audioTrack.id,
      type: 'audio',
      name: 'existing.wav',
      startFrame: 0,
      durationFrames: 100,
      src: 'blob:existing',
    })
    addAsset({ id: 'asset-sync', kind: 'video', durationSec: 2, hasAudio: true })
    useAudioDropDialogStore.setState({ request: vi.fn(async () => 'both' as const) })

    const result = await insertMediaAsset(engine, 'asset-sync', { desiredStartFrame: 10 })

    expect(result.ok).toBe(true)
    const video = engine.getClipsOnTrack(videoTrack.id)[0]
    const audio = engine.getClipsOnTrack(audioTrack.id).find((c) => c.name !== 'existing.wav')!
    expect(audio.startFrame).toBe(video.startFrame)
    expect(audio.durationFrames).toBe(video.durationFrames)
    expect(audio.startFrame).toBeGreaterThanOrEqual(100)

    // The video's move is part of the same step as the audio, not its own.
    expect(engine.undo()).toBe(true)
    expect(engine.getClipsOnTrack(videoTrack.id)[0]).toMatchObject({ startFrame: 10 })
  })

  it('follows the video clip when the user moves it while the dialog is open', async () => {
    const engine = new TimelineEngine({ fps: 30 })
    const videoTrack = engine.getProject().tracks[0]
    addAsset({ id: 'asset-va', kind: 'video', durationSec: 2, hasAudio: true })
    useAudioDropDialogStore.setState({
      request: vi.fn(async () => {
        const clip = engine.getClipsOnTrack(videoTrack.id)[0]
        engine.updateClip(clip.id, videoTrack.id, { startFrame: 90 })
        return 'both' as const
      }),
    })

    await insertMediaAsset(engine, 'asset-va', { desiredStartFrame: 3 })

    const audioTrack = engine.getProject().tracks.find((t) => t.kind === 'audio')
    expect(engine.getClipsOnTrack(audioTrack!.id)[0]).toMatchObject({
      type: 'audio',
      startFrame: 90,
      durationFrames: 60,
    })
  })

  it('keeps the video clip when the dialog is superseded', async () => {
    const engine = new TimelineEngine({ fps: 30 })
    const videoTrack = engine.getProject().tracks[0]
    addAsset({ id: 'asset-va', kind: 'video', durationSec: 2, hasAudio: true })
    useAudioDropDialogStore.setState({ request: vi.fn(async () => null) })

    const result = await insertMediaAsset(engine, 'asset-va', { desiredStartFrame: 3 })

    // Previously this reported 'cancelled' and placed nothing at all.
    expect(result).toMatchObject({ ok: true, kind: 'video', trackId: videoTrack.id })
    expect(engine.getClipsOnTrack(videoTrack.id)).toHaveLength(1)
  })

  it('keeps the video clip when every audio lane is locked', async () => {
    const engine = new TimelineEngine({ fps: 30 })
    const videoTrack = engine.getProject().tracks[0]
    const lockedAudio = engine.addTrack('audio', { name: 'Locked audio' })
    engine.updateTrack(lockedAudio.id, { locked: true })
    addAsset({ id: 'asset-va', kind: 'video', durationSec: 2, hasAudio: true })
    useAudioDropDialogStore.setState({ request: vi.fn(async () => 'both' as const) })

    const result = await insertMediaAsset(engine, 'asset-va', { desiredStartFrame: 3 })

    // A split that could not happen is not a failed insert.
    expect(result).toMatchObject({ ok: true, kind: 'video', trackId: videoTrack.id })
    expect(engine.getClipsOnTrack(videoTrack.id)).toHaveLength(1)
    expect(engine.getClipsOnTrack(lockedAudio.id)).toHaveLength(0)
  })

  it('prompts when the audio probe finds audio the imported asset did not know about', async () => {
    // The gallery imports and inserts in the same click, so
    // `asset.hasAudio` is still the placeholder seed. Reading it directly is what
    // dropped lipsync videos onto the timeline silently, with no split prompt.
    const engine = new TimelineEngine({ fps: 30 })
    const videoTrack = engine.getProject().tracks[0]
    addAsset({
      id: 'asset-pending-video',
      kind: 'video',
      durationSec: 2,
      hasAudio: false,
    })
    vi.mocked(determineAssetHasAudio).mockResolvedValueOnce(true)
    const request = vi.fn(async () => 'both' as const)
    useAudioDropDialogStore.setState({ request })

    const result = await insertMediaAsset(engine, 'asset-pending-video', { desiredStartFrame: 0 })

    expect(request).toHaveBeenCalledWith('asset-pending-video.mov')
    expect(result).toMatchObject({ ok: true, kind: 'video', trackId: videoTrack.id })
    const audioTrack = engine.getProject().tracks.find((t) => t.kind === 'audio')
    expect(engine.getClipsOnTrack(audioTrack!.id)[0]).toMatchObject({ type: 'audio', startFrame: 0 })
  })

  it('does not prompt when the audio probe confirms the video is silent', async () => {
    const engine = new TimelineEngine({ fps: 30 })
    const videoTrack = engine.getProject().tracks[0]
    addAsset({ id: 'asset-silent-video', kind: 'video', durationSec: 2, hasAudio: true })
    vi.mocked(determineAssetHasAudio).mockResolvedValueOnce(false)
    const request = vi.fn(async () => 'both' as const)
    useAudioDropDialogStore.setState({ request })

    const result = await insertMediaAsset(engine, 'asset-silent-video', { desiredStartFrame: 0 })

    expect(request).not.toHaveBeenCalled()
    expect(result).toMatchObject({ ok: true, kind: 'video', trackId: videoTrack.id })
    expect(engine.getProject().tracks.some((t) => t.kind === 'audio')).toBe(false)
  })

  it('inserts video-only without prompting when videoOnly is set', async () => {
    const engine = new TimelineEngine({ fps: 30 })
    const videoTrack = engine.getProject().tracks[0]
    addAsset({
      id: 'asset-video-audio',
      kind: 'video',
      durationSec: 2,
      hasAudio: true,
    })
    const request = vi.fn(async () => 'both' as const)
    useAudioDropDialogStore.setState({ request })

    const result = await insertMediaAsset(engine, 'asset-video-audio', {
      desiredStartFrame: 3,
      videoOnly: true,
    })

    expect(request).not.toHaveBeenCalled()
    // The caller already decided — don't spend a network probe on the answer.
    expect(determineAssetHasAudio).not.toHaveBeenCalled()
    expect(result).toMatchObject({ ok: true, kind: 'video', trackId: videoTrack.id })
    expect(engine.getProject().tracks.some((t) => t.kind === 'audio')).toBe(false)
    expect(engine.getClipsOnTrack(videoTrack.id)).toEqual([
      expect.objectContaining({ type: 'video', startFrame: 3, durationFrames: 60 }),
    ])
  })
})

describe('insertElement', () => {
  it('creates an elements track when inserting an element with no elements lane', () => {
    const engine = new TimelineEngine({ fps: 30 })
    playbackStore.setState({ currentFrame: 9 })

    const result = insertElement(engine, { kind: 'element', element: 'text' })

    const elementsTrack = engine.getProject().tracks.find((t) => t.kind === 'elements')
    expect(elementsTrack).toBeDefined()
    expect(result).toMatchObject({ ok: true, kind: 'element', trackId: elementsTrack?.id })
    expect(engine.getClipsOnTrack(elementsTrack!.id)[0]).toMatchObject({
      type: 'text',
      name: 'Text 1',
      startFrame: 9,
      durationFrames: 90,
    })
  })
})

describe('growClipToAssetDuration', () => {
  it('grows a placeholder clip to the real duration once probed', () => {
    const engine = new TimelineEngine({ fps: 30 })
    const videoTrack = engine.getProject().tracks[0]
    const clip = engine.addClip({
      trackId: videoTrack.id,
      type: 'video',
      name: 'Pending',
      src: 'cdn.mp4',
      startFrame: 0,
      durationFrames: 150, // 5s fallback @ 30fps
    })

    growClipToAssetDuration(engine, clip.id, 150, 10)

    expect(engine.getClipsOnTrack(videoTrack.id)[0]).toMatchObject({
      durationFrames: 300,
      sourceDurationFrames: 300,
    })
  })

  it('clamps growth to the gap before the next clip instead of overlapping it', () => {
    const engine = new TimelineEngine({ fps: 30 })
    const videoTrack = engine.getProject().tracks[0]
    const clip = engine.addClip({
      trackId: videoTrack.id,
      type: 'video',
      name: 'Pending',
      src: 'cdn.mp4',
      startFrame: 0,
      durationFrames: 150,
    })
    engine.addClip({
      trackId: videoTrack.id,
      type: 'video',
      name: 'Next',
      src: 'next.mp4',
      startFrame: 200,
      durationFrames: 60,
    })

    growClipToAssetDuration(engine, clip.id, 150, 10) // wants 300 frames, only 200 available

    expect(engine.getClipsOnTrack(videoTrack.id)[0]).toMatchObject({
      durationFrames: 200,
      sourceDurationFrames: 200,
    })
  })

  it('leaves the clip alone if the user already trimmed it away from the fallback duration', () => {
    const engine = new TimelineEngine({ fps: 30 })
    const videoTrack = engine.getProject().tracks[0]
    const clip = engine.addClip({
      trackId: videoTrack.id,
      type: 'video',
      name: 'Pending',
      src: 'cdn.mp4',
      startFrame: 0,
      durationFrames: 150,
    })
    engine.trimClip(clip.id, videoTrack.id, 0, 90)

    growClipToAssetDuration(engine, clip.id, 150, 10)

    expect(engine.getClipsOnTrack(videoTrack.id)[0].durationFrames).toBe(90)
  })
})

describe('resolveDropPosition', () => {
  it('pushes past an entire run of back-to-back clips to the true end, not a zero-width internal gap', () => {
    const clips = [
      { startFrame: 0, durationFrames: 10 },
      { startFrame: 10, durationFrames: 10 },
      { startFrame: 20, durationFrames: 10 },
    ]

    const result = resolveDropPosition(clips, 5, 8)

    expect(result).toEqual({ startFrame: 30, durationFrames: 8 })
  })

  it('still trims into a genuine gap after a run of overlapping clips', () => {
    const clips = [
      { startFrame: 0, durationFrames: 10 },
      { startFrame: 10, durationFrames: 10 },
      { startFrame: 25, durationFrames: 10 },
    ]

    const result = resolveDropPosition(clips, 5, 8)

    expect(result).toEqual({ startFrame: 20, durationFrames: 5 })
  })
})

function addAsset(overrides: Partial<MediaAsset> & Pick<MediaAsset, 'id' | 'kind'>) {
  const asset: MediaAsset = {
    id: overrides.id,
    kind: overrides.kind,
    name: overrides.name ?? `${overrides.id}.mov`,
    src: overrides.src ?? `${overrides.id}.mov`,
    durationSec: overrides.durationSec ?? 0,
    byteSize: overrides.byteSize ?? 1024,
    lastModified: overrides.lastModified ?? 0,
    addedAt: overrides.addedAt ?? 0,
    hasAudio: overrides.hasAudio,
    thumbnailUrl: overrides.thumbnailUrl,
    width: overrides.width,
    height: overrides.height,
    sourceFps: overrides.sourceFps,
    thumbnailStrip: overrides.thumbnailStrip,
    waveform: overrides.waveform,
  }
  mediaLibraryStore.getState().addAsset(asset)
}
