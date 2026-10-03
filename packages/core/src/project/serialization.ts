import type { TimelineEngine } from '../editor/TimelineEngine'
import { readProjectDocument } from '../editor/projectDocument'

/**
 * Public persistence facade.
 *
 * `serializeProject` / `deserializeProject` are the documented, published way to
 * save and restore a composition. The validation and repair logic lives in
 * {@link readProjectDocument} (`editor/projectDocument.ts`); this module only
 * keeps the original entry points and error text stable for consumers.
 *
 * One deliberate difference from the pre-`readProjectDocument` behaviour: a
 * document with no `version` stamp is read as version 1 instead of rejected, so
 * projects saved by older builds still open. Documents from a *newer* build
 * throw a `ProjectDocumentError` (`code: 'unsupported-version'`).
 */

/** Snapshot the engine's current project as JSON. The project's own `version` field is the schema version. */
export function serializeProject(engine: TimelineEngine): string {
  return JSON.stringify(engine.getProject())
}

/**
 * Parse and load a previously serialized project into the engine, replacing its
 * current state. Throws `Not valid project JSON: …` on a parse failure and a
 * `ProjectDocumentError` when the document is unreadable or too new; the engine
 * is left untouched in either case.
 */
export function deserializeProject(engine: TimelineEngine, json: string): void {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`Not valid project JSON: ${message}`)
  }

  engine.loadProject(readProjectDocument(parsed))
}
