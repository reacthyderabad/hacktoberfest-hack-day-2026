# CampexGen — Telegram Campaign-to-Video Bot

Send a campaign message → receive a rendered MP4 promo video.

```
Telegram → Gemma 4 (VideoArtifact JSON) → validate → ELAH render → ffprobe → Telegram
```

---

## Requirements

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | ≥ 18 | |
| Python | ≥ 3.9 | for edge-tts |
| ffmpeg + ffprobe | any recent | must be on PATH |
| Google Chrome / Edge | any | **not** Playwright Chromium — needs H.264/AAC |
| edge-tts | latest | `pip install edge-tts` |

---

## Setup

### 1. Install dependencies

```bash
npm install
pip install edge-tts
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — fill in TELEGRAM_BOT_TOKEN and one LLM provider block
```

**LLM provider options** (pick one):

- **Google AI Studio** (easiest): set `GEMMA_PROVIDER=google`, `GOOGLE_API_KEY=...`, `GOOGLE_MODEL=gemma-4-it`
- **Ollama** (local): `ollama pull gemma4:4b`, then `GEMMA_PROVIDER=openai`, `OPENAI_BASE_URL=http://localhost:11434/v1`
- **vLLM**: set `GEMMA_PROVIDER=openai`, `OPENAI_BASE_URL=http://localhost:8000/v1`, `OPENAI_API_KEY=...`

### 3. Chrome / H.264

ELAH requires a branded Chrome or Edge for H.264/AAC export (Playwright's bundled Chromium does not have these codecs).

```bash
# Option A: install Google Chrome system-wide (Linux)
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
sudo apt update && sudo apt install -y google-chrome-stable

# Option B: point to an existing Chrome
export ELAH_BROWSER=/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome
# Or set ELAH_BROWSER in .env
```

### 4. Music loop

Add a royalty-free MP3 (≥ 30 s) as `assets/music/loop.mp3`. See `assets/music/LICENSE.txt` for the recommended source. If you skip this, set `music.enabled = false` in the VideoArtifact (or the bot will warn and continue).

### 5. Step 1 smoke test (run before the bot)

```bash
# Generate the demo background PNG
node demo/make_bg.mjs

# Build and export the demo spec
npx @elah/cli build --spec demo/spec.json --export demo/test.mp4

# Verify with ffprobe
ffprobe -v error -show_entries stream=codec_name,width,height,codec_type \
        -show_entries format=duration -of json demo/test.mp4
# Expected: h264 video, 1080×1920, ~8s, no audio (the spec has none)
```

### 6. Run the self-check

```bash
npx tsx src/check.ts
# All checks should pass before starting the bot
```

### 7. Start the bot

```bash
npm run dev
# or, for the render server mode:
npx @elah/cli serve --port 8080 --media-root work &
ELAH_RENDER_PORT=8080 npm run dev
```

---

## Usage

| Action | What to do |
|--------|-----------|
| New campaign | Send any text message (optionally with photos) |
| Album of photos | Send multiple photos at once — the bot groups them |
| Edit | Reply with a short instruction, e.g. `"make it 15 seconds"` |
| Get artifact JSON | Send `/artifact` |

### Supported edits

- `"make it 15 seconds"` — rescale all scene durations
- `"remove the voiceover"` — set `voiceover.enabled = false`
- `"more energetic"` — change mood and palette
- `"use the second image"` — reassign a scene's asset
- `"make the CTA more prominent"` — Gemma adjusts CTA duration and style

---

## Architecture

```
src/
  bot.ts          Telegram handlers, media group collection, job queue
  pipeline.ts     Orchestrates: generate → validate → adapt → render → verify
  gemma.ts        LLM client (Google AI Studio / Ollama / HF, via OpenAI SDK)
  prompts.ts      System prompt, few-shot examples, edit prompt
  artifact.ts     Zod schema for VideoArtifact
  validate.ts     Pre-render validation + grounding checks + deterministic repair
  adapter.ts      VideoArtifact → ELAH build spec (TTS + backgrounds inside)
  tts.ts          edge-tts subprocess + ffprobe duration measurement
  backgrounds.ts  SVG gradient → PNG via sharp
  render.ts       ELAH render (library API or HTTP server)
  verify.ts       ffprobe post-render checks
  store.ts        Per-chat state (in-memory + JSON file sidecar)
  check.ts        Self-check / tests (no framework)

assets/music/     Royalty-free MP3 loop + LICENSE.txt
demo/             Step 1 smoke test spec + bg generator
work/             Runtime job directories (auto-created, gitignored)
```

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | ✅ | From @BotFather |
| `GEMMA_PROVIDER` | ✅ | `google` / `openai` / `hf` |
| `GOOGLE_API_KEY` | if google | Google AI Studio key |
| `GOOGLE_MODEL` | if google | e.g. `gemma-4-it` |
| `OPENAI_BASE_URL` | if openai | e.g. `http://localhost:11434/v1` |
| `OPENAI_API_KEY` | if openai | any string for Ollama |
| `HF_API_KEY` | if hf | Hugging Face token |
| `ELAH_BROWSER` | optional | Path to Chrome/Edge |
| `ELAH_RENDER_PORT` | optional | Use HTTP server mode instead of library API |

---

## Security notes

- `ELAH_RENDER_PORT` server is bound to `127.0.0.1` — never expose it publicly
- All user text is wrapped in `<campaign>` delimiters in the prompt
- Files are read/written only under `work/`
- Secrets live in `.env` (gitignored)

---

## Known limits / ceilings

- `ponytail: global per-chat job lock` — no parallel renders for the same chat; upgrade path: BullMQ
- `ponytail: JSON file state` — single-process only; upgrade path: Redis
- Music file must be ≥ total video duration (no looping); use a 60s+ loop file
- Telegram bot file send limit: 50 MB

---

## Testing checklist

1. XYZ Pro text-only → 9:16 video with voiceover
2. Same text + one image → image appears in hero scene
3. Discount campaign with deadline → discount template used
4. Message with a number Gemma might alter → grounding check blocks/repairs
5. Edit: `"make it 15 seconds"` / `"remove the voiceover"` / `"more energetic"` / `"use the second image"`
6. Failure: Gemma returns invalid JSON (retry loop kicks in)
7. `ffprobe` output matches expected dimensions, duration, audio streams
