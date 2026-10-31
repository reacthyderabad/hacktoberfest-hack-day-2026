/**
 * Track-height constants shared between `ProductionEditor` (which seeds the
 * default lanes) and `useGenerateSubtitles` (which creates lanes on demand at
 * the same height, so generated Subtitles tracks read as full-fledged lanes
 * rather than the smaller user-added-track default).
 */
export const DEFAULT_TRACK_HEIGHT = 36
export const FIXED_TRACK_HEIGHT = DEFAULT_TRACK_HEIGHT * 1.5
