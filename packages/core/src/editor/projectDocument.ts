import type {
  Clip,
  Project,
  Track,
  TrackKind,
  Transition,
  TransitionKind,
} from '../types'

/**
 * Reading a stored composition back into the engine.
 *
 * A `Project` that has been through `JSON.stringify` and back is not a
 * `Project` — it is `unknown`. It may have been written by an older build, by a
 * newer one, or by nothing at all, and `TimelineEngine.loadProject` replaces the
 * whole composition with it. Everything the engine and the React stores
 * dereference without a guard (`project.stage.width`, `clips[track.id]`,
 * `tracks.map`) has to be established *here*, once, before that swap happens.
 *
 * The split of responsibility is deliberate:
 *
 *  - **Repair what is missing.** A document with no `stage` / `transitions` /
 *    `masterVolume` predates those fields. Defaulting them loses nothing and
 *    opens the project, which is the whole point.
 *  - **Refuse what is wrong.** A document whose `tracks` is not a list, or whose
 *    clips have no positions, is not a composition this build can show. Opening
 *    it as "empty" would be a lie the first autosave makes permanent, so it
 *    throws {@link ProjectDocumentError} and the caller shows the user why.
 *
 * Nothing here drops a clip. A clip whose media has gone missing is still the
 * user's work and still has a position, a duration and a name; see
 * {@link relinkProjectMedia} for what happens to it instead.
 */

/**
 * The document schema this build writes and reads.
 *
 * Bump it only when a stored document needs a real migration — the number is a
 * promise to every build that reads it, not a version of the app.
 */
export const PROJECT_VERSION = 1

/** Stage used when a document carries none. Matches `TimelineEngine`'s own default. */
const DEFAULT_STAGE = { width: 1080, height: 1920 } as const

/** Track volume for a document written before tracks had one. Unity = no change. */
const DEFAULT_TRACK_VOLUME = 1

const TRACK_KINDS: ReadonlySet<string> = new Set<TrackKind>(['video', 'audio', 'elements'])
const CLIP_TYPES: ReadonlySet<string> = new Set([
  'video',
  'audio',
  'text',
  'image',
  'shape',
  'freehand',
])
const TRANSITION_KINDS: ReadonlySet<string> = new Set<TransitionKind>(['fade', 'slide', 'wipe'])

/**
 * Why a stored document could not be opened.
 *
 * `'unreadable'` — the shape is not a composition (or is damaged past repair).
 * `'unsupported-version'` — it was written by a *newer* build than this one.
 * Kept apart because they are different sentences to the user: one is "this
 * file is broken", the other is "update, or open it where you saved it".
 */
export type ProjectDocumentErrorCode = 'unreadable' | 'unsupported-version'

/**
 * Thrown by {@link readProjectDocument}. Typed so the editor can decide what to
 * say without matching on message text — `message` here is for logs, not for
 * the screen.
 */
export class ProjectDocumentError extends Error {
  readonly code: ProjectDocumentErrorCode
  /** The version stamped on the document, when it had a readable one. */
  readonly documentVersion: number | undefined

  constructor(code: ProjectDocumentErrorCode, message: string, documentVersion?: number) {
    super(message)
    this.name = 'ProjectDocumentError'
    this.code = code
    this.documentVersion = documentVersion
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPositiveFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function unreadable(what: string): never {
  throw new ProjectDocumentError('unreadable', `Stored composition is unreadable: ${what}.`)
}

/** Non-negative integer frame position, clamped rather than rejected. */
function toFrameCount(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.max(0, Math.round(value))
}

/** Linear gain, clamped to the 0..2 range the type documents. */
function toGain(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.max(0, Math.min(2, value))
}

/**
 * Read the version stamp.
 *
 * A document with no `version` at all predates the stamp and is v1 — that is
 * what the field's absence means, and refusing it would strand the earliest
 * saved projects. A *newer* version is the one case this build cannot guess at:
 * the fields it doesn't know about are exactly the ones it would drop on the
 * next autosave, so it refuses instead.
 */
function readVersion(raw: unknown): number {
  if (raw === undefined || raw === null) return 1
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1) {
    unreadable('the version stamp is not a whole number')
  }
  if (raw > PROJECT_VERSION) {
    throw new ProjectDocumentError(
      'unsupported-version',
      `Stored composition is version ${raw}; this build reads up to ${PROJECT_VERSION}.`,
      raw,
    )
  }
  return raw
}

/**
 * Bring an older document up to {@link PROJECT_VERSION}.
 *
 * There is only one version today, so this is the identity apart from the
 * stamp — it exists so the first real migration has an obvious place to go, and
 * so `readProjectDocument` already routes through it rather than being
 * rewritten around it later.
 */
function migrate(project: Project, from: number): Project {
  if (from >= PROJECT_VERSION) return project
  return { ...project, version: PROJECT_VERSION }
}

function readTrack(raw: unknown, order: number, defaultHeight: number): Track {
  if (!isPlainObject(raw)) unreadable('a track is not an object')
  if (typeof raw.id !== 'string' || raw.id.length === 0) unreadable('a track has no id')
  if (typeof raw.kind !== 'string' || !TRACK_KINDS.has(raw.kind)) {
    unreadable(`track "${raw.id}" has an unknown kind`)
  }

  return {
    id: raw.id,
    name: typeof raw.name === 'string' ? raw.name : `Track ${order + 1}`,
    kind: raw.kind as TrackKind,
    order: typeof raw.order === 'number' && Number.isFinite(raw.order) ? raw.order : order,
    height: isPositiveFinite(raw.height) ? raw.height : defaultHeight,
    locked: raw.locked === true,
    disabled: raw.disabled === true,
    muted: raw.muted === true,
    solo: raw.solo === true,
    // Both are written unconditionally by `createTrack`, so writing them
    // unconditionally here is what makes a save → restore round-trip an
    // identity rather than a quiet reshaping of every track.
    volume: toGain(raw.volume, DEFAULT_TRACK_VOLUME),
    protected: raw.protected === true,
    // Dropping this on the way back in would silently un-pin the bottom bar on
    // every reload, and `addTrack` would go back to appending below it. Matched
    // against the literal rather than cast, so an unrecognised stored value
    // reads as unpinned instead of ordering tracks around a value nothing else
    // understands.
    pinned: raw.pinned === 'bottom' ? 'bottom' : undefined,
  }
}

/**
 * Clips are copied through by value rather than re-validated field by field.
 *
 * Only the fields the timeline *indexes* — id, type, name, position, length —
 * decide whether a clip can be shown at all; everything else (colours, fonts,
 * transforms, trim windows) already has a renderer-side default, and a clip
 * that reaches the canvas with a stale style is a visible, fixable problem
 * whereas a clip this function threw away is not.
 */
function readClip(raw: unknown, trackId: string, index: number): Clip {
  if (!isPlainObject(raw)) unreadable(`a clip on track "${trackId}" is not an object`)
  if (typeof raw.id !== 'string' || raw.id.length === 0) unreadable('a clip has no id')
  if (typeof raw.type !== 'string' || !CLIP_TYPES.has(raw.type)) {
    unreadable(`clip "${raw.id}" has an unknown type`)
  }
  if (typeof raw.startFrame !== 'number' || !Number.isFinite(raw.startFrame)) {
    unreadable(`clip "${raw.id}" has no position on the timeline`)
  }
  if (!isPositiveFinite(raw.durationFrames)) {
    unreadable(`clip "${raw.id}" has no length`)
  }

  const durationFrames = Math.max(1, Math.round(raw.durationFrames))

  return {
    ...(raw as unknown as Clip),
    // The bucket key wins: a clip filed under a track it doesn't name would
    // otherwise be invisible to every lookup that goes clip → track.
    trackId,
    name: typeof raw.name === 'string' ? raw.name : `Clip ${index + 1}`,
    startFrame: toFrameCount(raw.startFrame, 0),
    durationFrames,
    sourceStartFrame: toFrameCount(raw.sourceStartFrame, 0),
    sourceDurationFrames: toFrameCount(raw.sourceDurationFrames, durationFrames),
  }
}

/**
 * A transition is dropped rather than refused when it no longer makes sense.
 *
 * It joins two clips; if either is gone, or this build has no renderer for its
 * kind, there is nothing to draw between them and nothing of the user's is
 * lost — the clips themselves are untouched. Refusing the whole document over
 * a decoration would be the disproportionate answer.
 */
function readTransition(raw: unknown, clipIds: ReadonlySet<string>): Transition | null {
  if (!isPlainObject(raw)) return null
  if (typeof raw.id !== 'string' || raw.id.length === 0) return null
  if (typeof raw.trackId !== 'string') return null
  if (typeof raw.kind !== 'string' || !TRANSITION_KINDS.has(raw.kind)) return null
  if (typeof raw.fromClipId !== 'string' || typeof raw.toClipId !== 'string') return null
  if (!clipIds.has(raw.fromClipId) || !clipIds.has(raw.toClipId)) return null

  return {
    ...(raw as unknown as Transition),
    startFrame: toFrameCount(raw.startFrame, 0),
    // The engine keeps transition lengths even so the cut sits on a frame.
    durationFrames: Math.max(2, toFrameCount(raw.durationFrames, 2)),
  }
}

export interface ReadProjectDocumentOptions {
  /** Height given to a track whose stored height is missing or nonsense. */
  defaultTrackHeight?: number
}

/**
 * Turn a stored document into a `Project` the engine can be handed.
 *
 * Total: it either returns a project every consumer can dereference, or throws
 * {@link ProjectDocumentError}. It never returns something half-read.
 *
 * @throws {ProjectDocumentError}
 */
export function readProjectDocument(
  document: unknown,
  options?: ReadProjectDocumentOptions,
): Project {
  if (!isPlainObject(document)) unreadable('it is not an object')

  const version = readVersion(document.version)

  if (!isPositiveFinite(document.fps)) unreadable('it has no frame rate')
  if (!Array.isArray(document.tracks)) unreadable('it has no list of tracks')
  // `clips` is indexed by track id. An array would pass a `typeof` check and
  // then read as `undefined` for every track — an empty editor with no error.
  if (!isPlainObject(document.clips)) unreadable('its clips are not indexed by track')

  const defaultTrackHeight = options?.defaultTrackHeight ?? 64
  const tracks = document.tracks.map((raw, index) => readTrack(raw, index, defaultTrackHeight))

  const seen = new Set<string>()
  for (const track of tracks) {
    if (seen.has(track.id)) unreadable(`two tracks share the id "${track.id}"`)
    seen.add(track.id)
  }

  const clips: Project['clips'] = {}
  for (const track of tracks) {
    const raw = (document.clips as Record<string, unknown>)[track.id]
    if (raw === undefined || raw === null) {
      // Every track indexes into `clips`, so an absent bucket is an empty one.
      clips[track.id] = []
      continue
    }
    if (!Array.isArray(raw)) unreadable(`the clips on track "${track.id}" are not a list`)
    clips[track.id] = raw
      .map((clip, index) => readClip(clip, track.id, index))
      .sort((a, b) => a.startFrame - b.startFrame)
  }
  // Buckets keyed by a track that no longer exists are dropped rather than
  // carried: nothing renders them, but `getTotalFrames` walks every bucket, so
  // they would stretch the timeline to a length with nothing in it.

  const clipIds = new Set<string>()
  for (const bucket of Object.values(clips)) for (const clip of bucket) clipIds.add(clip.id)

  const transitions: Transition[] = Array.isArray(document.transitions)
    ? document.transitions
        .map((raw) => readTransition(raw, clipIds))
        .filter((t): t is Transition => t !== null)
    : []

  const rawStage = document.stage
  const stage =
    isPlainObject(rawStage) && isPositiveFinite(rawStage.width) && isPositiveFinite(rawStage.height)
      ? { width: rawStage.width, height: rawStage.height }
      : { ...DEFAULT_STAGE }

  const project: Project = {
    id: typeof document.id === 'string' && document.id.length > 0 ? document.id : 'restored',
    fps: Math.max(1, Math.round(document.fps)),
    stage,
    tracks,
    clips,
    transitions,
    version,
    ...(document.masterVolume === undefined || document.masterVolume === null
      ? {}
      : { masterVolume: toGain(document.masterVolume, 1) }),
  }

  return migrate(project, version)
}

/**
 * Whether {@link readProjectDocument} would accept this document, without the
 * throw. For deciding what to *show*; the restore path should call
 * `readProjectDocument` itself and use what it returns.
 */
export function isReadableProjectDocument(document: unknown): boolean {
  try {
    readProjectDocument(document)
    return true
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

/** Clip types that play from a source file. */
export type MediaClipType = 'video' | 'audio' | 'image'

const MEDIA_CLIP_TYPES: ReadonlySet<string> = new Set<MediaClipType>(['video', 'audio', 'image'])

/**
 * Whether a stored `src` can be fetched again in a *later* session.
 *
 * `blob:` and `data:` URLs are the ones that cannot. They are minted by
 * `URL.createObjectURL` when a user imports a file from their device, they are
 * baked into the clip, and they die with the document that created them — so a
 * project saved with one comes back tomorrow pointing at nothing. Naming that
 * case here is what lets the editor tell the user which clips need their file
 * again instead of showing them a black rectangle and no explanation.
 */
export function isRecoverableMediaSrc(src: string | undefined): src is string {
  if (typeof src !== 'string' || src.length === 0) return false
  if (src.startsWith('blob:') || src.startsWith('data:')) return false
  return true
}

/** A clip whose source file cannot be fetched again. */
export interface MissingMedia {
  clipId: string
  clipName: string
  kind: MediaClipType
}

export interface RelinkMediaResult {
  /**
   * The composition with every resolvable `assetId` pointing at the library.
   * The same object reference as the input when nothing needed changing, so a
   * caller can use identity to tell whether anything moved.
   */
  project: Project
  /** How many clips had their library reference repaired. */
  relinked: number
  /** Clips that came back without a usable source file. Never dropped. */
  missing: MissingMedia[]
}

/**
 * Point restored clips back at the media library.
 *
 * A clip carries both a `src` (what the renderer plays) and an `assetId` (what
 * the timeline reads its filmstrip and intrinsic size from). Only `src`
 * survives a save — the library is rebuilt from scratch on every page load and
 * hands out fresh ids — so a restored clip's `assetId` names an asset that no
 * longer exists. The composition still *plays*, because `resolveTimeline` reads
 * `src` and never `assetId`; what breaks is cosmetic and silent: no filmstrip
 * on the clip, and a selection box that falls back to the whole stage.
 *
 * So the repair is a match on `src` against whatever the library holds. It is
 * pure — the caller decides when to apply it — because the library is filled
 * asynchronously after the composition is already on screen.
 *
 * Clips whose media cannot be recovered at all are reported in `missing` and
 * left exactly where they are, with their name, position and length intact.
 * Dropping them would be the one outcome the user can neither see nor undo.
 */
export function relinkProjectMedia(
  project: Project,
  assets: Iterable<{ id: string; src: string }>,
): RelinkMediaResult {
  const bySrc = new Map<string, string>()
  const knownIds = new Set<string>()
  for (const asset of assets) {
    knownIds.add(asset.id)
    if (!bySrc.has(asset.src)) bySrc.set(asset.src, asset.id)
  }

  const missing: MissingMedia[] = []
  let relinked = 0
  const nextClips: Project['clips'] = {}
  let changed = false

  for (const [trackId, bucket] of Object.entries(project.clips)) {
    let bucketChanged = false
    const nextBucket = bucket.map((clip) => {
      if (!MEDIA_CLIP_TYPES.has(clip.type)) return clip

      if (!isRecoverableMediaSrc(clip.src)) {
        missing.push({
          clipId: clip.id,
          clipName: clip.name,
          kind: clip.type as MediaClipType,
        })
        return clip
      }

      // Already pointing at something real — leave it alone.
      if (clip.assetId !== undefined && knownIds.has(clip.assetId)) return clip

      const assetId = bySrc.get(clip.src)
      if (assetId === undefined || assetId === clip.assetId) return clip

      relinked++
      bucketChanged = true
      return { ...clip, assetId }
    })

    nextClips[trackId] = bucketChanged ? nextBucket : bucket
    if (bucketChanged) changed = true
  }

  return {
    project: changed ? { ...project, clips: nextClips } : project,
    relinked,
    missing,
  }
}

/**
 * One line naming the clips whose media did not come back.
 *
 * Lives here rather than in the editor because the *rule* — name up to two,
 * count the rest — is what keeps the message readable on a project with thirty
 * broken clips, and that rule is worth a test. The caller supplies the frame
 * around it.
 */
export function missingMediaSummary(missing: readonly MissingMedia[]): string | null {
  if (missing.length === 0) return null
  const names = missing.map((m) => m.clipName)
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names[0]}, ${names[1]} and ${names.length - 2} more`
}
