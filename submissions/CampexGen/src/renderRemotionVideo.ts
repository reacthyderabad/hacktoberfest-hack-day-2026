/**
 * Remotion render path.
 *
 * Converts an ElahSpec (extended with Remotion fields) + scene metadata into
 * a CampexVideoProps object, bundles the Remotion entry point, and renders
 * the composition to an MP4 via @remotion/renderer.
 *
 * Called by render.ts when RENDER_ENGINE=remotion is set.
 */
import path from "path";
import { fileURLToPath } from "url";
import { bundle } from "@remotion/bundler";
import {
  renderMedia,
  selectComposition,
  getCompositions,
} from "@remotion/renderer";
import type { ElahSpec } from "./adapter.js";
import type { CampexVideoProps, RemotionScene, AnimationType } from "./remotion/types.js";

// Resolve the Remotion entry point relative to this file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENTRY_POINT = path.join(__dirname, "remotion", "index.tsx");

// Cache the Webpack bundle URL across renders in the same process so
// subsequent renders (edits) are fast.
let _bundleUrl: string | null = null;

async function getBundleUrl(): Promise<string> {
  if (_bundleUrl) return _bundleUrl;
  console.log("[remotion] Bundling composition (first render)…");
  _bundleUrl = await bundle({
    entryPoint: ENTRY_POINT,
    // Map .js imports → .ts/.tsx (ESM convention used by our codebase)
    webpackOverride: (config) => ({
      ...config,
      resolve: {
        ...config.resolve,
        extensionAlias: {
          ".js": [".ts", ".tsx", ".js"],
        },
      },
    }),
  });
  console.log("[remotion] Bundle ready.");
  return _bundleUrl;
}

/**
 * Convert an ElahSpec (produced by adapter.ts) into CampexVideoProps.
 *
 * ElahSpec carries all the data needed:
 *   - clips[].track === "image" with asset === "bg_N"  → bgPath
 *   - clips[].track === "image" with asset !== "bg_N"  → assetPath
 *   - clips[].track === "audio" with asset === "vo_N"  → voicePaths
 *   - clips[].track === "audio" with asset === "music" → musicPath
 *   - clips[].track === "text"                         → headline / subtext
 *   - spec.assets[id]                                  → absolute file paths
 *
 * The per-scene `animation` and `image_prompt` fields are stored in the
 * extended spec fields added by adapter.ts (see remotionMeta).
 */
export function elahSpecToRemotionProps(spec: ElahSpec): CampexVideoProps {
  const { fps, stage, assets, clips } = spec;
  const { width, height } = stage;

  // ── Gather per-scene data ─────────────────────────────────────────────────

  // Find all scene indices from bg_N assets
  const sceneCount = Object.keys(assets).filter((k) => /^bg_\d+$/.test(k)).length;

  const remotionScenes: RemotionScene[] = [];
  const voicePaths: (string | null)[] = [];
  const voiceDurationFrames: number[] = [];

  let cursor = 0; // running frame counter

  for (let i = 1; i <= sceneCount; i++) {
    // Find the background clip for this scene (image track, asset bg_i)
    const bgClip = clips.find(
      (c) => c.track === "image" && c.asset === `bg_${i}`
    );
    if (!bgClip) continue;

    const durationFrames = Math.round(bgClip.duration * fps);
    const startFrame = Math.round(bgClip.start * fps);

    // Find user asset clip for this scene (image track, asset !== bg_N,
    // overlapping this scene's time range)
    const assetClip = clips.find(
      (c) =>
        c.track === "image" &&
        c.asset &&
        !/^bg_\d+$/.test(c.asset) &&
        Math.abs(c.start - bgClip.start) < 0.1
    );

    // Find headline text clip (first text clip starting near this scene)
    const headlineClip = clips.find(
      (c) =>
        c.track === "text" &&
        c.start >= bgClip.start - 0.01 &&
        c.start < bgClip.start + bgClip.duration
    );

    // Find subtext clip (second text clip in same scene window)
    const textClipsInScene = clips.filter(
      (c) =>
        c.track === "text" &&
        c.start >= bgClip.start - 0.01 &&
        c.start < bgClip.start + bgClip.duration
    );
    const subtextClip = textClipsInScene.length > 1 ? textClipsInScene[1] : undefined;

    // Find voiceover audio for this scene
    const voClip = clips.find(
      (c) => c.track === "audio" && c.asset === `vo_${i}`
    );

    // Pull animation and image_prompt from the extended spec meta if present
    // (injected by adapter.ts via remotionMeta array)
    const meta = (spec as ExtendedElahSpec).remotionMeta?.[i - 1];
    const animation: AnimationType = meta?.animation ?? "fade-in";

    voicePaths.push(voClip ? (assets[`vo_${i}`] ?? null) : null);
    voiceDurationFrames.push(
      voClip ? Math.round(voClip.duration * fps) : 0
    );

    remotionScenes.push({
      id: `s${i}`,
      startFrame,
      durationFrames,
      bgPath: assets[`bg_${i}`] ?? "",
      assetPath: assetClip?.asset ? (assets[assetClip.asset] ?? undefined) : undefined,
      headline: headlineClip?.text ?? "",
      subtext: subtextClip?.text,
      animation,
      textColor: headlineClip?.color ?? "#ffffff",
      accentColor: headlineClip?.color ?? "#e94560",
      fontFamily: headlineClip?.fontFamily ?? "Arial",
      isCta: meta?.isCta ?? false,
      imagePrompt: meta?.imagePrompt,
    });

    cursor += durationFrames;
  }

  // ── Music ─────────────────────────────────────────────────────────────────
  const musicClip = clips.find((c) => c.track === "audio" && c.asset === "music");
  const musicPath = musicClip ? (assets["music"] ?? null) : null;
  const musicVolume = musicClip?.volume ?? 0.2;

  return {
    fps,
    width,
    height,
    scenes: remotionScenes,
    musicPath,
    musicVolume,
    voicePaths,
    voiceDurationFrames,
  };
}

// Extended spec type that carries Remotion-specific metadata injected by adapter.ts
export interface RemotionSceneMeta {
  animation: AnimationType;
  isCta: boolean;
  imagePrompt?: string;
}

export interface ExtendedElahSpec extends ElahSpec {
  /** Indexed by scene order (0-based) */
  remotionMeta?: RemotionSceneMeta[];
}

/**
 * Render a CampexVideoProps to an MP4 file at outPath.
 */
export async function renderRemotionVideo(
  spec: ExtendedElahSpec,
  outPath: string,
  jobId: string
): Promise<string> {
  const bundleUrl = await getBundleUrl();
  const props = elahSpecToRemotionProps(spec);

  const totalFrames = props.scenes.reduce(
    (sum, s) => sum + s.durationFrames,
    0
  );

  console.log(
    `[${jobId}][remotion] Selecting composition (${totalFrames} frames @ ${props.fps}fps)…`
  );

  const composition = await selectComposition({
    serveUrl: bundleUrl,
    id: "CampexVideo",
    inputProps: props as Record<string, unknown>,
  });

  // Override duration/size to match actual content
  composition.durationInFrames = totalFrames;
  composition.width = props.width;
  composition.height = props.height;

  console.log(`[${jobId}][remotion] Rendering to ${outPath}…`);

  await renderMedia({
    composition,
    serveUrl: bundleUrl,
    codec: "h264",
    outputLocation: outPath,
    inputProps: props as Record<string, unknown>,
    onProgress: ({ progress }) => {
      const pct = Math.round(progress * 100);
      if (pct % 20 === 0) {
        process.stdout.write(`\r[${jobId}][remotion] ${pct}%  `);
      }
    },
    // Chromium flags for headless server environments
    chromiumOptions: {
      disableWebSecurity: true,
    },
    // Concurrency: use half available CPUs to avoid OOM on small VMs
    concurrency: Math.max(1, Math.floor((os.cpus().length ?? 2) / 2)),
  });

  process.stdout.write("\n");
  console.log(`[${jobId}][remotion] Done → ${outPath}`);
  return outPath;
}

import os from "os";
