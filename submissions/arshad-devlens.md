# DevLens

## Attendee

- Team name (if applicable): Solo
- Members and GitHub usernames: @arshadpatel
- Profile links (optional): https://github.com/arshadpatel

## Challenge

Select the challenge you are entering:

- [ ] Best Open-Source AI Project
- [x] Best Use of Gemma 4
- [ ] Build on elah

## Project links

- Public GitHub repository: https://github.com/arshadpatel/devlens
- Open-source license (link to the license file): https://github.com/arshadpatel/devlens/blob/main/LICENSE

## Problem and solution

**Who is this for?** Beginner and student developers who hit an error they can't make sense of, such as a wall of stack trace in a terminal, a red browser console, or an IDE popup.

**What problem does it solve?** Error messages are hard to read, and copying them into a search box often loses context. Often the error is only available as a screenshot (a screen share, a phone photo of a lab machine, a bug report image), so it can't even be pasted as text.

**Workflow (input → output):**
1. The user pastes, drops, or uploads a screenshot of an error and optionally adds context ("React app after npm install on Windows").
2. DevLens sends the image to Gemma 4, which reads the screenshot.
3. DevLens shows a structured result:
   - a plain-English summary of what went wrong
   - the likely root cause
   - the exact text Gemma read from the screenshot, as evidence
   - ordered fix steps
   - copy-paste commands
   - a prevention tip
   - a severity rating and a confidence score

## Approach and technologies

- **Frontend:** React 18 with Vite. It handles paste, drag-and-drop and upload, renders the structured result, and provides copy buttons for commands.
- **Backend:** Spring Boot 3 (Java 17). `POST /api/explain` accepts the screenshot as multipart form data, calls Gemma 4, and returns clean JSON. The Gemini API key stays server-side and never reaches the browser. The backend also exposes `GET /api/health`.
- **Model:** Gemma 4 through the Gemini API (`generateContent`), using `gemma-4-26b-a4b-it` by default, with `gemma-4-31b-it` selectable in the UI.
- **Prompting:** The screenshot is sent as an `inline_data` image part alongside an instruction part. The prompt requires a strict JSON schema. The backend strips markdown fences, extracts the outer JSON object, and returns readable errors if the model output can't be parsed.
- **Why this design:** The error is *visual* input, which is where multimodal understanding matters most: the model has to read the text, understand the layout, and identify the tool or framework. A server-side call keeps secrets safe and lets us validate input (image type, 8 MB size limit, model allow-list).
- **Reliability for demos:** A built-in sample error is drawn in the browser. If the live call fails, the sample shows a pre-recorded result with a visible note saying so.
- **Libraries credited:** React, Vite, Spring Boot (Spring Web, Jackson), and the Gemini API.
- **AI-assisted development:** The initial code for this project (frontend, backend, prompt, and this write-up) was generated with Claude (Anthropic) during the hack day build. [FILL IN: one or two sentences on what you ran, configured, changed, or tested yourself.]

## Challenge evidence

### Best Use of Gemma 4

- Gemma 4 model identifier and Gemini API integration: `gemma-4-26b-a4b-it` (default) and `gemma-4-31b-it`, called via `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` with the `x-goog-api-key` header. The model names are in `backend/src/main/resources/application.properties`.
- Code link showing the integration: https://github.com/arshadpatel/devlens/blob/main/backend/src/main/java/com/errorlens/service/GeminiService.java (method `explain(...)`)
- Input and useful output; multimodal value where applicable:
  - **Input:** a screenshot of an error (PNG/JPG) plus optional text context.
  - **Output:** a structured diagnosis with a plain-English summary, root cause, quoted evidence, fix steps, commands, prevention tip, severity and confidence.
  - **Multimodal value:** The error exists only as pixels. Gemma 4 reads the on-screen text, interprets the terminal or console layout, and identifies the framework and tool. The "Read from your screenshot" section shows exactly which text it extracted, so users can verify the diagnosis.

## Current status

- What works: "Tested with the built-in sample and N real screenshots using gemma-4-26b-a4b-it" The app supports paste, drop, or upload of a screenshot; a Spring Boot endpoint that calls Gemma 4 and returns structured JSON; a result view with copy buttons; model switching; a built-in sample with a pre-recorded fallback; and health and missing-key warnings in the UI.
- Known limitations / incomplete features:
  - One screenshot at a time, with no follow-up conversation.
  - No history of past diagnoses.
  - Output depends on screenshot quality (tiny or cropped text lowers accuracy).
  - Gemma may occasionally return malformed JSON, in which case the user has to retry.
  - The fix steps are suggestions; commands should be reviewed before running.
- What I would improve next: A follow-up chat about the error, multi-screenshot and code-file input, a history sidebar, streaming responses, and a diff view that proposes the exact code change for code screenshots.

## Submission checklist

- [x] Project repository is public and links work.
- [x] Required challenge evidence is included.
- [x] Project uses an open-source license where required by the challenge.
- [x] Work and reused materials are represented honestly.
- [x] No API keys, tokens, passwords, or private data are included.
- [x] I followed the organizers' build window and submission instructions.
