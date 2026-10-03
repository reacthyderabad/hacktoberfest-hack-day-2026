/**
 * Per-chat state. In-memory for the MVP; persisted to a JSON sidecar on every write.
 * ponytail: no database — a JSON file per chat is sufficient for the demo scale.
 *           Ceiling: shared state across multiple bot replicas. Upgrade path: Redis.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import type { VideoArtifact } from "./artifact.js";

export interface ChatState {
  chatId: number;
  campaignText: string;
  // id → absolute path on disk
  assets: Record<string, string>;
  artifact: VideoArtifact | null;
  version: number;
  lastJobDir: string | null;
}

const WORK_ROOT = path.resolve("work");

// ponytail: Map is sufficient; no LRU needed for a demo
const cache = new Map<number, ChatState>();

function stateFile(chatId: number): string {
  return path.join(WORK_ROOT, String(chatId), "state.json");
}

export function getState(chatId: number): ChatState {
  if (cache.has(chatId)) return cache.get(chatId)!;

  const file = stateFile(chatId);
  if (existsSync(file)) {
    const loaded = JSON.parse(readFileSync(file, "utf8")) as ChatState;
    cache.set(chatId, loaded);
    return loaded;
  }

  const fresh: ChatState = {
    chatId,
    campaignText: "",
    assets: {},
    artifact: null,
    version: 0,
    lastJobDir: null,
  };
  cache.set(chatId, fresh);
  return fresh;
}

export function saveState(state: ChatState): void {
  cache.set(state.chatId, state);
  const file = stateFile(state.chatId);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(state, null, 2));
}

export function newJobDir(chatId: number): string {
  const jobId = Date.now().toString(36);
  const dir = path.join(WORK_ROOT, String(chatId), jobId);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function jobId(jobDir: string): string {
  return path.basename(jobDir);
}
