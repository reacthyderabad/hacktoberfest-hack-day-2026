/**
 * Render router.
 *
 * RENDER_ENGINE=ffmpeg     → FFmpeg filter_complex (DEFAULT — works everywhere)
 * RENDER_ENGINE=remotion   → Remotion / React composition (animated, layered)
 * RENDER_ENGINE=elah       → ELAH library API (legacy)
 * ELAH_RENDER_PORT set     → ELAH HTTP server (legacy)
 *
 * FFmpeg is the default because it requires no browser, no Chromium download,
 * and works reliably with the ffmpeg already on PATH.
 */
import { writeFile } from "fs/promises";
import path from "path";
import type { ElahSpec } from "./adapter.js";
import type { ExtendedElahSpec } from "./renderRemotionVideo.js";

const RENDER_ENGINE = process.env.RENDER_ENGINE ?? "ffmpeg";
const HTTP_PORT = process.env.ELAH_RENDER_PORT;

// ── FFmpeg renderer (default) ─────────────────────────────────────────────────
async function renderViaFfmpeg(
  spec: ElahSpec,
  outPath: string,
  jobId: string
): Promise<void> {
  const { renderWithFfmpeg } = await import("./renderFfmpeg.js");
  await renderWithFfmpeg(spec, outPath, jobId);
}

// ── ELAH library API ──────────────────────────────────────────────────────────
async function renderViaLibrary(
  spec: ElahSpec,
  specPath: string,
  outPath: string
): Promise<void> {
  const { build, createRenderSession } = await import("@elah/cli");

  const baseDir = path.dirname(specPath);
  const { project } = await build({ spec, baseDir });

  const session = createRenderSession();
  await session.warmup();

  const mp4 = await (session as any).render(project, baseDir) as Buffer;
  await writeFile(outPath, mp4);
}

// ── ELAH HTTP server API ──────────────────────────────────────────────────────
async function renderViaHttp(
  spec: ElahSpec,
  _specPath: string,
  outPath: string
): Promise<void> {
  const url = `http://127.0.0.1:${HTTP_PORT}/render`;
  const body = JSON.stringify(spec);

  let attempt = 0;
  while (attempt < 5) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(180_000),
    });

    if (res.status === 503) {
      const retryAfter = parseInt(res.headers.get("Retry-After") ?? "3", 10);
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      attempt++;
      continue;
    }

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(`ELAH render server ${res.status}: ${msg}`);
    }

    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(outPath, buf);
    return;
  }

  throw new Error("ELAH render server busy after 5 retries");
}

// ── Remotion render ───────────────────────────────────────────────────────────
async function renderViaRemotion(
  spec: ExtendedElahSpec,
  outPath: string,
  jobId: string
): Promise<void> {
  // Dynamic import keeps Remotion's large dep tree out of the FFmpeg path
  const { renderRemotionVideo } = await import("./renderRemotionVideo.js");
  await renderRemotionVideo(spec, outPath, jobId);
}

/**
 * Top-level render entry point used by pipeline.ts.
 * Returns the absolute path of the rendered MP4.
 */
export async function render(
  spec: ElahSpec,
  workDir: string,
  jobId: string
): Promise<string> {
  const specPath = path.join(workDir, "spec.json");
  const outPath  = path.join(workDir, `${jobId}.mp4`);

  // Always write spec.json for debugging
  await writeFile(specPath, JSON.stringify(spec, null, 2));

  if (RENDER_ENGINE === "remotion") {
    console.log(`[${jobId}] Using Remotion renderer`);
    await renderViaRemotion(spec as ExtendedElahSpec, outPath, jobId);
  } else if (RENDER_ENGINE === "elah") {
    if (HTTP_PORT) {
      console.log(`[${jobId}] Using ELAH HTTP renderer on port ${HTTP_PORT}`);
      await renderViaHttp(spec, specPath, outPath);
    } else {
      console.log(`[${jobId}] Using ELAH library renderer`);
      await renderViaLibrary(spec, specPath, outPath);
    }
  } else {
    // Default: ffmpeg
    console.log(`[${jobId}] Using FFmpeg renderer`);
    await renderViaFfmpeg(spec, outPath, jobId);
  }

  return outPath;
}
