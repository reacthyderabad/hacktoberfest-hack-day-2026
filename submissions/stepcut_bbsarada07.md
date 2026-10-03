# StepCut

## Team / attendee

- Team name (if applicable): Solo
- Members and GitHub usernames: B. Bhuvana Sarada ([@bbsarada07](https://github.com/bbsarada07))
- Profile links (optional): https://github.com/bbsarada07

## Challenge

Select the challenge you are entering:

- [ ] Best Open-Source AI Project
- [x] Best Use of Gemma 4
- [x] Build on elah

If listing multiple categories, confirm eligibility with the organizers and complete evidence for each.

## Project links

- Public GitHub repository: https://github.com/bbsarada07/stepcut
- Open-source license (link to the license file): https://github.com/bbsarada07/stepcut/blob/main/LICENSE (Apache-2.0)
- Live demo: https://stepcut.vercel.app

## Problem and solution

**Who it's for:** anyone who has to explain a phone task to someone else, like showing a parent how to send money in a payments app. A raw screen recording is too fast, full of dead time, in the wrong language, and often shows private data such as a balance, phone number or UPI ID.

**Workflow:** the user picks a phone screen recording from their gallery and types a request such as "Make a tutorial for my mom in Hindi". StepCut samples frames in the browser and sends them to Gemma 4. Gemma returns a structured plan: 3 to 8 steps with time ranges, a short instruction caption in English and in the requested language, and flags plus bounding boxes for private data on screen. The plan is validated on the server and shown as step cards over an Elah video preview.

## Approach and technologies

- **Next.js 16 (App Router, TypeScript, Tailwind)**, deployed on Vercel.
- **Gemma 4 through the Gemini API** (`@google/genai`), called only from server routes. The key never reaches the client.
  - Vision role: `gemma-4-26b-a4b-it`. Text role: `gemma-4-31b-it`. Each falls back to the other on a rate limit, server error or 25-second timeout. A request makes at most 2 model calls in total.
  - Code refuses to call any model whose name does not contain `gemma-4`.
- **Elah (`@elah/editor` 0.6.0)** for the in-browser video engine and WebGL preview. The stage is set to the recording's exact pixel size, and source audio is muted.
- **In-browser frame sampling:** 6 evenly spaced JPEG frames, 512px wide. A 32×32 greyscale difference marks static frames, which are sent to Gemma as dead-time hints.
- **Credits:** the Elah examples and agent guide (https://github.com/elahlabs/elah) and the Google Gen AI SDK. Significant parts of the code were written with AI assistance (Claude Code), directed and tested by me.

## Challenge evidence

### Best Use of Gemma 4

- Gemma 4 model identifier and Gemini API integration: `gemma-4-26b-a4b-it` (vision/planning) and `gemma-4-31b-it` (fallback), through the Gemini API with `@google/genai`. Uses JSON mode with a response schema and a system instruction.
- Code link showing the integration:
  - Model roles, Gemma-4-only guard, timeout: https://github.com/bbsarada07/stepcut/blob/main/lib/models.ts
  - Multimodal planning route (frames + timestamps → plan JSON, fallback, attempt cap): https://github.com/bbsarada07/stepcut/blob/main/app/api/plan/route.ts
  - Server-side plan validation: https://github.com/bbsarada07/stepcut/blob/main/lib/validatePlan.ts
  - Model availability and latency check: https://stepcut.vercel.app/api/health
- Input and useful output; multimodal value where applicable: the input is a screen recording, sent as timestamped frames, plus a plain-language request. The output is a step-by-step plan whose captions name the exact on-screen buttons, written in the language the request asks for (tested with Hindi and Telugu), with private data detected visually (account balance, phone number, name, UPI ID) and located with bounding boxes. This is only possible because Gemma reads the images: there is no text or accessibility data from the recording.

### Build on elah

- Editing workflow / idea direction and elah version: Your Own Idea. Screen recording → AI step plan → tutorial cut with captions and privacy covers. `@elah/editor` 0.6.0.
- Model/runtime and structured-edit implementation: Gemma 4 returns structured JSON (steps with `startSec`, `endSec`, captions, `sensitive`, `boxes`); the model never touches pixels or the DOM. The server validates the plan: it sorts steps, clamps them to the video duration, removes overlaps, drops steps shorter than 1.5s, truncates captions and discards out-of-range or zero-area boxes. The recording plays in Elah's WebGL `Preview` on a video track, with the stage at the source's pixel size.
- Validation/correction metrics, caption/frame checks, or keep/discard/replay evidence for your option: validation rules are in [lib/validatePlan.ts](https://github.com/bbsarada07/stepcut/blob/main/lib/validatePlan.ts). Applying the plan to the Elah timeline (cut clips, caption text clips, privacy-cover shapes), per-step keep/discard and edit, and refine are **in progress and not yet in this submission**. See Current status.

## Demo instructions

1. Open https://stepcut.vercel.app on a phone or desktop Chrome.
2. Tap **Pick from your gallery** and choose a phone screen recording of 90 seconds or less (for example, sending money in a payments app).
3. Type a request such as `Make a tutorial for my mom in Hindi` and tap **Make tutorial**.
4. After about 10–20 seconds, step cards appear with thumbnails, time ranges, Hindi and English captions, amber "Shows your …" warnings for private data, and "Planned by gemma-4-…".
5. To see a clean error, try a recording longer than 90 seconds.

## Current status

- What works: picking a video (including from a phone gallery), Elah preview with exact stage size and muted audio, in-browser frame sampling with static-frame hints, Gemma 4 multimodal planning with JSON schema, model fallback and a 2-call cap, server-side plan validation, step cards with captions in the requested language, private-data warnings, readable errors with retry, and a Gemma health check endpoint.
- Known limitations / incomplete features:
  - The plan is not yet applied to the Elah timeline. The preview plays the full, uncut recording without captions or covers.
  - Keep/discard per step, caption editing, tweak-by-instruction (`/api/revise`), language switching and one-step undo are not built yet.
  - `gemma-4-31b-it` often takes over 25 seconds to reply on our key, so it acts only as the fallback.
  - Elah shape clips cannot have rounded corners, and Elah text has no right-to-left direction setting (both found in the Elah source).
- What you would improve next: apply the plan to the Elah timeline (cut clips, caption text clips, privacy covers), add keep/discard/edit with one-step undo, add translation through `/api/revise`, and add MP4 export through Elah's export pipeline.

## Submission checklist

- [x] Project repository is public and links work.
- [x] Required challenge evidence is included.
- [x] Project uses an open-source license where required by the challenge.
- [x] Work and reused materials are represented honestly.
- [x] No API keys, tokens, passwords, or private data are included.
- [ ] I followed the organizers' build window and submission instructions.
