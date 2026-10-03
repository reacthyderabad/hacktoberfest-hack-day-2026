import type { MediaLibrarySnapshotEntry } from '@elah/editor'

/**
 * Where the editor's media library is kept between page loads.
 *
 * IndexedDB rather than `localStorage`, for two reasons. Thumbnails are base64
 * JPEG strings — roughly 40 KB per video asset — and the composition itself
 * already lives in `localStorage` under `myeditor-local-project`; a library of
 * any size would push that origin toward its ~5 MB budget, and the failure mode
 * is `writeLocalProject` silently returning false, i.e. losing the user's
 * *timeline* to save its thumbnails. IndexedDB also structured-clones, so a
 * waveform survives as a `Float32Array` instead of being flattened into JSON.
 *
 * Every operation resolves rather than throws. A browser in private mode, with
 * storage blocked, or over quota, loses filmstrips — which is what it had
 * before this existed — and must not lose anything else. Nothing here is
 * load-bearing for playback: a clip plays from its own `src`.
 */

const DB_NAME = 'elah-editor-media-library'
const STORE_NAME = 'snapshots'

/**
 * Which library a snapshot belongs to. `'local'` is the standalone `/editor`,
 * whose composition lives in `localStorage`; a project-backed editor gets its
 * own, because its Assets panel is that project's media and nobody else's.
 */
export type MediaLibraryScope = 'local' | `project:${string}`

/**
 * The storage key for the media library snapshot.
 */
export function scopedKey(scope: MediaLibraryScope): string | null {
  return `elah:${encodeURIComponent(scope)}`
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open local media storage.'))
  })
}

async function transact<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase()
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, mode)
      const request = run(transaction.objectStore(STORE_NAME))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('Local media storage failed.'))
      transaction.onabort = () =>
        reject(transaction.error ?? new Error('Local media storage was aborted.'))
    })
  } finally {
    db.close()
  }
}

/** True when this environment can store anything at all (not SSR, not blocked). */
function available(): boolean {
  return typeof indexedDB !== 'undefined'
}

export async function readMediaLibrarySnapshot(
  scope: MediaLibraryScope,
): Promise<MediaLibrarySnapshotEntry[] | null> {
  const key = scopedKey(scope)
  if (key === null || !available()) return null
  try {
    const value = await transact<unknown>('readonly', (store) => store.get(key) as IDBRequest<unknown>)
    return Array.isArray(value) ? (value as MediaLibrarySnapshotEntry[]) : null
  } catch {
    return null
  }
}

/** @returns whether the snapshot was actually stored. */
export async function writeMediaLibrarySnapshot(
  scope: MediaLibraryScope,
  entries: readonly MediaLibrarySnapshotEntry[],
): Promise<boolean> {
  const key = scopedKey(scope)
  if (key === null || !available()) return false
  try {
    // Structured clone refuses a proxy or a live class instance; the entries are
    // plain objects, but `.slice()` also detaches them from the store's state so
    // a later mutation cannot race the write.
    await transact('readwrite', (store) => store.put(entries.slice(), key))
    return true
  } catch {
    return false
  }
}

export async function deleteMediaLibrarySnapshot(scope: MediaLibraryScope): Promise<void> {
  const key = scopedKey(scope)
  if (key === null || !available()) return
  try {
    await transact('readwrite', (store) => store.delete(key))
  } catch {
    // Nothing to report: a snapshot that could not be deleted is stale data,
    // and hydrate already refuses to overwrite anything live.
  }
}
