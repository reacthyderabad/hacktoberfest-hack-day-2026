/**
 * Pre-render validation of a VideoArtifact.
 * Returns { ok: true } or { ok: false, errors: string[], repaired?: VideoArtifact }
 * Deterministic repairs are applied in place; remaining errors go back to Gemma.
 */
import type { VideoArtifact } from "./artifact.js";
import { VideoArtifactSchema } from "./artifact.js";

export type ValidationResult =
  | { ok: true; artifact: VideoArtifact }
  | { ok: false; errors: string[]; repaired?: VideoArtifact };

const SUPERLATIVES = /\b(best|#1|number one|guaranteed|award-winning|world's best|unbeatable)\b/i;

// Normalise a string for grounding comparison: lowercase, collapse whitespace
// Keep word chars, digits, dots, slashes, hyphens (URLs need . and /)
function norm(s: string): string {
  return s.toLowerCase().replace(/[^\w./%$#@:-]/g, " ").replace(/\s+/g, " ").trim();
}

// Extract numeric tokens, percentages, prices, dates from text
function extractGroundableTokens(text: string): string[] {
  const matches = text.match(/\d[\d,]*\.?\d*%?|\$[\d,]+|#\d+/g) ?? [];
  // Also extract date-like fragments: "October 10", "Oct 10", "2026-10-10"
  const dates = text.match(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2}\b|\d{4}-\d{2}-\d{2}/gi) ?? [];
  return [...new Set([...matches, ...dates].map((t) => t.toLowerCase().trim()))];
}

function groundingCheck(artifact: VideoArtifact, originalMessage: string): string[] {
  const source = norm(originalMessage);
  const errors: string[] = [];

  const textsToCheck = [
    ...artifact.scenes.flatMap((s) => [
      s.headline,
      s.subtext ?? "",
      s.voiceover ?? "",
    ]),
    ...artifact.campaign.key_facts,
    artifact.campaign.product_name,
  ];

  const allText = textsToCheck.join(" ");
  const tokens = extractGroundableTokens(allText);

  for (const token of tokens) {
    if (!source.includes(norm(token))) {
      errors.push(`Grounding: "${token}" not found in original message`);
    }
  }

  // Check cta_url if present
  if (artifact.campaign.cta_url) {
    const url = artifact.campaign.cta_url.toLowerCase().replace(/https?:\/\//, "");
    if (!source.includes(url)) {
      errors.push(`Grounding: cta_url "${artifact.campaign.cta_url}" not in original message`);
    }
  }

  return errors;
}

function superlativeCheck(artifact: VideoArtifact, originalMessage: string): string[] {
  const errors: string[] = [];
  const allText = artifact.scenes
    .flatMap((s) => [s.headline, s.subtext ?? "", s.voiceover ?? ""])
    .join(" ");

  const match = allText.match(SUPERLATIVES);
  if (match) {
    // Only flag if it's not in the source message
    if (!norm(originalMessage).includes(norm(match[0]))) {
      errors.push(`Unsupported claim: "${match[0]}" not in original message`);
    }
  }
  return errors;
}

// Rescale scene durations to hit a target total while keeping proportions
function rescaleDurations(artifact: VideoArtifact, targetTotal: number): VideoArtifact {
  const currentTotal = artifact.scenes.reduce((s, sc) => s + sc.duration, 0);
  const ratio = targetTotal / currentTotal;
  const scenes = artifact.scenes.map((sc) => ({
    ...sc,
    duration: Math.max(2.5, parseFloat((sc.duration * ratio).toFixed(2))),
  }));
  // Fix rounding: adjust last scene so sum === targetTotal
  const actualSum = scenes.reduce((s, sc) => s + sc.duration, 0);
  scenes[scenes.length - 1].duration = parseFloat(
    (scenes[scenes.length - 1].duration + (targetTotal - actualSum)).toFixed(2)
  );
  return { ...artifact, scenes, duration: targetTotal };
}

export function validate(
  artifact: VideoArtifact,
  assetIds: string[],
  originalMessage: string
): ValidationResult {
  const errors: string[] = [];
  let repaired = { ...artifact, scenes: artifact.scenes.map((s) => ({ ...s })) };

  // 1. Zod parse (already done before calling, but re-check here for safety)
  const parsed = VideoArtifactSchema.safeParse(artifact);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.errors.map((e) => `Schema: ${e.path.join(".")} — ${e.message}`),
    };
  }

  // 2. Scene durations
  const total = repaired.scenes.reduce((s, sc) => s + sc.duration, 0);
  const tooShort = repaired.scenes.filter((s) => s.duration < 2.5);
  const tooLong  = repaired.scenes.filter((s) => s.duration > 8);

  if (tooShort.length || tooLong.length || Math.abs(total - repaired.duration) > 0.5) {
    // Auto-repair: clamp and rescale
    repaired.scenes = repaired.scenes.map((s) => ({
      ...s,
      duration: Math.min(8, Math.max(2.5, s.duration)),
    }));
    const clampedTotal = repaired.scenes.reduce((s, sc) => s + sc.duration, 0);
    if (clampedTotal < 8 || clampedTotal > 45) {
      errors.push(`Duration out of range: ${clampedTotal.toFixed(1)}s (must be 8–45s)`);
    } else {
      repaired.duration = parseFloat(clampedTotal.toFixed(2));
    }
  }

  if (repaired.duration < 8 || repaired.duration > 45) {
    errors.push(`Total duration ${repaired.duration}s out of range 8–45s`);
  }

  // 3. Asset references
  for (const scene of repaired.scenes) {
    if (scene.asset && !assetIds.includes(scene.asset)) {
      // Auto-repair: drop the bad reference
      scene.asset = undefined;
    }
  }

  // 4. Text length
  for (const scene of repaired.scenes) {
    if (scene.headline.split(/\s+/).length > 6) {
      errors.push(`Scene ${scene.id}: headline too long (>6 words): "${scene.headline}"`);
    }
    if (scene.subtext && scene.subtext.split(/\s+/).length > 12) {
      errors.push(`Scene ${scene.id}: subtext too long (>12 words): "${scene.subtext}"`);
    }
  }

  // 5. Required: CTA scene, product name
  const hasCta = repaired.scenes.some((s) => s.purpose === "cta");
  if (!hasCta) errors.push("No scene with purpose 'cta'");
  if (!repaired.campaign.product_name?.trim()) errors.push("Missing product_name");

  // 6. cta_url basic parse
  if (repaired.campaign.cta_url) {
    try {
      const raw = repaired.campaign.cta_url;
      const urlStr = raw.startsWith("http") ? raw : `https://${raw}`;
      new URL(urlStr); // throws if invalid
    } catch {
      // Auto-repair: remove invalid URL
      repaired.campaign = { ...repaired.campaign, cta_url: undefined };
    }
  }

  // 7. Grounding check
  errors.push(...groundingCheck(repaired, originalMessage));

  // 8. Superlative / unsupported claim check
  errors.push(...superlativeCheck(repaired, originalMessage));

  if (errors.length === 0) {
    return { ok: true, artifact: repaired };
  }

  return { ok: false, errors, repaired };
}

// Deterministic "make it N seconds" handler — bypass Gemma for this edit
export function applyDurationEdit(artifact: VideoArtifact, targetSeconds: number): VideoArtifact {
  const clamped = Math.min(45, Math.max(8, targetSeconds));
  return rescaleDurations(artifact, clamped);
}
