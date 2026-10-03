# Watch-and-Cut

> Describe the reel you want. A vision model watches your video, proposes the cut on an elah timeline, and you keep it, tweak it, or undo it in one step.

![Watch-and-Cut editor with an AI cut in preview](https://raw.githubusercontent.com/prabii/watch-and-cut/main/docs/screenshots/editor-plan.png)

## Team / attendee

- Team name (if applicable): — (solo)
- Members and GitHub usernames: Prabhas Satti ([@prabii](https://github.com/prabii))

## Challenge

Select the challenge you are entering:

- [ ] Best Open-Source AI Project
- [ ] Best Use of Gemma 4
- [x] Build on elah

Primary entry is **Build on elah**. The offline mode runs the open-weight **Gemma 4 E2B** locally (evidence below); I will confirm with the organizers whether the project may also be listed under Best Open-Source AI Project. The Gemma 4 via Gemini API path is implemented but was not verified end-to-end with an API key during the build window, so I am not claiming Best Use of Gemma 4.

## Project links

- Public GitHub repository: https://github.com/prabii/watch-and-cut
- Open-source license (link to the license file): [Apache-2.0](https://github.com/prabii/watch-and-cut/blob/main/LICENSE)
- Design doc: [HLD.md](https://github.com/prabii/watch-and-cut/blob/main/HLD.md)

## Problem and solution

Turning a long phone recording into a short reel means scrubbing the whole video, guessing cut points, trimming dead air and typing captions by hand. Watch-and-Cut is for creators, students and community organizers who want a 15–30 second reel from a 1–3 minute clip.

**Workflow:** upload a video → the browser finds speech pauses and samples one frame per spoken segment → you type a request ("Make a 20s reel of the best moments with captions") → a vision model returns a **JSON edit plan** → the plan is validated and applied to the elah timeline as **one undoable batch** → you preview it, edit it (switch parts off, rewrite captions, change transitions, add a title), then **Keep**, **Discard** (one undo) or **Refine** it with feedback.

## Approach and technologies

- **Frontend:** React 19 + Vite + TypeScript with [`@elah/editor`](https://github.com/elahlabs/elah) 0.6.0 for the timeline, WebGL2 preview, undo history and MP4 export. Frame sampling (canvas) and speech-pause detection (Web Audio RMS) run in the browser with no AI, so the model *chooses* between real segments instead of inventing timestamps.
- **Backend:** a small Node API that holds server-side keys and forwards the plan request to the model the user picks:
  - **Ollama (offline):** Gemma 4 E2B (`gemma4:e2b`), schema-constrained JSON output, kept warm between requests.
  - **Gemma / Gemini** through the Gemini API.
  - **Claude** through the official Anthropic SDK with structured outputs.
  - **Any OpenAI-compatible API** (OpenAI, OpenRouter, Groq, LM Studio…).
  - Users can bring their own key in the UI; it stays in their browser and is sent only with their requests.
- **Validation:** zod schema + timeline rules (bounds, minimum length, no overlap, valid caption/transition indexes, target length ±30%), cut points snapped to speech pauses, and one self-correction retry with path-addressed errors.

**Credits:** elah by ELAHlabs (Apache-2.0); Gemma 4 by Google DeepMind; Ollama; React, Vite, zod, Anthropic TypeScript SDK. The landing page background video is loaded from the CloudFront URL given in the landing-page design brief. Significant parts of the code were written with AI assistance (Claude Code); the architecture, scope and testing were directed by me.

## Challenge evidence

### Build on elah

- **Editing workflow / idea direction and elah version:** Conversational "Highlight Cut" — natural-language request → structured plan → preview on the real timeline → keep / discard / refine, plus direct editing of the AI plan. `@elah/editor` **0.6.0**.
- **Model/runtime and structured-edit implementation:**
  - The model only returns data in a closed operation set: `keep_segment`, `add_caption`, `add_title`, `add_transition` ([schema](https://github.com/prabii/watch-and-cut/blob/main/frontend/src/plan/schema.ts), [prompt](https://github.com/prabii/watch-and-cut/blob/main/frontend/src/ai/prompt.ts)). It never touches pixels or the DOM.
  - [`apply.ts`](https://github.com/prabii/watch-and-cut/blob/main/frontend/src/plan/apply.ts) turns a valid plan into elah engine calls (`splitClip` → `removeClip` → `moveClip` ripple, text clips for captions/title, `addTransition`) inside **one `engine.batch()`**, so the whole AI action is a single undo step.
  - Tested runtime: **Gemma 4 E2B via Ollama** on a laptop GPU (GTX 1650, 4 GB).
- **Validation / keep-discard evidence:**
  - [`validate.ts`](https://github.com/prabii/watch-and-cut/blob/main/frontend/src/plan/validate.ts) rejects out-of-range, overlapping, too-short or mis-indexed operations before anything reaches the timeline.
  - In a real offline run, Gemma's first plan referenced caption segments that didn't exist; the validator caught it, sent the errors back, and the retry produced a valid plan that was applied.
  - Unsupported request ("Add a dancing robot in the corner") → the model returned `status: "unsupported"` with a reason; the timeline was not changed.
  - Discard restored the original 40 s timeline in one step; Keep followed by "Undo AI edit" did the same.
  - Headless check against the real elah engine: `npm run selftest` in `frontend/` (validate → apply → one-step revert).

### Best Open-Source AI Project (eligibility to be confirmed with organizers)

- **Open-source/open-weight AI component and its role:** Gemma 4 E2B (open weights) runs locally through Ollama and produces every edit plan in offline mode; it is the core of the workflow, not an add-on.
- **Code link showing the integration:** [`backend/src/providers/ollama.ts`](https://github.com/prabii/watch-and-cut/blob/main/backend/src/providers/ollama.ts), [`frontend/src/plan/generate.ts`](https://github.com/prabii/watch-and-cut/blob/main/frontend/src/plan/generate.ts)
- **Original harness implementation:** the planning harness is original: one frame per detected speech segment with segment-to-frame labels in the prompt, schema-constrained decoding, timeline validation with pause snapping, and a self-correction retry. Moving from evenly spaced frames to segment-aligned frames took the local model from 5.5 minutes with a failed first plan to ~70 s with a valid first plan on the same test video.

## Current status

- **What works (tested):** upload, frame sampling and pause detection; offline planning with Gemma 4 E2B end to end (~60–100 s per request on a GTX 1650); validation and self-correction; editable plan with live timeline updates; Keep / Discard / Refine; one-step undo; unsupported-request handling; landing page; desktop and phone layouts.
- **Known limitations / incomplete features:**
  - Cloud providers (Gemma via Gemini API, Claude, OpenAI-compatible) are implemented and their error paths tested, but were **not verified end-to-end with valid keys** during the build.
  - MP4 export uses elah's exporter but was not tested as part of this build.
  - Offline mode is slow on low-end GPUs; one source video per project; the model judges moments from frames, not speech content.
- **What I would improve next:** transcript-aware cuts (local speech-to-text), multi-clip projects, faster offline inference with smaller frame budgets, and verified runs on each cloud provider.

## Demo instructions

```bash
git clone https://github.com/prabii/watch-and-cut && cd watch-and-cut

# Backend (terminal 1)
cd backend && npm install
cp .env.example .env.local   # optional: add API keys; or paste your own key in the app
npm run dev                  # http://localhost:8787

# Frontend (terminal 2)
cd frontend && npm install && npm run dev   # http://localhost:5173

# Offline mode (terminal 3)
ollama serve && ollama pull gemma4:e2b
```

Open http://localhost:5173/app.html?mode=offline, wait for the model chip to turn ready, drop in a 30–90 s video, pick a suggestion and press **Cut**. Then edit the plan, try **Discard**, and try an unsupported request such as "Add a dancing robot".

## Submission checklist

- [x] Project repository is public and links work.
- [x] Required challenge evidence is included.
- [x] Project uses an open-source license where required by the challenge.
- [x] Work and reused materials are represented honestly.
- [x] No API keys, tokens, passwords, or private data are included.
- [ ] I followed the organizers' build window and submission instructions.
