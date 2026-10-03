/**
 * Image generation and retrieval for scene backgrounds.
 *
 * Provider strategy:
 *   1. Pollinations.ai (AI-generated)
 *   2. Wikimedia Commons (relevant public domain stock photography)
 *   3. Picsum (high-resolution commercial photography)
 *   4. Falls back to gradient SVG if all fail
 *
 * Zero dependencies, zero API keys, 100% resilient.
 */
import { writeFile } from "fs/promises";

const BASE_URL = "https://image.pollinations.ai/prompt";

/**
 * Generate or fetch a background image and save it as PNG/JPEG.
 * @returns true if image was saved, false if gradient fallback needed
 */
export async function generateImage(
  prompt: string,
  width: number,
  height: number,
  outPath: string,
  keyword?: string
): Promise<boolean> {
  const scale = Math.min(1, 1024 / Math.max(width, height));
  const reqWidth = Math.round(width * scale);
  const reqHeight = Math.round(height * scale);

  // ── Tier 1: Pollinations AI ────────────────────────────────────────────────
  try {
    const encoded = encodeURIComponent(prompt);
    const url = `${BASE_URL}/${encoded}?width=${reqWidth}&height=${reqHeight}&nologo=true`;

    const res = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
    });

    if (res.ok) {
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("image")) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 2000) {
          await writeFile(outPath, buf);
          console.log(`[imagegen] Pollinations saved ${outPath} (${(buf.length / 1024).toFixed(0)} KB)`);
          return true;
        }
      }
    }
  } catch (err) {
    // Continue to tier 2
  }

  // ── Tier 2: Wikimedia Commons Stock Photos ─────────────────────────────────
  const searchTerms = keyword || prompt.split(/[,.\s]+/).slice(0, 3).join(" ");
  try {
    const wikiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(searchTerms)}&gsrnamespace=6&gsrlimit=3&prop=imageinfo&iiprop=url&format=json&origin=*`;
    const res = await fetch(wikiUrl, {
      headers: { "User-Agent": "CampexGen/1.0" },
      signal: AbortSignal.timeout(10_000),
    });

    if (res.ok) {
      const data = (await res.json()) as any;
      const pages = data.query?.pages;
      if (pages) {
        for (const id in pages) {
          const imgUrl = pages[id]?.imageinfo?.[0]?.url;
          if (imgUrl && (imgUrl.endsWith(".jpg") || imgUrl.endsWith(".png") || imgUrl.endsWith(".jpeg"))) {
            const imgRes = await fetch(imgUrl, {
              headers: { "User-Agent": "CampexGen/1.0" },
              signal: AbortSignal.timeout(12_000),
            });
            if (imgRes.ok) {
              const buf = Buffer.from(await imgRes.arrayBuffer());
              if (buf.length > 5000) {
                await writeFile(outPath, buf);
                console.log(`[imagegen] Wikimedia saved ${outPath} (${(buf.length / 1024).toFixed(0)} KB) for "${searchTerms}"`);
                return true;
              }
            }
          }
        }
      }
    }
  } catch (err) {
    // Continue to tier 3
  }

  // ── Tier 3: High-resolution Photography (Picsum) ───────────────────────────
  try {
    const picsumUrl = `https://picsum.photos/${reqWidth}/${reqHeight}`;
    const res = await fetch(picsumUrl, {
      signal: AbortSignal.timeout(10_000),
    });

    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 5000) {
        await writeFile(outPath, buf);
        console.log(`[imagegen] Picsum saved ${outPath} (${(buf.length / 1024).toFixed(0)} KB)`);
        return true;
      }
    }
  } catch (err) {
    console.warn(`[imagegen] All image providers failed: ${(err as Error).message}`);
  }

  return false;
}
