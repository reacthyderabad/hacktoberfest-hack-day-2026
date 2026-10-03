# TraceLens

> See the bug. Trace the code. TraceLens turns screenshot-only GitHub bug reports into a grounded diagnosis with Gemma 4.

## Team / attendee

- Team name (if applicable): Team Penguin
- Members and GitHub usernames:
  - Shresta ([@shresta204-ops](https://github.com/shresta204-ops))
  - Bhanodai
  - Kalyan
- Profile links (optional): https://github.com/shresta204-ops

## Challenge

Select the challenge you are entering:

- [ ] Best Open-Source AI Project
- [x] Best Use of Gemma 4
- [ ] Build on elah

## Project links

- Public GitHub repository: https://github.com/shresta204-ops/Team_Penguin
- Open-source license (link to the license file): [MIT](https://github.com/shresta204-ops/Team_Penguin/blob/main/LICENSE)
- Demo issues (live on GitHub):
  - [#1 "Profile page broken"](https://github.com/shresta204-ops/Team_Penguin/issues/1): planted bug, gets a full diagnosis
  - [#2 "dashboard looks weird"](https://github.com/shresta204-ops/Team_Penguin/issues/2): vague report; TraceLens asks the reporter instead of guessing

## Problem and solution

**Who it's for:** maintainers of open-source UI projects (React, Vue and Svelte apps, component libraries, dashboards), and the first-time contributors who pick up their issues.

**Problem:** visual bugs don't throw errors. Maintainers get issues that contain only a screenshot and a line like "after login my name is gone??", with no stack trace and no repro steps. They have to work out what is wrong in the picture, find the file that renders that part of the screen, and then decide whether to fix it, label it for a contributor, or ask for more details.

**Workflow (input → output):**

1. Paste a GitHub issue link and click **Triage issue**. The issue's screenshot is downloaded; if that fails, you can upload it manually.
2. **Gemma 4 call 1 ("look")** reads the screenshot together with the issue text. It returns what is visibly wrong, the expected result, the fixed on-screen text (for "Welcome back, undefined!" it returns "Welcome back"), keywords, and a box around the broken area.
3. TraceLens searches the repository for that exact on-screen text, follows relative imports one level, and shows the matching code next to the screenshot with the text highlighted.
4. **Gemma 4 call 2 ("diagnose")** receives the screenshot and the numbered code. It returns the root cause, evidence (file and line), a one-line patch, labels, difficulty and confidence.
5. **Grounding check:** citations to files that were not fetched are dropped, line numbers are clamped, and code snippets always come from the real file. A patch survives only if its "before" line exists word-for-word in the repo.
6. The maintainer edits the draft triage comment and clicks **Post to GitHub**, which posts the comment and adds labels such as `bug` and `good first issue`. Nothing is posted without that click.

If the screenshot is not enough to identify a problem, TraceLens drafts a polite question asking the reporter for specific details instead of guessing.

## Approach and technologies

- **AI:** Gemma 4 (`gemma-4-26b-a4b-it`) through the Gemini API using the official `@google/genai` SDK. The model id is a `GEMMA_MODEL` env var (`gemma-4-31b-it` also works). The whole integration lives in one small file, [`server/gemma.js`](https://github.com/shresta204-ops/Team_Penguin/blob/main/server/gemma.js): image and text in, parsed JSON out, with code-fence stripping and one retry on invalid JSON.
- **Why Gemma 4:** strong image understanding for reading UI screenshots, and open weights, so teams could later self-host it for private code.
- **Server:** Node.js + Express. GitHub REST API for issues, the repo tree, file contents, comments, labels and issue search. Keys stay server-side in `server/.env`; the browser only calls the app's own `/api/*` routes.
- **Client:** React 18 + Vite, with a UI based on our team mockup (stepper, side-by-side evidence, red/green patch, editable draft comment).
- **Other features:** issue inbox (a repo's open issues with screenshots), similar-issue detection, a folder filter for monorepos, Markdown export, a settings page, optional Sign in with GitHub (OAuth), and saved results for offline rehearsal.
- **Libraries:** express, @google/genai, dotenv, react, react-dom, vite, marked, dompurify.
- **AI-assisted development:** much of the code was written with Claude Code (Anthropic) from our written build brief. The team reviewed it and tested it against live Gemma 4 and GitHub.
- **Demo repo:** a small React dashboard in `demo-repo/` with a **deliberately planted bug** (`Dashboard.jsx` line 17 reads `user.fullname`, but the mock API returns `name`), so the demo is reliable.

## Challenge evidence

### Best Use of Gemma 4

- **Gemma 4 model identifier and Gemini API integration:**
  - Model: `gemma-4-26b-a4b-it` (configurable through `GEMMA_MODEL`), confirmed available on our key with `models.list`.
  - Integration: Gemini API through `@google/genai`, `ai.models.generateContent()` with `inlineData` image parts.
- **Code link showing the integration:**
  - Client: [`server/gemma.js`](https://github.com/shresta204-ops/Team_Penguin/blob/main/server/gemma.js)
  - Prompts: [`server/prompts.js`](https://github.com/shresta204-ops/Team_Penguin/blob/main/server/prompts.js)
  - Pipeline and grounding: [`server/pipeline.js`](https://github.com/shresta204-ops/Team_Penguin/blob/main/server/pipeline.js)
- **Input and useful output; multimodal value where applicable:**
  - **Input:** a GitHub issue whose only evidence is a screenshot.
  - **Output:** "what Gemma sees" (the problem, the expected result, the on-screen text, a box on the screenshot); the exact file and line that renders it; a verified one-line patch; labels; and a ready-to-post triage comment.
  - **Multimodal value:** the image is the only evidence. Gemma 4 reads the fixed UI text off the screenshot, which becomes the search key that finds the code. The second call reads the screenshot and the code together to explain the bug.
  - **Measured on our live demo issues:** issue #1 → `demo-repo/src/components/Dashboard.jsx:17`, fix `user.fullname` → `user.name`, high confidence, `good first issue`. Issue #2 → asks the reporter for details.

## Demo instructions

```bash
git clone https://github.com/shresta204-ops/Team_Penguin.git
cd Team_Penguin/server && npm install
cp .env.example .env   # add GEMINI_API_KEY and GITHUB_TOKEN (Issues read/write, Contents read)
cd ../client && npm install && npm run build
cd ../server && npm start   # open http://localhost:8787
```

1. Paste `https://github.com/shresta204-ops/Team_Penguin/issues/1` and click **Triage issue**. Optionally, limit the search to the `demo-repo/` folder.
2. Watch the five steps; within seconds, "What Gemma 4 sees" appears with "Welcome back" read off the screen.
3. Review the highlighted line 17, the diagnosis and the red/green patch, then click **Post to GitHub**.
4. Paste issue #2: TraceLens asks the reporter instead of guessing.
5. Fallback without API access: open `http://localhost:8787/?saved=<owner>-<repo>-<n>` to replay a saved result.

The full 2-minute script and judge Q&A are in [DEMO.md](https://github.com/shresta204-ops/Team_Penguin/blob/main/DEMO.md).

## Current status

- **What works:**
  - The end-to-end flow on live GitHub issues with live Gemma 4: screenshot download, the look call, code search with import following, the diagnose call, the grounding check, the patch, posting the comment with labels, and the ask-the-reporter path.
  - The issue inbox, folder filter, similar issues, Markdown export and saved-result replay.
- **Known limitations / incomplete features:**
  - The search fetches at most 80 source files, so it is not built for large monorepos.
  - Bugs whose text comes from an API or a translation file are not found by the text search.
  - Triage time depends on Gemini API load: about 25 s typically, but we saw up to 85 s on a busy API.
  - The **Sign in with GitHub (OAuth)** code is built, but the full GitHub login round trip has not been tested with a real OAuth App.
  - The demo bug is planted.
- **What you would improve next:**
  - A GitHub Action that triages new screenshot issues automatically.
  - Self-hosted Gemma for private repositories.
  - Code-search-based ranking for large repos.
  - Opening a pull request with the verified patch.

## Submission checklist

- [x] Project repository is public and links work.
- [x] Required challenge evidence is included.
- [x] Project uses an open-source license where required by the challenge.
- [x] Work and reused materials are represented honestly.
- [x] No API keys, tokens, passwords, or private data are included.
- [x] I followed the organizers' build window and submission instructions.
