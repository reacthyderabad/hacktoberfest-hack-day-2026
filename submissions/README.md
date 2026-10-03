# SHOAI — AI Copilot for Video Editing on elah

**Hacktoberfest Hack Day · Hyderabad · Build on elah (ELAHlabs)**

| | |
|---|---|
| **Project** | SHOAI |
| **Repository** | https://github.com/Syrthax/SHOAI |
| **Track** | Build on elah: Conversational Editor |
| **Team** | Samanyu Medepalli · Akash Bhalshankar · Sarthak Ghosh |

---

## One-liner

Describe an edit in plain English ("remove 40 to 50 seconds", "add my name as a lower third", "make the sound louder"). SHOAI turns it into a **validated, structured edit plan**, previews it live on the elah timeline, and lets you **keep, discard or refine** it. The whole AI action is **one undo step**.

## The problem

Video editors are powerful but slow to learn. Simple jobs like cutting a section, adding a caption or fixing quiet audio take many precise clicks. Letting an AI "just edit the video" is risky: you can't see what it will do, and you can't trust or easily reverse it.

## Our solution

The AI never touches pixels or the DOM. It only **proposes** edits as JSON operations. The editor **validates** them, applies them as a **live preview**, and the user decides what to keep.

```
User request ─▶ FastAPI planner ─▶ LLM (Qwen2.5-72B on Featherless)
                     │  Layer 1: Pydantic shape validation + auto-repair
                     ▼
              JSON edit plan ─▶ Layer 2: semantic validation against the real timeline
                     ▼            (clip exists, times in range, clips adjacent…)
       engine.batch(applyPlan)  ─▶ live preview on the elah timeline (one undo entry)
                     ▼
           Keep  │  Discard (engine.undo)  │  Refine (re-plan with feedback)
```

## How we meet the brief

| Requirement | How SHOAI does it |
|---|---|
| Natural language as the starting point | Chat panel: type the edit you want |
| AI plan is structured data, not pixels/DOM | Backend returns JSON operations only; `applyPlan.ts` is the only code that touches the editor, and only through `TimelineEngine` |
| Validate, apply only valid operations | Two layers (Pydantic + timeline checks), one auto-repair round; ops still invalid are **dropped and shown** with the reason, valid ops still apply |
| Preview before keeping | The plan is applied live; each operation can be toggled on/off |
| Request → plan → preview → keep / discard / refine | Full loop in `useAiSession.ts` |
| Whole AI action reversible in one step | Every plan runs inside one `engine.batch()` → a single undo entry; Discard = one `engine.undo()` |
| Unsupported requests handled cleanly | "Make it look like a Marvel movie" → a friendly explanation of what *is* possible |

## AI operations

| Operation | What it does |
|---|---|
| `removeRange` | Cut a time span out of **every track** (video, audio, text) and close the gap, so sound stays in sync |
| `cutStart` / `trim` / `move` | Clip-level timing edits |
| `addLowerThird` / `addSubtitle` | Styled text overlays |
| `addTransition` | Fade / slide / wipe between adjacent clips |
| `setVolume` | Louder, quieter or mute ("make the sound louder") |

## Features

**AI copilot**
- Plan card shows every operation with a checkbox, plus the raw plan JSON, so the AI's contribution is visible.
- An "auto-repaired" badge appears when validation fixed the model's output.
- Refine keeps the plan in context: "make the lower third last 2 seconds".

**Manual editor (for when you'd rather click)**
- Click or drop a video onto the empty timeline to upload; **+ Video** appends more.
- **Split** at the playhead (cuts video and its audio together), **Delete**, drag clip edges to trim.
- **Edit tab:**
  - Add Title / Subtitle / Lower third, then edit the words, size, colour, bold, background box and in/out animations.
  - **Enhance audio**: decodes the real audio, measures its loudness (RMS) and normalises it to clear-speech level without distortion. Plus a volume slider (0–300%) and mute.
  - Speed (0.5x–2x) and opacity.
  - Transitions to the next clip.
- Undo / Redo / Fit-to-window, live timecode.

**Export**
- **Export MP4** renders in the browser (H.264, 1080p) with progress and cancel, and downloads the file.

## Proof it works

- "remove the clip from 4 second to 6 second" on a 20s timeline → an 18.0s export. Frame check: the export shows source time **3.900s** at 3.9s and **6.100s** at 4.1s, so exactly 4–6s was removed and everything else kept.
- **Model reliability:** we benchmarked Featherless models. Qwen2.5-32B returned malformed output 4 times in 6; **Qwen2.5-72B succeeded 6 of 6 and was faster**, so it's the default.
- **CLI:** `python backend/cli.py` runs the exact same planner and validation in the terminal (request → plan → preview → keep/discard/refine → `/undo`), with an offline mode that needs no API key.

## Tech stack

`React 19` · `TypeScript` · `Vite` · `elah (@elah/editor 0.6)` · `WebCodecs` · `WebGL2` · `Python` · `FastAPI` · `Pydantic` · `Featherless AI` · `Qwen2.5-72B-Instruct` · `OpenAI Python SDK` · `patch-package`

## Challenges we solved

- **Ad blockers blanked the app:** AdGuard blocked an icon file named `fingerprint.js`. We pre-bundled the icon library, cutting page-load requests from 1,712 to 233.
- **Safari showed the preview upside down:** we traced it into elah's frame pipeline and shipped a Safari-only fix via `patch-package`.
- **Timeline was misaligned by 20px:** the root cause was a missing `box-sizing: border-box`; one CSS rule fixed it.
- **"Remove 4–6s" kept 4–6s instead:** there was no "cut a middle section" operation, so the model misused `trim`. We added `removeRange` with ripple across all tracks.

## Run it locally

```bash
# Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # add FEATHERLESS_API_KEY
uvicorn app.main:app --reload --port 8000

# Frontend (second terminal)
cd frontend
npm install
npm run dev                     # open http://localhost:5173 in Chrome or Edge
```

Click **Load sample clips** (or upload your own video), then type an edit in the AI Copilot panel.

## 2-minute demo script

1. Upload a video by clicking the empty timeline.
2. **"Remove 4 to 6 seconds and add my name as a lower third at the start"** → show the plan card and JSON → preview → **Keep**.
3. **"Make the sound louder"** → toggle one operation off → Keep.
4. Refine: **"make the lower third last 2 seconds"**.
5. **Discard** a whole AI action in one click; the timeline is restored.
6. **"Make it look like a Marvel movie"** → clean "unsupported" message.
7. Manual polish in the Edit tab (Enhance audio, a transition), then **Export MP4**.
8. One sentence: *"Describe edits in English and get a safe, reviewable plan you can undo in one click. The AI proposes, you decide."*

## What's next

- Edit memory, so follow-ups like "remove what we trimmed" understand earlier edits (in progress).
- Times spoken in original-video time, converted automatically after earlier cuts (in progress).
- Auto-captions from speech, and smart highlight cuts.
