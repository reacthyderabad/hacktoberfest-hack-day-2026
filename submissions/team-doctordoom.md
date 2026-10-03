# Project Name: Doodle Mind

## Team / attendee

- Team name (if applicable): Team DoctorDoom
- Members and GitHub usernames: Rakeshreddy Velamala (rakredv), Hegde Sumanth Shyam (hegdesumanth), Jagadiswar Ambati (jagadiswarambati)
- Profile links (optional): https://github.com/rakredv, https://github.com/hegdesumanth, https://github.com/jagadiswarambati

## Challenge

Select the challenge you are entering:

- [ ] Best Open-Source AI Project
- [x] Best Use of Gemma 4
- [ ] Build on elah

If listing multiple categories, confirm eligibility with the organizers and complete evidence for each.

## Project links

- Public GitHub repository: https://github.com/rakredv/doddle-mind
- Open-source license (link to the license file): https://github.com/rakredv/doddle-mind/blob/main/LICENSE

## Problem and solution

**Who is this for?** School and college students (and parents helping them) who study from a printed or handwritten diagram: a plant cell, a circuit, the water cycle, a flowchart.

**Problem.** A diagram is easy to look at and hard to learn from. Textbooks label the parts but rarely check understanding, and many students would learn better in Telugu or Hindi than in English.

**Solution.** Doodle Mind is a diagram tutor. One photo becomes a full learning loop:

1. **Snap**: upload, drag and drop, or paste a photo of a diagram.
2. **Read**: Gemma 4 identifies the diagram type, the labelled parts and how they relate.
3. **Explain**: a short explanation in English, Telugu or Hindi, at the chosen level ("Explain like I'm 10" or "Exam-ready").
4. **Test**: three questions about specific parts of the diagram, answered in text. There are also Flash cards and a multiple-choice Quiz tab.
5. **Check**: each answer is marked (correct / partial / incorrect) with a short reason and the gap to fix, plus one "what would happen if…" challenge.
6. **Take home**: a one-page printable revision card of key terms and one-line meanings.

**Input → output:** a diagram image plus language and level in; a structured explanation, questions, marks, feedback and a revision card out.

## Approach and technologies

- **Architecture:** React (Vite, Tailwind CSS v4) front end, a stateless Express server and the Gemini API. The browser never talks to Gemini; the server holds the API key (kept in a git-ignored `server/.env`) and validates every model response.
- **AI API:** Gemini API.
- **API:** `POST /api/explain`, `/api/check`, `/api/flashcards`, `/api/quiz`. Errors always return `{ error: { code, message } }`.
- **Model:** `gemma-4-26b-a4b-it` through the `@google/genai` SDK. In our probing it was much faster than `gemma-4-31b-it` (about 1-3s for text and about 10s with an image, versus 12-55s with intermittent 500/503 errors on `31b`), which matters for a live demo.
- **Reliability:** model output is requested as JSON, then validated with zod. On invalid JSON the server retries once and tells the model what was wrong. 5xx errors are retried with backoff.
- **Moderation:** before explaining, a separate Gemma call screens the image. Personal, confidential, sexual, offensive or violent images get a `422 unsafe_image` response. Verdicts are cached by image hash.
- **Image handling:** the client resizes and compresses images before upload. Only JPEG, PNG and WebP are accepted, and both client and server check the file header rather than the extension.
- **Fallback:** bundled sample diagrams with cached responses, so the demo still works if the API or network fails.
- **UI:** minimal, Apple-inspired design with dark mode, a print stylesheet for the revision card, keyboard accessibility, and Noto Sans Telugu and Devanagari fonts.
- **Tests:** Node's built-in test runner (`node --test`) covers the Gemma wrapper, the routes and image type detection.
- **Libraries credited:** React, Vite, Tailwind CSS, Express, zod, `@google/genai`, cors.
- **AI-assisted development:** much of the code was written with Claude Code (Anthropic) under the team's direction and review. The product idea, scope and design direction are the team's.

## Challenge evidence

### Best Use of Gemma 4

- Gemma 4 model identifier and Gemini API integration: `gemma-4-26b-a4b-it` (configured via `GEMMA_MODEL`; `gemma-4-31b-it` was also tested and works), called through the Gemini API with the `@google/genai` SDK. We use `systemInstruction`, native JSON mode (`responseMimeType: 'application/json'`) and `thinkingConfig` with `thinkingLevel: 'MINIMAL'`, which cut a full explain call from about 31s to about 11s.
- Code link showing the integration: https://github.com/rakredv/doddle-mind/blob/main/server/src/gemma.js (`moderateImage`, `explainDiagram`, `generateFlashcards`, `generateQuiz`, `checkAnswers`). Prompts are in `server/src/prompts.js` and schemas in `server/src/schemas.js`.
- Input and useful output; multimodal value where applicable: the diagram image is the core input. Its labels, arrows and spatial layout are read directly by Gemma 4's vision, so the student does not retype anything, which a text-only model could not do. Output is a validated structure: title, diagram type, labelled parts with meanings, an explanation in English, Telugu or Hindi, three questions, per-answer marks with feedback, a challenge question and a revision card. In a live run on a textbook mitochondria diagram, all 6 labels were read correctly and the Telugu output read well. Gemma 4 is also used for the safety check on the uploaded image and for generating flash cards and quizzes.

## Current status

- What works: the full flow end to end. Image upload (drop, picker, paste), language and level selection, explanation, written questions with marking, flash cards, multiple-choice quiz, the printable revision card, image moderation, error states, and a sample-diagram fallback.
- Known limitations / incomplete features:
  - Live latency is noticeable: about 13s for explain and about 9s for check with an image.
  - Telugu and Hindi quality was reviewed by eye on only a small number of diagrams, not systematically.
  - Large-image limits were not tested beyond client-side resizing.
  - Highly cluttered or low-quality photos may give incomplete label recall.
  - The planned `npm run eval` fixture-scoring script is not implemented yet, so we have no measured label-recall numbers.
  - There are no accounts, no history and no streaming (out of scope by design).
- What you would improve next: an eval suite with fixture diagrams to measure label recall, streaming responses to hide latency, voice input, saving revision cards, and more languages.

## Submission checklist

- [x] Project repository is public and links work.
- [x] Required challenge evidence is included.
- [x] Project uses an open-source license where required by the challenge.
- [x] Work and reused materials are represented honestly.
- [x] No API keys, tokens, passwords, or private data are included.
- [x] I followed the organizers' build window and submission instructions.
