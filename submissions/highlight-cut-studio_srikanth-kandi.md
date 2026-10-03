# Highlight Cut Studio

## Team / attendee

- Team name (if applicable): Solo
- Members and GitHub usernames: Srikanth Kandi — [@srikanth-kandi](https://github.com/srikanth-kandi)
- Profile links (optional): https://github.com/srikanth-kandi

## Challenge

- [ ] Best Open-Source AI Project
- [ ] Best Use of Gemma 4
- [x] Build on elah

## Project links

- Public GitHub repository: https://github.com/srikanth-kandi/elah-highlight-cut-hackday
- Open-source license (link to the license file): N/A (Hackday prototype)

## Problem and solution

**Who is this for?** Content creators, video editors, and anyone who needs to quickly cut down raw talking-head or documentary footage into shareable highlights.

**What problem does it solve?** Traditional video editing requires opening a full editor, manually scrubbing timelines, and applying destructive cuts. AI tools that directly manipulate media files are opaque and hard to undo. There is no safe, browser-native, AI-assisted editing workflow that lets the user stay in control at every step.

**Main input → output workflow:**

1. User selects or uploads a video (MP4/WebM).
2. User types a plain-English editing request (e.g., *"Trim the intro, keep the key answer, and add a title card"*).
3. The app sends the request to the **Gemini AI API** (`gemini-2.5-flash`) which returns a **structured JSON edit plan** — never raw pixel or DOM mutations.
4. A **validation layer** checks every operation against a strict allowed-operations schema and video duration bounds.
5. A **visual plan viewer** shows each step (trim, keep-range, caption, title card) with VALID / WARNING / INVALID status badges.
6. The user previews changes live on the HTML5 video player with overlay captions and title cards rendered in real time.
7. The user **approves, rejects, or refines** the plan. Approved plans are saved to a **checkpoint history**.
8. Any approved AI edit can be **reverted in one click** from the checkpoint timeline.

## Approach and technologies

**Implementation:**

- Built as a single-page React 18 app using Vite as the build tool.
- **AI integration:** Uses the Google Gemini REST API (`v1beta`) with a structured JSON system prompt that constrains the model to return only valid, typed editing operations. Primary model is `gemini-2.5-flash` with automatic fallback to `gemini-3.8-flash` and `gemini-2.5-pro` if a model endpoint returns 404.
- **Structured editing:** The AI never touches video bytes. It produces a JSON plan with typed operations (`trimStart`, `trimEnd`, `keepRange`, `removeSection`, `addTitleCard`, `addCaption`). The frontend validator rejects operations outside the allowed list or with out-of-bounds timestamps.
- **Preview engine:** Custom `useTimelineHistory` hook manages checkpoint state. The `VideoPreviewer` component uses an HTML5 `<video>` element with `onTimeUpdate` to auto-skip trimmed sections, render caption overlays, and show title cards.
- **Fallback engine:** A local keyword-based plan generator ensures the demo works offline or without an API key.
- **Sample videos:** Bundled local MP4 assets (`/sample-bunny.mp4`, `/sample-nature.mp4`) plus verified open CDN sources (W3C, VideoJS, Internet Archive) ensure playback always works during demo.

**Technologies used:**

| Technology | Role |
|---|---|
| React 18 | UI framework |
| Vite 5 | Build tool and dev server |
| Google Gemini API (`gemini-2.5-flash`) | AI structured edit plan generation |
| HTML5 Video API | Browser-native video playback and timeline control |
| CSS3 (custom dark theme) | UI styling |
| GitHub | Version control and hosting |

**AI-assisted development:** Antigravity (Google Deepmind) was used as a coding assistant to scaffold components, debug CORS/model-deprecation issues, and write service layer logic. All architecture decisions, prompts, and validation logic were authored by the developer.

## Challenge evidence

### Build on elah

- **Editing workflow / idea direction:** Highlight Cut — turn a plain-English request into a safe, previewable, reversible set of video timeline edits. Aligned with the "browser-based structured editing" direction in the elah challenge brief.
- **Model/runtime:** Google Gemini API (`gemini-2.5-flash`, REST `v1beta`) via browser `fetch`. Structured JSON output enforced through system prompt and response schema validation.
- **Structured-edit implementation:**
  - AI output schema: [`src/services/geminiService.js`](https://github.com/srikanth-kandi/elah-highlight-cut-hackday/blob/main/src/services/geminiService.js) — defines `CANDIDATE_MODELS`, `SYSTEM_INSTRUCTIONS`, and the multi-model fallback loop.
  - Validator: [`src/services/validator.js`](https://github.com/srikanth-kandi/elah-highlight-cut-hackday/blob/main/src/services/validator.js) — checks every operation type, param bounds, and duration constraints. Returns per-operation `VALID` / `WARNING` / `INVALID` status.
  - Plan viewer: [`src/components/PlanFlowViewer.jsx`](https://github.com/srikanth-kandi/elah-highlight-cut-hackday/blob/main/src/components/PlanFlowViewer.jsx) — displays the validated plan before the user approves.
- **Keep/discard/replay evidence:**
  - User can **Approve** → plan is compiled into a `compiledTimeline` and saved as a checkpoint.
  - User can **Reject** → plan is discarded with no changes.
  - User can **Refine** → textarea is cleared for a revised prompt.
  - **Revert to Original** button in the header restores the full unedited timeline in one click.
  - Full checkpoint history: [`src/components/CheckpointHistory.jsx`](https://github.com/srikanth-kandi/elah-highlight-cut-hackday/blob/main/src/components/CheckpointHistory.jsx) and [`src/hooks/useTimelineHistory.js`](https://github.com/srikanth-kandi/elah-highlight-cut-hackday/blob/main/src/hooks/useTimelineHistory.js).

## Current status

- **What works:**
  - Full request → AI plan → validation → plan viewer → approve/reject/refine → video preview → checkpoint → revert workflow.
  - Live video preview with auto-skip of trimmed sections, title card overlays, and caption overlays during playback.
  - Gemini API integration with multi-model automatic fallback (handles deprecated model endpoints).
  - Smart offline fallback engine — demo works without an API key.
  - 7 sample videos available (2 bundled local + 5 verified open CDN URLs) across durations from 5 seconds to 12 minutes.
  - Error overlay shown if a remote video stream cannot load, with guidance to use local samples.
  - Responsive dark-theme UI with checkpoint history panel.

- **Known limitations / incomplete features:**
  - No actual video export — the timeline is simulated in-browser using seek/skip logic rather than re-encoding.
  - `removeSection` operations are visualised in the timeline but playback skip logic is simplified.
  - No multi-track or audio editing support.
  - Caption and title card timing is approximate (HTML5 video `currentTime` based).

- **What you would improve next:**
  - WebCodecs or FFmpeg.wasm integration for real frame-accurate cutting and MP4 export.
  - Streaming Gemini response for faster plan display.
  - Drag-and-drop timeline reordering of AI-generated segments.
  - Multi-language caption generation via Gemini.

## Submission checklist

- [x] Project repository is public and links work.
- [x] Required challenge evidence is included.
- [ ] Project uses an open-source license where required by the challenge.
- [x] Work and reused materials are represented honestly.
- [x] No API keys, tokens, passwords, or private data are included.
- [x] I followed the organizers' build window and submission instructions.
