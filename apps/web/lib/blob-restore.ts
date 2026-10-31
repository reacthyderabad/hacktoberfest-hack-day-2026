/**
 * The decision half of the IndexedDB blob lifecycle on reload.
 *
 * Every imported file's bytes are kept in IndexedDB so a refresh can mint a
 * fresh object URL for it. Without a rule for which of them to bring back, a
 * deleted asset returns on every reload and storage only ever grows. The rule:
 * a stored blob is *wanted* when the library snapshot or a restored clip still
 * points at it; anything else is garbage and is purged.
 *
 * Pure so vitest can hold it still; `LocalProjectBridge` does the I/O.
 *
 * Duplicate ids in `storedIds` are collapsed, keeping first-seen order, so a
 * blob is never restored (and given an object URL) twice.
 */
/**
 * How long a freshly stored blob is protected from the purge.
 *
 * The library snapshot is written on a debounce, so between importing a file
 * and the snapshot landing there is a window where the bytes are in IndexedDB
 * but nothing references them yet. A reload inside that window would otherwise
 * see the blob as garbage and delete the user's import. One minute is far wider
 * than the debounce and still bounds how long true garbage can linger — it is
 * collected on the next load.
 */
export const PURGE_GRACE_MS = 60_000

/**
 * Whether an unreferenced stored blob is old enough to delete.
 *
 * A record with no usable `savedAt` is treated as collectable: it predates the
 * field, nothing points at it, and there is no age to protect.
 */
export function isPurgeable(
  savedAt: number | undefined,
  now: number,
  graceMs: number = PURGE_GRACE_MS,
): boolean {
  if (typeof savedAt !== 'number' || !Number.isFinite(savedAt)) return true
  return now - savedAt > graceMs
}

export function planBlobRestore(
  storedIds: string[],
  wantedIds: Set<string>,
): { restore: string[]; purge: string[] } {
  const restore: string[] = []
  const purge: string[] = []
  const seen = new Set<string>()
  for (const id of storedIds) {
    if (seen.has(id)) continue
    seen.add(id)
    if (wantedIds.has(id)) restore.push(id)
    else purge.push(id)
  }
  return { restore, purge }
}
