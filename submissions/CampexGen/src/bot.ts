/**
 * Telegram bot entry point.
 * Long polling, per-chat serialised jobs, media group collection.
 */
import "dotenv/config";
import { Bot, InputFile } from "grammy";
import { readFile, mkdir } from "fs/promises";
import path from "path";
import { getState, saveState, newJobDir } from "./store.js";
import { runNewCampaign, runEdit, isEditMessage } from "./pipeline.js";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error("TELEGRAM_BOT_TOKEN not set");

const bot = new Bot(token);

// ── Per-chat job serialisation ─────────────────────────────────────────────────
// ponytail: simple Map<chatId, Promise> chain — no queue library needed
const jobChain = new Map<number, Promise<void>>();

function enqueue(chatId: number, fn: () => Promise<void>): void {
  const prev = jobChain.get(chatId) ?? Promise.resolve();
  const next = prev.then(fn).catch(() => { /* errors handled inside fn */ });
  jobChain.set(chatId, next);
}

// ── Media group collector ──────────────────────────────────────────────────────
// grammY delivers album photos as separate messages with the same media_group_id
interface PendingAlbum {
  chatId: number;
  text: string;
  photos: Array<{ fileId: string; buffer: Buffer }>;
  timer: ReturnType<typeof setTimeout>;
}
const pendingAlbums = new Map<string, PendingAlbum>();

// ── Download helpers ───────────────────────────────────────────────────────────
async function downloadPhoto(
  fileId: string,
  destDir: string,
  name: string
): Promise<{ path: string; buffer: Buffer }> {
  const file = await bot.api.getFile(fileId);
  const filePath = file.file_path!;
  const url = `https://api.telegram.org/file/bot${token}/${filePath}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());

  const ext = path.extname(filePath) || ".jpg";
  const dest = path.join(destDir, `${name}${ext}`);
  await mkdir(destDir, { recursive: true });
  const { writeFile } = await import("fs/promises");
  await writeFile(dest, buf);

  return { path: dest, buffer: buf };
}

// ── Processing ────────────────────────────────────────────────────────────────
async function processMessage(
  chatId: number,
  text: string,
  photos: Array<{ fileId: string; buffer: Buffer }>
): Promise<void> {
  const state = getState(chatId);

  // Classify: edit or new campaign?
  const isEdit = isEditMessage(text, state.artifact !== null);

  try {
    if (isEdit) {
      await bot.api.sendMessage(chatId, "✏️ Applying your edit...");
      const result = await runEdit(chatId, text);
      await bot.api.sendVideo(chatId, new InputFile(result.mp4Path), {
        caption: `✅ Updated (v${getState(chatId).version}). Reply with more changes or send a new campaign.`,
        supports_streaming: true,
      });
    } else {
      await bot.api.sendMessage(chatId, "🎬 Creating your campaign video...");

      // Download photos into a fresh job dir
      const jobDir = newJobDir(chatId);
      const assetPaths: Record<string, string> = {};
      const imageBuffers: Buffer[] = [];

      for (let i = 0; i < photos.length; i++) {
        const { path: p, buffer } = await downloadPhoto(
          photos[i].fileId,
          jobDir,
          `image_${i + 1}`
        );
        assetPaths[`image_${i + 1}`] = p;
        imageBuffers.push(photos[i].buffer);
      }

      const result = await runNewCampaign(chatId, text, assetPaths, imageBuffers);

      await bot.api.sendVideo(chatId, new InputFile(result.mp4Path), {
        caption: `✅ Your video is ready! (${result.totalDuration.toFixed(0)}s)\nReply with changes, e.g. "make it 15 seconds".`,
        supports_streaming: true,
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[chat:${chatId}] Pipeline error:`, msg);
    await bot.api.sendMessage(
      chatId,
      `❌ Something went wrong: ${msg.slice(0, 300)}\n\nPlease try again or send a new campaign.`
    );
  }
}

// ── /artifact command ─────────────────────────────────────────────────────────
bot.command("artifact", async (ctx) => {
  const chatId = ctx.chat.id;
  const state = getState(chatId);
  if (!state.artifact) {
    await ctx.reply("No artifact yet. Send a campaign message first.");
    return;
  }
  const json = JSON.stringify(state.artifact, null, 2);
  await ctx.replyWithDocument(
    new InputFile(Buffer.from(json), `artifact_v${state.version}.json`),
    { caption: `VideoArtifact v${state.version}` }
  );
});

// ── /start command ────────────────────────────────────────────────────────────
bot.command("start", async (ctx) => {
  await ctx.reply(
    "👋 Send me your campaign text (and optionally photos) to generate a promo video.\n\n" +
    "Example:\n_Introducing XYZ Pro — our fastest laptop. 16h battery, M3 chip. Pre-order at xyz.com for $1299._\n\n" +
    "After your video is ready, reply with edits like:\n" +
    "• \"make it 15 seconds\"\n• \"remove the voiceover\"\n• \"more energetic\"\n• \"use the second image\"",
    { parse_mode: "Markdown" }
  );
});

// ── Message handler ────────────────────────────────────────────────────────────
bot.on("message", async (ctx) => {
  const msg = ctx.message;
  const chatId = ctx.chat.id;

  // Text-only message
  if (msg.text && !msg.photo) {
    const text = msg.text.trim();
    if (!text || text.startsWith("/")) return;
    enqueue(chatId, () => processMessage(chatId, text, []));
    return;
  }

  // Photo (possibly with caption), potentially part of an album
  if (msg.photo) {
    const largestPhoto = msg.photo[msg.photo.length - 1];
    const caption = msg.caption?.trim() ?? "";
    const groupId = msg.media_group_id;

    if (groupId) {
      // Album: buffer and wait for more photos
      if (!pendingAlbums.has(groupId)) {
        pendingAlbums.set(groupId, {
          chatId,
          text: caption,
          photos: [],
          timer: setTimeout(async () => {
            const album = pendingAlbums.get(groupId)!;
            pendingAlbums.delete(groupId);
            enqueue(chatId, () => processMessage(chatId, album.text, album.photos));
          }, 1500),
        });
      }

      const album = pendingAlbums.get(groupId)!;
      // Eagerly download the buffer so we don't need the file later
      const file = await bot.api.getFile(largestPhoto.file_id);
      const url = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
      const res = await fetch(url);
      const buffer = Buffer.from(await res.arrayBuffer());
      album.photos.push({ fileId: largestPhoto.file_id, buffer });

      // Use caption from first photo
      if (!album.text && caption) album.text = caption;
    } else {
      // Single photo
      const file = await bot.api.getFile(largestPhoto.file_id);
      const url = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
      const res = await fetch(url);
      const buffer = Buffer.from(await res.arrayBuffer());
      enqueue(chatId, () =>
        processMessage(chatId, caption, [{ fileId: largestPhoto.file_id, buffer }])
      );
    }
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
bot.catch((err) => {
  console.error("Bot error:", err.message);
});

console.log("🤖 CampexGen bot starting...");
bot.start({ onStart: (info) => console.log(`Bot @${info.username} is running`) });
