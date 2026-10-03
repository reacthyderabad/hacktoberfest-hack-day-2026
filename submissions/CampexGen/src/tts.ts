/**
 * TTS provider — routes to ElevenLabs (free premade voices) with automatic fallback to edge-tts.
 *
 * Priority:
 *   1. ElevenLabs — if ELEVENLABS_API_KEY is configured (using free premade voices like Sarah/Liam)
 *   2. edge-tts    — fallback if ElevenLabs quota is exhausted, errors, or fails
 *
 * Returns the output path and duration in seconds.
 */
import { spawn } from "child_process";
import { existsSync } from "fs";
import ffmpeg from "fluent-ffmpeg";
import {
  elevenlabsAvailable,
  elevenLabsTTS,
} from "./elevenlabs.js";

export type TTSProvider = "elevenlabs" | "edge-tts";

/**
 * Synthesize text to speech.
 * Automatically tries ElevenLabs first (free voices), then falls back to edge-tts.
 *
 * @param text   Text to speak
 * @param voice  Voice name for edge-tts (default: "en-US-AriaNeural")
 * @param outPath Destination audio path (.mp3)
 */
export async function synthesize(
  text: string,
  voice: string = "en-US-AriaNeural",
  outPath: string
): Promise<{ path: string; duration: number; provider: TTSProvider }> {
  // 1. Try ElevenLabs free premade voice
  if (elevenlabsAvailable()) {
    try {
      await elevenLabsTTS(text, outPath);
      const duration = await probeDuration(outPath);
      return { path: outPath, duration, provider: "elevenlabs" };
    } catch (err) {
      console.warn(`[tts] ElevenLabs failed, falling back to edge-tts: ${(err as Error).message}`);
    }
  }

  // 2. Fallback: edge-tts
  await runEdgeTts(text, voice, outPath);
  const duration = await probeDuration(outPath);
  return { path: outPath, duration, provider: "edge-tts" };
}

// ── edge-tts subprocess ──────────────────────────────────────────────────────

function runEdgeTts(text: string, voice: string, outPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("python", [
      "-m", "edge_tts",
      "--voice", voice,
      "--text", text,
      "--write-media", outPath,
    ]);

    const errs: string[] = [];
    proc.stderr.on("data", (d: Buffer) => errs.push(d.toString()));

    proc.on("close", (code) => {
      if (code === 0 && existsSync(outPath)) {
        resolve();
      } else {
        reject(new Error(`edge-tts exited ${code}: ${errs.join("")}`));
      }
    });
    proc.on("error", reject);
  });
}

// ── Shared utilities ────────────────────────────────────────────────────────

export async function probeDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, meta) => {
      if (err) return reject(err);
      resolve(meta.format.duration ?? 0);
    });
  });
}

// Check if any TTS provider is available
export async function ttsAvailable(): Promise<boolean> {
  if (elevenlabsAvailable()) return true;

  return new Promise((resolve) => {
    const proc = spawn("python", ["-m", "edge_tts", "--version"]);
    proc.on("close", (code) => resolve(code === 0));
    proc.on("error", () => resolve(false));
  });
}
