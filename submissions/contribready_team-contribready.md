# ContribReady — From GitHub Issue to Contribution-Ready

## Team / attendee

- Team name (if applicable): Team ContribReady
- Members and GitHub usernames: @ysathyasai
- Profile links (optional): https://github.com/ysathyasai

## Challenge

Select the challenge you are entering:

- [x] Best Open-Source AI Project
- [x] Best Use of Gemma 4
- [ ] Build on elah

If listing multiple categories, confirm eligibility with the organizers and complete evidence for each.

## Project links

- Public GitHub repository: https://github.com/ysathyasai/ContribReady
- Open-source license (link to the license file): https://github.com/ysathyasai/ContribReady/blob/main/LICENSE (MIT License)
- Live Deployment: https://contribready.onrender.com

## Problem and solution

### Who is this for?
Students, aspiring open-source contributors, and intermediate developers who find an intriguing GitHub issue but struggle with the barrier to entry:
- Unclear what the issue description actually means in codebase terms.
- Difficulty locating which files and functions must be touched.
- Uncertainty about what foundational concepts (async lifetimes, idempotency, reconciler fibers) are required.
- Fear of submitting an unprepared pull request that wastes maintainers' time.

### What problem does it solve?
ContribReady bridges the critical gap between **"I found a GitHub issue"** and **"I am prepared to solve this issue."**

### Core Input → Output Workflow:
1. **Input:** User pastes any public GitHub Issue URL (e.g. `https://github.com/expressjs/express/issues/5482`).
2. **Context Engine:** Backend extracts issue details, repository directory tree, and trims noisy assets (vendor, node_modules) to retrieve the top candidate source files.
3. **Open-Weight AI:** Analyzes the issue and code context to synthesize:
   - Plain-English issue explanation
   - Expected architectural change
   - Relevant source files with importance ratings & line-by-line inspection
   - Required technical concepts with interactive self-assessment
   - Knowledge gaps and prerequisite warnings
   - Step-by-step preparation path and practice task
4. **Readiness Check:** Dynamic repository-specific quiz tests the contributor's mental model.
5. **Readiness Assessment & Launchpad:** AI evaluates answers, displays clear score and readiness verdict, and provides an actionable contribution checklist before opening the original issue on GitHub.

## Approach and technologies

- **Frontend:** React 19, Vite 8, Tailwind CSS v4, Lucide React icons, Canvas Confetti.
- **Backend:** Node.js, Express, Axios.
- **Repository Context Engine:** Heuristic keyword matching between issue descriptions and recursive Git tree blobs, intelligent noise filtering, and token-safe content truncation.
- **Open-Weight AI Layer:** Pluggable AI architecture supporting open-weight models:
  - **Google Gemma 4 (`gemma-4-31b-it`) & Gemma 2** via Google Generative Language / Gemini API
  - **Llama 3.3 70B** via Groq / OpenRouter
  - **Ollama** for 100% offline, local open-weight model execution
  - **Verified benchmark synthesis engine** for bulletproof hackathon demo reliability

## Challenge evidence

### Best Open-Source AI Project

- **Open-source/open-weight AI component and its role:**
  Open-weight AI (Gemma 4 / Gemma 2 / Llama 3.3) serves as the central reasoning engine of the platform. Rather than a superficial chatbot, the AI performs the core repo analysis: diagnosing the issue, connecting it to repository code modules, defining required technical concepts, and generating repository-specific readiness tests.
- **Code link showing the integration:**
  - AI Service layer: https://github.com/ysathyasai/ContribReady/blob/main/backend/services/ai/aiService.js
  - GitHub Context Engine: https://github.com/ysathyasai/ContribReady/blob/main/backend/services/github.js
  - Quiz Evaluation Engine: https://github.com/ysathyasai/ContribReady/blob/main/backend/services/quizService.js
- **Agent Skill Open Standard compliance (if applicable):**
  N/A
- **Original harness implementation or meaningful changes (if applicable):**
  Custom multi-model orchestration harness implementing dynamic fallback chaining across Google AI (Gemma 4), Groq, OpenRouter, and Ollama with JSON schema repair, resilient retry handling, and deterministic repository AST synthesis fallback.

### Best Use of Gemma 4

- **Gemma 4 model identifier and Gemini API integration:**
  Integrated directly with Google's open-weight Gemma 4 model `gemma-4-31b-it` through the Google Generative Language / Gemini API (`v1beta/models/gemma-4-31b-it:generateContent`) via environment variables `AI_PROVIDER=gemini`, `AI_MODEL=gemma-4-31b-it`, and `GEMINI_API_KEY`.
- **Code link showing the integration:**
  https://github.com/ysathyasai/ContribReady/blob/main/backend/services/ai/aiService.js#L201-L280 (`callGeminiModel`)
- **Input and useful output; multimodal value where applicable:**
  Takes structured GitHub Issue metadata + extracted repository code AST snippets and produces structured JSON containing issue understanding, file relevance, concept learning paths, and interactive readiness assessments.

## Current status

- **What works:**
  - GitHub issue URL validation and automatic parameter extraction
  - Live GitHub API integration fetching issues, comments, metadata, and git trees
  - Heuristic file relevance scoring and source snippet extraction
  - Open-weight AI integration with structured JSON schema enforcement
  - Interactive dashboard with 5 distinct workflow views
  - Mini-Learning Mode with concept self-assessment (`I know this` / `Need to learn`)
  - Interactive 4-question readiness quiz with instant AI grading and score percentage
  - Actionable Contribution Launchpad with maintainer checklist and GitHub issue link
  - Interactive "Ask About This Issue" context-grounded AI chat assistant
  - 1-click safe demo mode with verified benchmark open-source issues
  - Fully deployed and live on Render: https://contribready.onrender.com
- **Known limitations / incomplete features:**
  - Very large files (>6,000 chars) are partially truncated to fit within model context windows.
- **What you would improve next:**
  - Add visual Git dependency graph showing function call relationships across relevant files.
  - Implement automated local git clone command generation and pre-configured devcontainer setup.

## Submission checklist

- [x] Project repository is public and links work.
- [x] Required challenge evidence is included.
- [x] Project uses an open-source license where required by the challenge.
- [x] Work and reused materials are represented honestly.
- [x] No API keys, tokens, passwords, or private data are included.
- [x] I followed the organizers' build window and submission instructions.
