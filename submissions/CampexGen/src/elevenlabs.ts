/**
 * ElevenLabs API client for TTS.
 *
 * Uses free premade voices that work with free tier API keys:
 * - Sarah:  "EXAVITQu4vr4xnSDxMaL" (mature, reassuring, confident) - DEFAULT
 * - Liam:   "TX3LPaxmHKxFdv7VOQHJ" (energetic, social media creator)
 * - Alice:  "Xb7hH8MSUJpSbSDYk0k2" (clear, engaging educator)
 * - Charlie:"IKne3meq5aSn9XLyUdCD" (deep, confident, energetic)
 */
import { writeFile } from "fs/promises";

const API_BASE = "https://api.elevenlabs.io";

// Default free premade voice ID: Sarah
const DEFAULT_PREMADE_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

function getApiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY not set");
  return key;
}

/** Check if ElevenLabs is configured */
export function elevenlabsAvailable(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

export interface ElevenLabsTTSOptions {
  /** Voice ID (default: Sarah EXAVITQu4vr4xnSDxMaL) */
  voiceId?: string;
  /** Model ID (default: eleven_multilingual_v2) */
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
}

/**
 * Generate speech from text using ElevenLabs TTS.
 */
export async function elevenLabsTTS(
  text: string,
  outPath: string,
  options: ElevenLabsTTSOptions = {}
): Promise<string> {
  const apiKey = getApiKey();
  const voiceId =
    options.voiceId ??
    process.env.ELEVENLABS_VOICE_ID ??
    DEFAULT_PREMADE_VOICE_ID;
  const modelId = options.modelId ?? "eleven_multilingual_v2";

  const url = `${API_BASE}/v1/text-to-speech/${voiceId}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability: options.stability ?? 0.5,
        similarity_boost: options.similarityBoost ?? 0.75,
      },
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${errorText}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(outPath, buf);
  console.log(`[elevenlabs] TTS → ${outPath} (${buf.length} bytes, voice: ${voiceId})`);
  return outPath;
}
