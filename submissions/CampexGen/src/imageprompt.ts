/**
 * Gemma-powered per-scene image prompt generator.
 *
 * For each scene in a VideoArtifact, generates a rich Stable Diffusion /
 * DALL-E / Imagen-style text prompt that can be fed to any image generation
 * API. The prompt is also stored as `scene.image_prompt` so it is persisted
 * in artifact.json and visible in spec.json for debugging.
 *
 * The function calls the LLM once per scene (parallelised). Each call is
 * cheap (< 200 tokens output) so latency is acceptable.
 */
import { createLLM } from "./gemma.js";
import type { VideoArtifact, Scene } from "./artifact.js";

const llm = createLLM();

// ── Mood → visual style keywords ─────────────────────────────────────────────
const MOOD_STYLE: Record<string, string> = {
  energetic:
    "vibrant colors, dynamic lighting, high contrast, bold composition, editorial photography style",
  calm:
    "soft diffused light, pastel tones, minimalist composition, serene atmosphere, fine-art photography",
  premium:
    "cinematic lighting, dark elegant tones, luxury aesthetic, sharp details, editorial commercial photography",
  playful:
    "bright saturated colors, fun patterns, pop-art inspired, cheerful atmosphere, modern illustration style",
};

// ── Purpose → scene mood/framing keywords ─────────────────────────────────────
const PURPOSE_FRAME: Record<string, string> = {
  hook:     "attention-grabbing hero shot, wide angle, dramatic",
  product:  "product hero shot, studio lighting, clean background, sharp focus on subject",
  benefit:  "lifestyle photography showing the benefit in use, natural light, aspirational",
  info:     "clean informational background, subtle texture, supporting visual",
  urgency:  "high-energy, bright warm tones, sense of motion and urgency",
  cta:      "bold clear background, call-to-action energy, brand colors dominant",
  offer:    "deal/sale energy, bold graphic elements, price-tag visual language",
  discount: "flash-sale aesthetic, bold numbers, high-energy retail style",
};

/**
 * Build the system prompt for image prompt generation.
 */
function imagePromptSystemPrompt(): string {
  return `You are a professional creative director specialising in AI image generation for marketing videos.

Your task: Given a single video scene's details, write ONE detailed image generation prompt.

Rules:
- Output ONLY the image prompt text — no JSON, no labels, no explanation.
- The prompt must be 40–80 words.
- Start with the primary visual subject, then add lighting, color, style, and mood.
- Never mention text overlays, logos, or UI elements — the background image sits behind them.
- Avoid generic filler words like "beautiful", "amazing", "stunning". Be specific and visual.
- Do NOT output any thinking blocks, code fences, or extra prose. Just the prompt.`;
}

/**
 * Build the user message for a single scene.
 */
function sceneToUserMessage(
  scene: Scene,
  artifact: VideoArtifact
): string {
  const mood = MOOD_STYLE[artifact.style.mood] ?? MOOD_STYLE.energetic;
  const frame = PURPOSE_FRAME[scene.purpose] ?? "supporting background, abstract";
  const palette = artifact.style.palette;

  return `Product: ${artifact.campaign.product_name}
Campaign type: ${artifact.campaign.type}
Scene purpose: ${scene.purpose}
Headline: "${scene.headline}"
${scene.subtext ? `Subtext: "${scene.subtext}"` : ""}
Mood: ${artifact.style.mood}
Brand palette: background ${palette.bg1} to ${palette.bg2}, accent ${palette.accent}

Style direction: ${mood}
Scene framing: ${frame}

Generate the background image prompt for this scene:`;
}

/**
 * Generate an image prompt for a single scene.
 * Returns the raw prompt string.
 */
export async function generateSceneImagePrompt(
  scene: Scene,
  artifact: VideoArtifact
): Promise<string> {
  const system = imagePromptSystemPrompt();
  const user = sceneToUserMessage(scene, artifact);

  try {
    // generateJSON strips code fences; for plain text we use the same call
    // since the output has no JSON wrapper — strip any stray JSON braces.
    let raw = await llm.generateJSON(system, user, {});
    // Remove any { } the model accidentally wraps it in
    raw = raw.replace(/^\s*\{[\s\S]*?\}\s*$/, raw).trim();
    // Strip quotes if the model wraps the whole thing in "..."
    if (raw.startsWith('"') && raw.endsWith('"')) {
      raw = raw.slice(1, -1);
    }
    return raw || fallbackPrompt(scene, artifact);
  } catch (err) {
    console.warn(
      `[imageprompt] LLM call failed for scene ${scene.id}: ${(err as Error).message}`
    );
    return fallbackPrompt(scene, artifact);
  }
}

/**
 * Deterministic fallback prompt if LLM call fails.
 */
function fallbackPrompt(scene: Scene, artifact: VideoArtifact): string {
  const mood = MOOD_STYLE[artifact.style.mood] ?? MOOD_STYLE.energetic;
  const frame = PURPOSE_FRAME[scene.purpose] ?? "supporting background, abstract";
  return (
    `${artifact.campaign.product_name} marketing background, ` +
    `${frame}, ${mood}, ` +
    `color palette ${artifact.style.palette.bg1} to ${artifact.style.palette.bg2}, ` +
    `professional commercial photography, 4K`
  );
}

/**
 * Generate image prompts for ALL scenes in parallel.
 * Returns a new VideoArtifact with image_prompt filled in on every scene.
 */
export async function enrichArtifactWithImagePrompts(
  artifact: VideoArtifact
): Promise<VideoArtifact> {
  const prompts = await Promise.all(
    artifact.scenes.map((scene) => generateSceneImagePrompt(scene, artifact))
  );

  const enrichedScenes = artifact.scenes.map((scene, i) => ({
    ...scene,
    image_prompt: prompts[i],
  }));

  return { ...artifact, scenes: enrichedScenes };
}
