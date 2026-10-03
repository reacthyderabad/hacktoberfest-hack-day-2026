# CampexGen — Agent Handoff

> Drop this file into context before starting any new agent session.
> Everything another agent needs to continue without re-reading the whole codebase.

---

## What this project is

A **Telegram bot** (`grammy`) that accepts a plain-English marketing campaign brief (+ optional photos) and produces a rendered MP4 promo video.

**Data flow (end-to-end):**

```
Telegram message + photos
  └─► bot.ts                  grammY handler, per-chat job queue
        └─► pipeline.ts       orchestrator (generateArtifact / runEdit)
              ├─► gemma.ts    LLM client (Google AI Studio / Ollama / HF via OpenAI SDK)
              ├─► prompts.ts  system + user prompts, few-shot examples
              ├─► validate.ts 8-check validation + auto-repair
              ├─► adapter.ts  VideoArtifact → ExtendedElahSpec
              │     ├─► imageprompt.ts   per-scene Gemma image prompts (parallel)
              │     ├─► tts.ts           TTS router → ElevenLabs API or edge-tts fallback
              │     │     └─► elevenlabs.ts  ElevenLabs REST client (TTS + music)
              │     ├─► elevenlabs.ts    background music generation (text-to-music)
              │     └─► backgrounds.ts  sharp SVG gradient → bg_N.png
              └─► render.ts   routes to renderer based on RENDER_ENGINE env
                    ├─► @elah/cli        (RENDER_ENGINE=elah / ELAH_RENDER_PORT)
                    └─► renderRemotionVideo.ts  (RENDER_ENGINE unset or =remotion, DEFAULT)
                              └─► src/remotion/   React + Remotion composition
```

---

## Repository layout

```
src/
  artifact.ts          Zod schemas — VideoArtifact, Scene, AnimationType
  gemma.ts             LLM client (provider-swappable)
  prompts.ts           System/user/edit prompts + animation guide
  validate.ts          Pre-render validation + grounding checks
  adapter.ts           VideoArtifact → ExtendedElahSpec (TTS + music + BG + clips + remotionMeta)
  imageprompt.ts       Gemma-powered per-scene image prompt generator
  backgrounds.ts       Sharp SVG gradient PNG generator
  elevenlabs.ts        ElevenLabs REST API client (TTS + text-to-music)
  tts.ts               TTS router: ElevenLabs API → edge-tts fallback
  render.ts            Render router (Remotion default / ELAH lib / ELAH HTTP)
  renderRemotionVideo.ts  Remotion bundler + renderer, elahSpecToRemotionProps
  pipeline.ts          runNewCampaign / runEdit / isEditMessage
  bot.ts               Telegram bot entry point
  store.ts             Per-chat state (in-memory + JSON sidecar)
  verify.ts            Post-render ffprobe verification
  check.ts             Self-test suite (run: npx tsx src/check.ts)
  remotion/
    types.ts           RemotionScene, CampexVideoProps interfaces
    animations.tsx     useAnimationStyle, useKenBurns, useSceneFlash hooks
    SceneComp.tsx      6-layer scene component
    CampexVideo.tsx    Root composition — all scenes as <Sequence> blocks
    index.tsx          registerRoot() bundle entry point
assets/music/loop.mp3  Background music (fallback when ElevenLabs unavailable)
demo/                  Test spec + bg for manual ELAH render testing
work/                  Runtime output (auto-created): work/{chatId}/{jobId}/
```

---

## Key data structures

### VideoArtifact (src/artifact.ts)
```ts
{
  type: "video",
  campaign: { type, product_name, key_facts[], cta_text, cta_url? },
  duration: number,           // seconds
  aspect_ratio: "9:16"|"16:9"|"1:1",
  style: {
    mood: "energetic"|"calm"|"premium"|"playful",
    palette: { bg1, bg2, text, accent },  // all #rrggbb
    font_family: string,
  },
  scenes: Scene[],            // 3–6 scenes
  voiceover: { enabled, voice? },
  music: { enabled, mood?, volume },
}
```

### Scene (src/artifact.ts)
```ts
{
  id: string,
  duration: number,           // seconds, 2.5–8
  purpose: "hook"|"product"|"benefit"|"info"|"urgency"|"cta"|"offer"|"discount",
  headline: string,           // ≤6 words
  subtext?: string,           // ≤12 words
  asset?: string,             // references key in assetPaths dict
  voiceover?: string,         // TTS input text
  image_prompt?: string,      // Gemma-generated AI image prompt (added by adapter)
  animation?: AnimationType,  // Remotion entrance animation (default: "fade-in")
}
```

### AnimationType values
`none | fade-in | slide-up | slide-down | zoom-in | zoom-out | pop | wipe-right`

### ExtendedElahSpec (src/renderRemotionVideo.ts)
Standard `ElahSpec` (fps, stage, assets, clips) plus:
```ts
remotionMeta?: Array<{
  animation: AnimationType,
  isCta: boolean,
  imagePrompt?: string,
}>
```
`remotionMeta[i]` corresponds to scene `i` (0-indexed). Built by `adapter.ts`.

### ElahSpec clips
Three track types, all time in seconds, positions normalised 0–1:
- `{ track:"image", asset, start, duration, x, y, scale }`
- `{ track:"text", text, start, duration, fontSize, color, fontFamily, fontWeight, align, x, y }`
- `{ track:"audio", asset, start, duration, volume }`

### ChatState (src/store.ts)
```ts
{ chatId, campaignText, assets: Record<string,string>, artifact, version, lastJobDir }
```
Persisted as `work/{chatId}/state.json`. In-memory `Map` is the primary cache.

---

## Environment variables (.env)

| Variable | Purpose | Current value |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | grammY bot token | set in .env |
| `GEMMA_PROVIDER` | `google` \| `openai` \| `hf` | `google` |
| `GOOGLE_API_KEY` | Google AI Studio key | set in .env |
| `GOOGLE_MODEL` | Model name | `gemma-4-26b-a4b-it` |
| `ELAH_BROWSER` | Chrome path for ELAH | set in .env |
| `RENDER_ENGINE` | `remotion` (default) \| `elah` | unset (defaults to Remotion) |
| `ELAH_RENDER_PORT` | ELAH HTTP server port (optional) | unset |
| `ELEVENLABS_API_KEY` | ElevenLabs API key (TTS + music) | set in .env |
| `ELEVENLABS_VOICE_ID` | Override default TTS voice | unset (defaults to Rachel) |
| `OPENAI_API_KEY` | For `openai` provider | — |
| `OPENAI_BASE_URL` | For local Ollama/vLLM | — |
| `HF_API_KEY` | For `hf` provider | — |

**To switch to ELAH renderer:** add `RENDER_ENGINE=elah` to `.env`.

---

## Installed dependencies (package.json)

```
dependencies:
  @elah/cli@^0.1.2          video render library (ELAH path)
  @remotion/bundler@4.0.290  Remotion webpack bundler
  @remotion/renderer@4.0.290 Remotion headless renderer
  remotion@4.0.290            Remotion core
  react@18.3.1 / react-dom@18.3.1
  grammy@^1.27.0             Telegram bot
  zod@^3.23.8                schema validation
  sharp@^0.33.5              image processing (gradients, metadata)
  fluent-ffmpeg@^2.1.3       ffprobe duration/verify
  openai@^4.67.0             LLM client (Google/Ollama/HF via OpenAI compat)
  dotenv@^16.4.5

devDependencies:
  @types/react @types/react-dom @types/fluent-ffmpeg @types/node
  tsx@^4.19.1   typescript@^5.6.3
```

External runtime deps (not npm):
- **Python** + `edge-tts` (`pip install edge-tts`) for TTS fallback (only needed if `ELEVENLABS_API_KEY` not set)
- **FFmpeg** on PATH for duration probing
- **Google Chrome** at `ELAH_BROWSER` path for ELAH rendering (only if `RENDER_ENGINE=elah`)

---

## npm scripts

```
npm run dev     tsx src/bot.ts          start bot with hot reload
npm run build   tsc --noEmit            type check only (no emit)
npm run check   tsx src/check.ts        run self-test suite (5 checks)
npm start       node dist/bot.js        run compiled bot
```

---

## Render engines

### ELAH (default, `RENDER_ENGINE` unset)
- **Library mode** (default): `@elah/cli` `build()` + `createRenderSession().render()`
- **HTTP mode** (`ELAH_RENDER_PORT` set): POST to `http://127.0.0.1:{port}/render`
- Input: `ElahSpec` JSON (static clips only — no animations)
- Output: MP4 buffer / file

### Remotion (`RENDER_ENGINE` unset or `remotion`, **DEFAULT**)
- Entry: `src/remotion/index.tsx` → `registerRoot(RemotionRoot)`
- Composition: `CampexVideo` (id used in `selectComposition`)
- Bundle: cached in-process via `@remotion/bundler`; first render is slow (~30s), subsequent edits are fast
- Props flow: `ExtendedElahSpec` → `elahSpecToRemotionProps()` → `CampexVideoProps` → `renderMedia()`
- Output: H.264 MP4 at stage dimensions

### TTS Provider Chain (src/tts.ts)
1. **ElevenLabs** (if `ELEVENLABS_API_KEY` set) — REST API → `/v1/text-to-speech/{voice_id}`, returns MP3
2. **edge-tts** (fallback) — Python subprocess, requires `pip install edge-tts`

### Background Music (src/adapter.ts → src/elevenlabs.ts)
- When `ELEVENLABS_API_KEY` is set: generates custom music via `/v1/text-to-music` matched to campaign mood
- Mood → prompt mapping: energetic→EDM, calm→ambient piano, premium→orchestral, playful→ukulele
- Falls back to bundled `assets/music/loop.mp3` if API fails or key not set

---

## Remotion composition layers (per scene)

`SceneComp.tsx` renders 6 layers in order:

1. **Background PNG** — gradient from `bg_N.png` with Ken Burns motion (zoom-in/out or pan)
2. **Gradient overlay** — `rgba(0,0,0,0.5)` gradient for text legibility
3. **Product image** (optional) — user-uploaded, top 55% of frame, with entrance animation
4. **Headline text** — font size scales by length; CTA scenes uppercase + accent colour
5. **Subtext** (optional) — 6 frames after headline entrance
6. **Scene-cut flash** — 4-frame black flash at scene start simulating hard cut

Animation hook: `useAnimationStyle(animation, frame, fps)` in `animations.tsx`.
Ken Burns: `useKenBurns(frame, totalFrames, variant)` cycles 4 variants across scenes.

---

## Animation assignment (prompts.ts → Gemma)

Gemma picks `animation` per scene following this guide (in system prompt):

| purpose | default animation |
|---|---|
| hook | zoom-in |
| product | slide-up |
| benefit | fade-in |
| info | slide-down |
| urgency | pop |
| offer | wipe-right |
| discount | pop |
| cta | zoom-out |

---

## Image prompt generation (imageprompt.ts)

- Called by `adapter.ts` step 0, before TTS, all scenes in parallel
- One LLM call per scene → 40–80 word Stable Diffusion / DALL-E style prompt
- Context fed to Gemma: `product_name`, `campaign.type`, `scene.purpose`, `headline`, `subtext`, `style.mood`, palette colours
- Mood → visual style keywords map + purpose → framing keywords map (both in `imageprompt.ts`)
- Result stored as `scene.image_prompt` in artifact + passed through `remotionMeta[i].imagePrompt`
- **Not yet used to actually generate images** — the background is still a gradient PNG. The prompt is ready for an image generation API call (DALL-E, Stable Diffusion, Imagen, etc.)

---

## What is NOT yet built (known gaps)

1. **AI image generation**: `imageprompt.ts` generates the prompt but `backgrounds.ts` still produces gradient PNGs. Hook point: replace `generateGradient()` call in `adapter.ts` step 3 with an image-gen API call using `scenes[i].image_prompt`. Save result PNG to `bgPath`.

2. **Remotion Studio / preview**: no `remotion.config.ts`. Add one if you want `npx remotion studio`.

3. **Multi-replica state**: `store.ts` uses file + in-memory — only works single-process. Comment in code: upgrade to Redis.

4. **Image generation API integration**: No DALL-E / Stability / Imagen client. Would add a new env var (e.g. `IMAGE_GEN_PROVIDER=openai`, `OPENAI_IMAGE_API_KEY`) and a new `src/imagegen.ts` file.

5. **Text animation preview in ELAH mode**: ELAH clips are static. Animations only apply in the Remotion path.

---

## How to add AI-generated backgrounds (next logical step)

1. Create `src/imagegen.ts` with a `generateImage(prompt: string, size: string): Promise<Buffer>` function (call DALL-E 3 / Stable Diffusion API)
2. In `adapter.ts` step 3, replace:
   ```ts
   await generateGradient(bg1, bg2, stage, bgPath);
   ```
   with:
   ```ts
   const imgBuf = await generateImage(scenes[i].image_prompt!, `${stage.width}x${stage.height}`);
   await sharp(imgBuf).toFile(bgPath);
   ```
3. Add `IMAGE_GEN_PROVIDER` / `IMAGE_GEN_API_KEY` env vars
4. Fall back to gradient if API fails (wrap in try/catch — the gradient path is already there)

---

## Coding conventions

- **Ponytail rule** (`.agents/rules/ponytail.md`): YAGNI, minimal diff, reuse before adding, `ponytail:` comments on known ceilings
- Module system: ESM (`"type": "module"`), all imports use `.js` extension even for `.ts` source files
- TypeScript strict mode; `skipLibCheck: true`; `jsx: react-jsx`
- No test framework — self-checks are plain `assert`-style scripts (`src/check.ts`)
- Inline `// ponytail:` comment format: `// ponytail: <ceiling> — upgrade path: <path>`

---

## Verification before any change

```bash
npx tsc --noEmit   # must exit 0
npx tsx src/check.ts  # must print "✅ All checks passed"
```

Both pass clean on the current codebase.
