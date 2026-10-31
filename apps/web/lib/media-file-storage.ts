/**
 * Local IndexedDB binary storage for media files (Video, Audio, Images).
 *
 * Allows locally imported files in the Open Source editor to persist across
 * browser refreshes without requiring external cloud storage.
 */

const DB_NAME = 'elah-media-files'
const STORE_NAME = 'media_blobs'
const DB_VERSION = 1

export interface StoredMediaRecord {
  id: string
  blob: Blob
  name?: string
  type?: string
  savedAt: number
}

function isAvailable(): boolean {
  return typeof indexedDB !== 'undefined'
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isAvailable()) {
      return reject(new Error('IndexedDB is not available in this environment.'))
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(request.error ?? new Error('Failed to open local media file database.'))
  })
}

async function transact<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode)
      const req = run(tx.objectStore(STORE_NAME))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error ?? new Error('IndexedDB transaction failed.'))
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted.'))
    })
  } finally {
    db.close()
  }
}

/**
 * Save a media Blob / File to IndexedDB keyed by its assetId.
 */
export async function saveMediaBlob(
  assetId: string,
  blob: Blob,
  metadata?: { name?: string; type?: string },
): Promise<void> {
  if (!isAvailable() || !assetId || !blob) return
  try {
    const record: StoredMediaRecord = {
      id: assetId,
      blob,
      name: metadata?.name,
      type: metadata?.type || blob.type,
      savedAt: Date.now(),
    }
    await transact('readwrite', (store) => store.put(record))
  } catch (err) {
    console.warn(`[media-file-storage] Failed to persist file for asset "${assetId}":`, err)
  }
}

/**
 * Retrieve a stored media Blob by its assetId.
 */
export async function getMediaBlob(assetId: string): Promise<Blob | null> {
  if (!isAvailable() || !assetId) return null
  try {
    const record = await transact<StoredMediaRecord | undefined>('readonly', (store) =>
      store.get(assetId),
    )
    return record?.blob ?? null
  } catch {
    return null
  }
}

/**
 * Retrieve a stored media record (including blob, name, type) by its assetId.
 */
export async function getMediaRecord(assetId: string): Promise<StoredMediaRecord | null> {
  if (!isAvailable() || !assetId) return null
  try {
    const record = await transact<StoredMediaRecord | undefined>('readonly', (store) =>
      store.get(assetId),
    )
    return record ?? null
  } catch {
    return null
  }
}

/**
 * Delete a media Blob from IndexedDB.
 */
export async function deleteMediaBlob(assetId: string): Promise<void> {
  if (!isAvailable() || !assetId) return
  try {
    await transact('readwrite', (store) => store.delete(assetId))
  } catch (err) {
    console.warn(`[media-file-storage] Failed to delete file for asset "${assetId}":`, err)
  }
}

/**
 * List all asset IDs currently stored in IndexedDB.
 */
export async function getAllStoredMediaIds(): Promise<string[]> {
  if (!isAvailable()) return []
  try {
    const keys = await transact<IDBValidKey[]>('readonly', (store) => store.getAllKeys())
    return keys.map((k) => String(k))
  } catch {
    return []
  }
}
