# StudyMate AI

Turn a photo of your notes into a study sheet — in five modes: explain, quiz, summarise, solve a
doubt, or build a study plan. Powered by **Gemma 4** (multimodal) via the **Gemini API**.

## Team / attendee

- Team name (if applicable): Team StudyMate
- Members and GitHub usernames: Md karim (@mdkarim6599), Abbani Vaishnavi (@abbanivaishnavi), minnatullah (@Minnatullah1)
- Profile links (optional): https://github.com/mdkarim6599 · https://github.com/abbanivaishnavi · https://github.com/Minnatullah1

## Challenge

Select the challenge you are entering:

- [ ] Best Open-Source AI Project
- [x] Best Use of Gemma 4
- [ ] Build on elah

## Project links

- Public GitHub repository: https://github.com/mdkarim6599/gemma4-hackday-2026
- Open-source license (link to the license file): https://github.com/mdkarim6599/gemma4-hackday-2026/blob/main/LICENSE (MIT)

## Problem and solution

**Who is this for?** Students revising from **photos of handwritten notes, textbook pages and
diagrams**.

**Problem:** turning that raw material into something you can actually *study from* — a simple
explanation, practice questions, a summary, or a plan for the days you have left — is slow manual
work. Generic chatbots return an unstructured wall of text with nothing to practise against.

**Main input → output workflow:**

```
INPUT:  a photo of notes/diagram, pasted notes, a typed topic, or a question
        + difficulty (Beginner / Intermediate / Exam-ready)
        + language (English / Hinglish)
                    │
                    ▼
        Gemma 4 (multimodal) reads the material
                    │
                    ▼
OUTPUT: a structured study sheet, in one of five modes
        1. Explain a topic   → explanation · analogy · key points · exam keywords
        2. Generate a quiz   → 3–8 MCQs · live scoring · answer explanations
        3. Summarise notes   → tight summary · key points · exam keywords
        4. Solve a doubt     → concept · analogy · worked example · code · dry run
        5. Build a study plan → day-by-day plan · tasks · a self-test per day
```

## Approach and technologies

- **UI:** Python + **Streamlit** (`app.py`) — a mode picker, adaptive inputs (photo / pasted text /
  topic / question / topics+days), and a mode-specific sheet layout with live quiz scoring.
- **AI step:** `gemma_client.generate_study_pack()` calls **Gemma 4** through the **Gemini API**
  with `google-genai`. Each mode builds its own prompt and asks for **JSON only** against a fixed
  schema; the model reads images directly when a photo is supplied.
- **Validation:** the JSON is parsed and validated into a `StudyPack` object (MCQ count, 4 options
  each, `answer_index` clamped to range; keywords and plan entries cleaned; fields a mode does not
  use are dropped). Malformed output is retried once; if the API fails, a cached example sheet for
  that mode is shown so a live demo never breaks. The UI only renders validated structured data.
- **Why these choices:** Streamlit plus one structured model call per mode keeps the whole workflow
  deliverable and demoable quickly, and forces the model's output to be structured rather than a
  chat reply.

## Challenge evidence

### Best Use of Gemma 4

- **Gemma 4 model identifier and Gemini API integration:** `gemma-4-26b-a4b-it` (Gemma 4,
  open-weights, served through the Gemini API) — called against
  `generativelanguage.googleapis.com` with the official `google-genai` SDK; the model id is
  configurable via `GEMMA_MODEL` and the key is read from `.env` (`GEMINI_API_KEY`).
- **The AI is central to the workflow:** all five modes are one Gemma 4 call each — without the
  model there is no study sheet at all. In quiz mode the model writes the questions, the options,
  the correct answer index and the explanation; the app only scores the student's choice.
- **Code link showing the integration:**
  [`gemma_client.py` → `generate_study_pack()`](https://github.com/mdkarim6599/gemma4-hackday-2026/blob/main/gemma_client.py)
  (builds the per-mode prompt + JSON schema, sends the image and/or text, validates the response).
- **Input and useful output; multimodal value:** the student's real input is a **photo of notes**,
  not typed text. Gemma 4 reads the image **directly** (no separate OCR step), then produces the
  structured sheet. Multimodality adds value because the source material is visual — including
  handwriting, layout and small diagrams — and the same model converts that understanding into
  study material. Output is immediately useful: a readable explanation, exam keywords, and a quiz
  the student can attempt and score.

## Current status

- **What works:** all five modes end to end (explain, quiz, summarise, doubt, plan) with a single
  photo/text/topic/question input; difficulty and language (English/Hinglish) controls; MCQ
  generation with live scoring and answer explanations; JSON validation with retry; a per-mode cached
  fallback sheet for demo safety.
- **Known limitations / incomplete features:** no accounts or saved history; the quiz is self-scored
  on one page; the study plan is generated on request rather than tracked over time.
- **What you would improve next:** save study packs per topic, spaced-repetition reminders, and
  progress tracking against the study plan.

## Submission checklist

- [x] Project repository is public and links work.
- [x] Required challenge evidence is included.
- [x] Project uses an open-source license where required by the challenge (MIT).
- [x] Work and reused materials are represented honestly.
- [x] No API keys, tokens, passwords, or private data are included (`.env` is gitignored).
- [x] I followed the organizers' build window and submission instructions.
