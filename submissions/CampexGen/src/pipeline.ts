/**
 * Full pipeline: campaignText + assets → MP4 path.
 * Shared by new campaigns and edits; bot.ts calls this.
 */
import { writeFile } from "fs/promises";
import path from "path";
import { createLLM } from "./gemma.js";
import {
  buildSystemPrompt,
  buildUserPrompt,
  buildEditSystemPrompt,
  buildEditPrompt,
} from "./prompts.js";
import { VideoArtifactSchema, type VideoArtifact } from "./artifact.js";
import { validate, applyDurationEdit } from "./validate.js";
import { buildSpec } from "./adapter.js";
import { render } from "./render.js";
import { verifyMp4 } from "./verify.js";
import { stageForRatio } from "./backgrounds.js";
import { getState, saveState, newJobDir, jobId } from "./store.js";

const llm = createLLM();
const MAX_RETRIES = 2;

// ── Helpers ───────────────────────────────────────────────────────────────────

function assetDescriptions(assets: Record<string, string>): Record<string, string> {
  // For the prompt: just use filename as description (images arrive without captions)
  return Object.fromEntries(
    Object.entries(assets).map(([id, p]) => [id, path.basename(p)])
  );
}

async function generateArtifact(
  campaignText: string,
  assets: Record<string, string>,
  images: Buffer[]
): Promise<VideoArtifact> {
  let lastError = "";

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const system = buildSystemPrompt() + (lastError ? `\n\nPrevious attempt failed:\n${lastError}\nPlease fix these issues.` : "");
    const user = buildUserPrompt(campaignText, assetDescriptions(assets));

    const raw = await llm.generateJSON(system, user, {}, images);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      lastError = `Invalid JSON: ${raw.slice(0, 200)}`;
      continue;
    }

    const result = VideoArtifactSchema.safeParse(parsed);
    if (!result.success) {
      lastError = result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
      continue;
    }

    const validation = validate(result.data, Object.keys(assets), campaignText);
    if (validation.ok) return validation.artifact;

    // Use the repaired artifact if it only has grounding errors (non-auto-repairable)
    lastError = validation.errors.join("; ");
    if (validation.repaired) {
      const recheck = validate(validation.repaired, Object.keys(assets), campaignText);
      if (recheck.ok) return recheck.artifact;
      lastError = recheck.errors.join("; ");
    }
  }

  throw new Error(`Artifact generation failed after ${MAX_RETRIES + 1} attempts: ${lastError}`);
}

async function editArtifact(
  current: VideoArtifact,
  feedback: string,
  assets: Record<string, string>,
  campaignText: string
): Promise<VideoArtifact> {
  // Deterministic duration edit — skip LLM
  const durationMatch = feedback.match(/make\s+it\s+(\d+)\s+s(ec(?:ond)?s?)?/i);
  if (durationMatch) {
    const seconds = parseInt(durationMatch[1], 10);
    const repaired = applyDurationEdit(current, seconds);
    const v = validate(repaired, Object.keys(assets), campaignText);
    return v.ok ? v.artifact : repaired;
  }

  let lastError = "";
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const system = buildEditSystemPrompt() + (lastError ? `\nFix: ${lastError}` : "");
    const user = buildEditPrompt(current, feedback);

    const raw = await llm.generateJSON(system, user, {});
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      lastError = "Invalid JSON";
      continue;
    }

    const result = VideoArtifactSchema.safeParse(parsed);
    if (!result.success) {
      lastError = result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
      continue;
    }

    const validation = validate(result.data, Object.keys(assets), campaignText);
    if (validation.ok) return validation.artifact;
    lastError = validation.errors.join("; ");
  }

  throw new Error(`Edit failed: ${lastError}`);
}

// ── Main pipeline entry points ────────────────────────────────────────────────

export interface PipelineResult {
  mp4Path: string;
  artifact: VideoArtifact;
  jobDir: string;
  totalDuration: number;
}

export async function runNewCampaign(
  chatId: number,
  campaignText: string,
  assetPaths: Record<string, string>, // id → absolute path
  imageBuffers: Buffer[]
): Promise<PipelineResult> {
  const jobDir = newJobDir(chatId);
  const jid = jobId(jobDir);

  console.log(`[${jid}] New campaign for chat ${chatId}`);

  const artifact = await generateArtifact(campaignText, assetPaths, imageBuffers);
  await writeFile(path.join(jobDir, "artifact.json"), JSON.stringify(artifact, null, 2));
  console.log(`[${jid}] Artifact generated: ${artifact.scenes.length} scenes`);

  const { spec, totalDuration } = await buildSpec(artifact, assetPaths, jobDir);
  console.log(`[${jid}] Spec built, total ${totalDuration.toFixed(1)}s`);

  const mp4Path = await render(spec, jobDir, jid);
  console.log(`[${jid}] Rendered → ${mp4Path}`);

  const stage = stageForRatio(artifact.aspect_ratio);
  const expectAudio = artifact.voiceover.enabled || artifact.music.enabled;
  const verifyResult = await verifyMp4(mp4Path, stage.width, stage.height, totalDuration, expectAudio);

  if (!verifyResult.ok) {
    console.warn(`[${jid}] Post-render verification failed: ${verifyResult.errors.join(", ")} — retrying once`);
    const mp4Path2 = await render(spec, jobDir, `${jid}_r2`);
    const v2 = await verifyMp4(mp4Path2, stage.width, stage.height, totalDuration, expectAudio);
    if (!v2.ok) {
      throw new Error(`Render verification failed: ${v2.errors.join(", ")}`);
    }
    return { mp4Path: mp4Path2, artifact, jobDir, totalDuration };
  }

  // Persist state
  const state = getState(chatId);
  state.campaignText = campaignText;
  state.assets = assetPaths;
  state.artifact = artifact;
  state.version = 1;
  state.lastJobDir = jobDir;
  saveState(state);

  return { mp4Path, artifact, jobDir, totalDuration };
}

export async function runEdit(
  chatId: number,
  feedback: string
): Promise<PipelineResult> {
  const state = getState(chatId);
  if (!state.artifact) throw new Error("No existing campaign to edit. Send a campaign first.");

  const jobDir = newJobDir(chatId);
  const jid = jobId(jobDir);

  console.log(`[${jid}] Edit for chat ${chatId}: "${feedback}"`);

  const artifact = await editArtifact(
    state.artifact,
    feedback,
    state.assets,
    state.campaignText
  );
  await writeFile(path.join(jobDir, "artifact.json"), JSON.stringify(artifact, null, 2));

  const { spec, totalDuration } = await buildSpec(artifact, state.assets, jobDir);
  const mp4Path = await render(spec, jobDir, jid);
  console.log(`[${jid}] Re-rendered → ${mp4Path}`);

  const stage = stageForRatio(artifact.aspect_ratio);
  const expectAudio = artifact.voiceover.enabled || artifact.music.enabled;
  const verifyResult = await verifyMp4(mp4Path, stage.width, stage.height, totalDuration, expectAudio);
  if (!verifyResult.ok) {
    throw new Error(`Re-render verification failed: ${verifyResult.errors.join(", ")}`);
  }

  state.artifact = artifact;
  state.version += 1;
  state.lastJobDir = jobDir;
  saveState(state);

  return { mp4Path, artifact, jobDir, totalDuration };
}

// Classify whether a message is an edit to an existing campaign
// ponytail: heuristic — short imperative sentence with edit verbs, no campaign content
export function isEditMessage(text: string, hasExistingArtifact: boolean): boolean {
  if (!hasExistingArtifact) return false;
  const t = text.trim();
  const wordCount = t.split(/\s+/).length;

  // Long messages are always new campaigns
  if (wordCount > 15) return false;

  // If the message looks like campaign content, it's NOT an edit
  // Campaign signals: URLs, prices, percentages, "sale", "introducing", "available"
  const campaignSignals = /\b(https?:|\.com|\.co|\.io|\$\d|%\s*off|sale|introducing|available|announcing|pre-?order|buy\s+now|shop\s+(at|now))\b/i;
  if (campaignSignals.test(t)) return false;

  // Short message with edit-like verbs → edit
  // Note: "use" removed — too ambiguous (matches "Use code XYZ" in campaign text)
  const editKeywords = /\b(make|change|update|remove|add|more|less|shorter|longer|faster|slower|seconds?|sec|swap|replace|delete|reduce|increase|switch|redo|try|set)\b/i;
  return editKeywords.test(t);
}
