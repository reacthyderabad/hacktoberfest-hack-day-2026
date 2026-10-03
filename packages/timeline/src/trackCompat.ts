import type { ClipType, MediaKind, TrackKind } from '@elah/core'

/**
 * Whether a media asset can be placed on a track of the given kind. Shared by
 * `useTimelineDrop` (drag-over highlight / browser-level drop gate) and
 * `insertAsset` (the actual insertion path) — previously duplicated verbatim
 * in both, which risked the two silently diverging.
 */
export function isCompatibleTrackKind(trackKind: TrackKind, mediaKind: MediaKind): boolean {
  if (trackKind === 'audio') return mediaKind === 'audio'
  if (trackKind === 'video') return mediaKind === 'video' || mediaKind === 'image'
  return false
}

/**
 * Whether an existing clip (identified by its `ClipType`) may move onto a
 * track of the given kind — the same compatibility rule as
 * `isCompatibleTrackKind`, but keyed on a clip already on the timeline rather
 * than an asset being dropped from the media library. Used by the
 * cross-track drag gesture in `ClipBlock`.
 */
export function isClipAllowedOnTrack(clipType: ClipType, trackKind: TrackKind): boolean {
  if (clipType === 'video' || clipType === 'image') return trackKind === 'video'
  if (clipType === 'audio') return trackKind === 'audio'
  return trackKind === 'elements' // text | shape | freehand
}
