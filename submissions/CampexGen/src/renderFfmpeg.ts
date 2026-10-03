/**
 * FFmpeg-based video renderer.
 *
 * Composes per-scene background images, typography (Montserrat / Inter),
 * dynamic screen transitions (xfade slideleft/smoothleft/fade), voiceover audio,
 * and background music into an MP4.
 */
import { spawn } from "child_process";
import path from "path";
import { existsSync } from "fs";
import type { ElahSpec } from "./adapter.js";

interface SceneInfo {
  bgPath: string;
  userAssetPath?: string;
  headline: string;
  subtext?: string;
  start: number;
  duration: number;
  fontSize: number;
  subtextFontSize: number;
  textColor: string;
  fontFamily: string;
  voicePath: string | null;
  voiceDuration: number;
}

// ── Typography resolution ───────────────────────────────────────────────────

function getHeadlineFont(): string {
  const local = path.join(process.cwd(), "assets", "fonts", "Montserrat-ExtraBold.ttf");
  if (existsSync(local)) {
    return local.replace(/\\/g, "/").replace(/^[A-Za-z]:/, "");
  }
  return process.platform === "win32"
    ? "/Windows/Fonts/arialbd.ttf"
    : "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
}

function getSubtextFont(): string {
  const local = path.join(process.cwd(), "assets", "fonts", "Inter-SemiBold.ttf");
  if (existsSync(local)) {
    return local.replace(/\\/g, "/").replace(/^[A-Za-z]:/, "");
  }
  return process.platform === "win32"
    ? "/Windows/Fonts/arial.ttf"
    : "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
}

// ── Text utilities ──────────────────────────────────────────────────────────

function wrapText(text: string, maxCharsPerLine = 20): string {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (!currentLine) {
      currentLine = word;
    } else if ((currentLine + " " + word).length <= maxCharsPerLine) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.join("\n");
}

function escapeText(text: string): string {
  return text
    .replace(/\\/g, "\\\\\\\\")
    .replace(/'/g, "\\'")
    .replace(/:/g, "\\:");
}

function hexToFfmpeg(hex: string): string {
  if (!hex.startsWith("#")) return hex;
  return hex.replace("#", "0x");
}

// ── Scene extraction ────────────────────────────────────────────────────────

function extractScenes(spec: ElahSpec): SceneInfo[] {
  const { clips, assets } = spec;
  const scenes: SceneInfo[] = [];

  const bgClips = clips
    .filter((c) => c.track === "image" && c.asset && /^bg_\d+$/.test(c.asset))
    .sort((a, b) => a.start - b.start);

  for (const bgClip of bgClips) {
    const idx = bgClip.asset!.replace("bg_", "");
    const bgPath = assets[bgClip.asset!];

    const userAssetClip = clips.find(
      (c) =>
        c.track === "image" &&
        c.asset &&
        !/^bg_\d+$/.test(c.asset) &&
        c.start >= bgClip.start - 0.01 &&
        c.start < bgClip.start + bgClip.duration
    );
    const userAssetPath = userAssetClip?.asset ? assets[userAssetClip.asset] : undefined;

    const textClips = clips.filter(
      (c) =>
        c.track === "text" &&
        c.start >= bgClip.start - 0.01 &&
        c.start < bgClip.start + bgClip.duration
    );

    const headlineClip = textClips[0];
    const subtextClip = textClips.length > 1 ? textClips[1] : undefined;

    const voClip = clips.find(
      (c) => c.track === "audio" && c.asset === `vo_${idx}`
    );

    scenes.push({
      bgPath,
      userAssetPath,
      headline: headlineClip?.text ?? "",
      subtext: subtextClip?.text,
      start: bgClip.start,
      duration: bgClip.duration,
      fontSize: headlineClip?.fontSize ?? 76,
      subtextFontSize: subtextClip?.fontSize ?? 38,
      textColor: headlineClip?.color ?? "#ffffff",
      fontFamily: headlineClip?.fontFamily ?? "Montserrat",
      voicePath: voClip ? assets[`vo_${idx}`] ?? null : null,
      voiceDuration: voClip?.duration ?? 0,
    });
  }

  return scenes;
}

// ── Main render function ───────────────────────────────────────────────────

export async function renderWithFfmpeg(
  spec: ElahSpec,
  outPath: string,
  jobId: string
): Promise<string> {
  const { fps, stage, assets, clips } = spec;
  const { width, height } = stage;
  const scenes = extractScenes(spec);

  if (scenes.length === 0) {
    throw new Error("No scenes found in spec");
  }

  // Transition parameters
  const TRANSITION_DURATION = scenes.length > 1 ? 0.45 : 0; // 450ms smooth transition
  const TRANSITION_TYPES = ["slideleft", "smoothleft", "fade", "slideright", "wipeleft"];

  // Compute total duration taking into account transition overlap
  const totalDuration =
    scenes.reduce((sum, s) => sum + s.duration, 0) -
    (scenes.length - 1) * TRANSITION_DURATION;

  // Music clip
  const musicClip = clips.find(
    (c) => c.track === "audio" && c.asset === "music"
  );
  const musicPath = musicClip ? assets["music"] ?? null : null;
  const musicVolume = musicClip?.volume ?? 0.2;

  const args: string[] = ["-y"];

  // ── Inputs: Scene backgrounds ──────────────────────────────────────────
  for (let i = 0; i < scenes.length; i++) {
    args.push(
      "-loop", "1",
      "-t", scenes[i].duration.toFixed(3),
      "-i", scenes[i].bgPath
    );
  }

  // ── Inputs: User uploaded assets ───────────────────────────────────────
  const userAssetInputIndices: (number | null)[] = [];
  let inputIdx = scenes.length;
  for (const scene of scenes) {
    if (scene.userAssetPath) {
      args.push("-loop", "1", "-t", scene.duration.toFixed(3), "-i", scene.userAssetPath);
      userAssetInputIndices.push(inputIdx++);
    } else {
      userAssetInputIndices.push(null);
    }
  }

  // ── Inputs: Voiceover audio files ──────────────────────────────────────
  const voiceInputIndices: (number | null)[] = [];
  for (const scene of scenes) {
    if (scene.voicePath) {
      args.push("-i", scene.voicePath);
      voiceInputIndices.push(inputIdx++);
    } else {
      voiceInputIndices.push(null);
    }
  }

  // ── Input: Background music ────────────────────────────────────────────
  let musicInputIdx: number | null = null;
  if (musicPath) {
    args.push("-i", musicPath);
    musicInputIdx = inputIdx++;
  }

  // ── Build Filtergraph ──────────────────────────────────────────────────
  const filters: string[] = [];
  const headlineFont = getHeadlineFont();
  const subtextFont = getSubtextFont();
  const scaleRatio = width / 1080;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const label = `scene${i}`;

    // 1. Scale & crop background to fill screen perfectly
    filters.push(
      `[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,fps=${fps}[bg${i}]`
    );

    // 2. High-contrast gradient overlay (vignette/dim) for punchy text legibility
    filters.push(
      `[bg${i}]drawbox=c=black@0.42:t=fill[dark${i}]`
    );

    let currentLayer = `dark${i}`;

    // 3. User image overlay if present
    const userAssetIdx = userAssetInputIndices[i];
    if (userAssetIdx !== null) {
      const targetW = Math.round(width * 0.72);
      filters.push(
        `[${userAssetIdx}:v]scale=${targetW}:-1:force_original_aspect_ratio=decrease[uimg${i}]`
      );
      filters.push(
        `[${currentLayer}][uimg${i}]overlay=(W-w)/2:h*0.22:enable='gte(t,0.1)'[comp${i}]`
      );
      currentLayer = `comp${i}`;
    }

    // 4. Headline Typography (Montserrat ExtraBold) with drop shadow and fade-in
    const wrappedHeadline = wrapText(scene.headline.toUpperCase(), 18);
    const escapedHeadline = escapeText(wrappedHeadline);
    const textColor = hexToFfmpeg(scene.textColor);
    const headlineFontSize = Math.max(42, Math.round(scene.fontSize * scaleRatio));

    const headlineY = scene.subtext
      ? (userAssetIdx !== null ? `h*0.62` : `(h-text_h)/2 - 35`)
      : (userAssetIdx !== null ? `h*0.70` : `(h-text_h)/2`);

    filters.push(
      `[${currentLayer}]drawtext=fontfile='${headlineFont}':text='${escapedHeadline}':expansion=none:fontsize=${headlineFontSize}:fontcolor=${textColor}:line_spacing=14:shadowcolor=black@0.85:shadowx=4:shadowy=4:x=(w-text_w)/2:y=${headlineY}:enable='gte(t,0.15)':alpha='if(lt(t,0.5),(t-0.15)/0.35,1)'[hl${i}]`
    );
    currentLayer = `hl${i}`;

    // 5. Subtext Typography (Inter SemiBold) with subtle shadow and secondary fade-in
    if (scene.subtext) {
      const wrappedSubtext = wrapText(scene.subtext, 26);
      const escapedSubtext = escapeText(wrappedSubtext);
      const subFontSize = Math.max(24, Math.round(scene.subtextFontSize * scaleRatio));
      const subtextY = userAssetIdx !== null ? `h*0.78` : `(h-text_h)/2 + 75`;

      filters.push(
        `[${currentLayer}]drawtext=fontfile='${subtextFont}':text='${escapedSubtext}':expansion=none:fontsize=${subFontSize}:fontcolor=0xffffff@0.94:line_spacing=10:shadowcolor=black@0.75:shadowx=3:shadowy=3:x=(w-text_w)/2:y=${subtextY}:enable='gte(t,0.25)':alpha='if(lt(t,0.6),(t-0.25)/0.35,1)'[${label}]`
      );
    } else {
      filters.push(`[${currentLayer}]copy[${label}]`);
    }
  }

  // ── Screen Transitions (xfade) between scenes ──────────────────────────
  if (scenes.length === 1) {
    filters.push(`[scene0]copy[video]`);
  } else {
    let lastStream = "scene0";
    let currentOffset = scenes[0].duration - TRANSITION_DURATION;

    for (let i = 1; i < scenes.length; i++) {
      const transType = TRANSITION_TYPES[(i - 1) % TRANSITION_TYPES.length];
      const outLabel = (i === scenes.length - 1) ? "video" : `xf${i}`;
      filters.push(
        `[${lastStream}][scene${i}]xfade=transition=${transType}:duration=${TRANSITION_DURATION}:offset=${currentOffset.toFixed(3)}[${outLabel}]`
      );
      lastStream = outLabel;
      currentOffset += scenes[i].duration - TRANSITION_DURATION;
    }
  }

  // ── Audio mixing with transition compensation ──────────────────────────
  const audioStreams: string[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const vi = voiceInputIndices[i];
    if (vi !== null) {
      // Calculate scene start time taking into account xfade overlap
      const visualStartTime =
        i === 0
          ? 0.1
          : scenes.slice(0, i).reduce((sum, s) => sum + s.duration, 0) -
            i * TRANSITION_DURATION + 0.1;
      const delayMs = Math.round(visualStartTime * 1000);

      filters.push(
        `[${vi}:a]adelay=${delayMs}|${delayMs},apad[vo${i}]`
      );
      audioStreams.push(`[vo${i}]`);
    }
  }

  // Background music track
  if (musicInputIdx !== null) {
    filters.push(
      `[${musicInputIdx}:a]atrim=0:${totalDuration.toFixed(3)},volume=${musicVolume},apad[bgm]`
    );
    audioStreams.push(`[bgm]`);
  }

  // Mix all audio streams
  if (audioStreams.length > 1) {
    filters.push(
      `${audioStreams.join("")}amix=inputs=${audioStreams.length}:duration=first:dropout_transition=2[audio]`
    );
  } else if (audioStreams.length === 1) {
    filters.push(
      `${audioStreams[0]}aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[audio]`
    );
  }

  args.push("-filter_complex", filters.join(";\n"));
  args.push("-map", "[video]");

  if (audioStreams.length > 0) {
    args.push("-map", "[audio]");
  }

  args.push(
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "22",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "+faststart",
    "-t", totalDuration.toFixed(3),
    outPath
  );

  console.log(`[${jobId}][ffmpeg] Rendering ${scenes.length} scenes with animations & Montserrat/Inter fonts to ${outPath}...`);

  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: ["pipe", "pipe", "pipe"] });

    const stderr: string[] = [];
    proc.stderr.on("data", (d: Buffer) => {
      const line = d.toString();
      stderr.push(line);
      if (line.includes("frame=") || line.includes("time=")) {
        const timeMatch = line.match(/time=(\d+:\d+:\d+\.\d+)/);
        if (timeMatch) {
          process.stdout.write(`\r[${jobId}][ffmpeg] ${timeMatch[1]}  `);
        }
      }
    });

    proc.on("close", (code) => {
      process.stdout.write("\n");
      if (code === 0) {
        console.log(`[${jobId}][ffmpeg] Render successful → ${outPath}`);
        resolve(outPath);
      } else {
        const errMsg = stderr.join("").slice(-600);
        reject(new Error(`ffmpeg exited ${code}: ${errMsg}`));
      }
    });

    proc.on("error", reject);
  });
}
