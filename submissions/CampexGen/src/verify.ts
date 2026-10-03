/**
 * Post-render validation using ffprobe.
 */
import { existsSync, statSync } from "fs";
import ffmpeg from "fluent-ffmpeg";

export interface VerifyResult {
  ok: boolean;
  errors: string[];
}

export async function verifyMp4(
  filePath: string,
  expectedWidth: number,
  expectedHeight: number,
  expectedDuration: number,
  expectAudio: boolean
): Promise<VerifyResult> {
  const errors: string[] = [];

  if (!existsSync(filePath)) {
    return { ok: false, errors: ["Output file does not exist"] };
  }

  if (statSync(filePath).size === 0) {
    return { ok: false, errors: ["Output file is empty"] };
  }

  const meta = await probe(filePath);
  const videoStream = meta.streams.find((s) => s.codec_type === "video");
  const audioStream = meta.streams.find((s) => s.codec_type === "audio");

  if (!videoStream) {
    errors.push("No video stream found");
  } else {
    if (videoStream.codec_name !== "h264") {
      errors.push(`Video codec is ${videoStream.codec_name}, expected h264`);
    }
    if (videoStream.width !== expectedWidth || videoStream.height !== expectedHeight) {
      errors.push(
        `Dimensions ${videoStream.width}×${videoStream.height}, expected ${expectedWidth}×${expectedHeight}`
      );
    }
  }

  const duration = parseFloat(String(meta.format.duration ?? 0));
  if (Math.abs(duration - expectedDuration) > 3.0) {
    errors.push(
      `Duration ${duration.toFixed(2)}s, expected ${expectedDuration.toFixed(2)}s (±3.0s)`
    );
  }

  if (expectAudio && !audioStream) {
    errors.push("Expected audio stream but none found");
  }

  return { ok: errors.length === 0, errors };
}

function probe(filePath: string): Promise<ffmpeg.FfprobeData> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}
