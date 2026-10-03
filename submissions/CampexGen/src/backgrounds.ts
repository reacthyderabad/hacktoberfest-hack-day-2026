/**
 * Generate a vertical gradient PNG at stage size using sharp + inline SVG.
 */
import sharp from "sharp";
import path from "path";

interface Stage {
  width: number;
  height: number;
}

export async function generateGradient(
  bg1: string,
  bg2: string,
  stage: Stage,
  outPath: string
): Promise<string> {
  const { width, height } = stage;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${bg1}"/>
      <stop offset="100%" stop-color="${bg2}"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#g)"/>
</svg>`;

  await sharp(Buffer.from(svg)).png().toFile(outPath);
  return outPath;
}

// Probe an image's native dimensions (needed to compute scale for ELAH spec)
export async function imageDimensions(filePath: string): Promise<{ width: number; height: number }> {
  const meta = await sharp(filePath).metadata();
  return { width: meta.width ?? 1, height: meta.height ?? 1 };
}

// Compute scale so the image fits 80% of the stage width
export function fitScale(
  imgWidth: number,
  imgHeight: number,
  stageWidth: number
): number {
  const targetWidth = stageWidth * 0.8;
  return targetWidth / imgWidth;
}

export function stageForRatio(ratio: "9:16" | "16:9" | "1:1"): Stage {
  if (ratio === "9:16")  return { width: 1080, height: 1920 };
  if (ratio === "16:9")  return { width: 1920, height: 1080 };
  return { width: 1080, height: 1080 };
}
