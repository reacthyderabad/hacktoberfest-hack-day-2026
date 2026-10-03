# Lens

## Team / attendee

- Team name (if applicable): The Merge Conflicts
- Members and GitHub usernames:
  - Abhinav Bansal — [@CaZ-dev](https://github.com/CaZ-dev)
  - [Disha Jain] — [@disha-jain16](https://github.com/disha-jain16)
- Profile links (optional): https://github.com/CaZ-dev, https://github.com/disha-jain16

## Challenge

Select the challenge you are entering:

- [ ] Best Open-Source AI Project
- [x] Best Use of Gemma 4
- [ ] Build on elah

## Project links

- Public GitHub repository: https://github.com/CaZ-dev/TheMergeConflicts
- Open-source license (link to the license file): https://github.com/CaZ-dev/TheMergeConflicts/blob/main/LICENSE

## Problem and solution

**Who is this for?** Frontend developers, designers and indie builders who ship UI without a dedicated design or accessibility reviewer.

**What problem does it solve?** Design and accessibility problems are obvious once someone points at them, and invisible until someone does. Linters can't judge visual hierarchy, contrast in context, or whether a destructive button is louder than the primary action.

**Workflow (input → output):**
1. **Input:** Drop, paste or browse to a screenshot of any interface. You can add optional notes.
2. Lens works out whether it is a mobile, tablet or desktop capture and its approximate CSS width. It downscales the image to 1536px and sends it to Gemma 4 through the Gemini API.
3. Gemma 4 returns a structured JSON audit. Each finding has a severity, title, observation, a one-line fix and a bounding box.
4. **Output:** Numbered boxes are drawn directly on the screenshot, linked to an issue list. Hovering a card highlights its region. You can filter by severity.
5. **Hand-off:** "Copy fixes as agent prompt" opens an editable prompt with all the visible fixes, ready to paste into a coding agent.

## Approach and technologies

- **Model:** `gemma-4-26b-a4b-it` (the sparse MoE variant) by default, chosen for low latency in a live demo. You can switch to `gemma-4-31b-it` with `GEMMA_MODEL` for higher quality.
- **API:** Gemini API `generateContent` endpoint. The image is sent as inline base64. Temperature is 0.2 and there is a system instruction, which falls back to inline if the model rejects it.
- **Frontend:** React 19, Vite 7 and Tailwind CSS 4.
- **Backend:** A Vite dev-server middleware serves `POST /api/audit`, so the app runs as a single process and the API key never reaches the browser.
- **Key design decisions:**
  - Gemma returns `box_2d` as `[ymin, xmin, ymax, xmax]` normalized to 0–1000. Boxes are drawn as percentage-positioned divs, so there is no scaling math and they stay aligned at any window size. Each box is a focusable button with an accessible name.
  - Gemma on the Gemini API has no `responseSchema`, so the JSON contract is set in the prompt. A tolerant parser strips code fences and slices to the outermost braces. If that fails, the request is retried once with a repair prompt.
  - Every box is validated and clamped (`shared/normalize.js`). A malformed box is dropped, but its issue stays in the list marked "no region", so the app never crashes on a bad coordinate.
  - Severity rules change with the inferred device type (`shared/viewport.js`).
- **Credits:** React, Vite, Tailwind CSS and the Google Gemini API. No external datasets or starter templates were used. The sample screenshot and its cached audit (`src/fixtures/sample-audit.json`) were hand-made for an offline demo and are always labelled "Cached sample response" in the UI. AI coding assistants (Claude Code) were used during development. [Adjust to match what you actually used.]

## Challenge evidence

### Best Use of Gemma 4

- **Gemma 4 model identifier and Gemini API integration:** `gemma-4-26b-a4b-it` (default), configurable to `gemma-4-31b-it`. It is called through `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` with the screenshot as an inline image part.
- **Code link showing the integration:**
  - API call, JSON extraction and repair retry: https://github.com/CaZ-dev/TheMergeConflicts/blob/main/server/audit.js
  - Prompt and JSON contract: https://github.com/CaZ-dev/TheMergeConflicts/blob/main/server/prompt.js
  - Box validation: https://github.com/CaZ-dev/TheMergeConflicts/blob/main/shared/normalize.js
  - Endpoint wiring: https://github.com/CaZ-dev/TheMergeConflicts/blob/main/vite.config.js
- **Input and useful output; multimodal value:** The input is a UI screenshot (image) plus optional text notes. The output is a structured audit of issues, each with a severity, explanation, fix and a pixel region drawn on the image. The multimodal part is the core of the product, not an add-on: Gemma has to reason about the pixels themselves, such as relative visual weight, contrast, spacing and alignment. A correctly placed box shows the model is grounded in the image. For example, it flags that a destructive "Delete all" button is visually louder than "Save", which no linter or text-only model could detect. Without Gemma 4 there is no product.

## Current status

- **What works:**
  - Live audits of any screenshot (drop, paste or browse) with bounding-box overlays
  - Viewport and device inference
  - Severity filtering and hover-to-highlight between the list and the boxes
  - Editable "agent prompt" export with clipboard copy
  - Offline demo mode (`?demo=1`) with a clear live/cached badge
  - Graceful handling of malformed boxes and non-JSON responses
- **Known limitations / incomplete features:**
  - Bounding-box precision varies, especially for small elements and dense UIs.
  - The API endpoint lives in Vite's dev server middleware, so there is no production backend yet.
  - Only single screenshots are supported, with no multi-page flows.
  - The JSON output is enforced by the prompt, not a schema, so it relies on the repair retry.
- **What you would improve next:**
  - A standalone deployable backend
  - Before/after comparison to confirm fixes
  - Auditing a full user flow across several screens
  - A browser extension or Figma plugin for one-click capture
  - Benchmarking box accuracy across the 26B MoE and 31B models

## Submission checklist

- [x] Project repository is public and links work.
- [x] Required challenge evidence is included.
- [x] Project uses an open-source license where required by the challenge.
- [x] Work and reused materials are represented honestly.
- [x] No API keys, tokens, passwords, or private data are included.
- [x] I followed the organizers' build window and submission instructions.
