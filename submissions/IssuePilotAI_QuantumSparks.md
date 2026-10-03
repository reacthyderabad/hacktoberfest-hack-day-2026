Here is your completed submission form ready to copy and paste directly into your MLH Hack Day submission portal:

---

# IssuePilot AI

## Team / attendee

- **Team name:** QuantamSparks
- **Members and GitHub usernames:**
  - Aryan Shravan Chouti ([@Aryanshravan](https://github.com/Aryanshravan))
  - Rishi Pilla ([@rishipilla](https://github.com/rishipilla))
  - BH Srineer ([@Srineer0204](https://github.com/Srineer0204))
- **Profile links:**
  - Aryan Shravan Chouti: https://www.linkedin.com/in/aryanshravan-chouti-a93876330/
  - Rishi Pilla: https://www.linkedin.com/in/rishi-pilla-9a47a2388/
  - BH Srineer: https://www.linkedin.com/in/srineer-bh-5a8b93339/

## Challenge

Select the challenge you are entering:

- [x] Best Open-Source AI Project
- [ ] Best Use of Gemma 4
- [ ] Build on elah

## Project links

- **Public GitHub repository:** https://github.com/Aryanshravan/QuantamSparks-MLH
- **Open-source license:** [MIT License (LICENSE)](https://github.com/Aryanshravan/QuantamSparks-MLH/blob/main/LICENSE)

## Problem and solution

- **Who is this for?** Beginner and student developers who want to contribute to open-source software but feel overwhelmed by massive, unfamiliar codebases and stale issue tags.
- **Problem it solves:** Finding suitable repositories and beginner-friendly issues on GitHub is time-consuming. Newcomers struggle to parse multi-file repository architectures, understand complex dependency manifests, and prepare acceptable pull requests.
- **Main input → output workflow:**
  $$\text{Public GitHub URL / Code Diff} \longrightarrow \text{Evidence Retrieval (Tree, Manifests, Source)} \longrightarrow \text{Open-Weight Gemma 3 Inference} \longrightarrow \text{Grounded Architecture Guide, Actionable First Issues, & PR Draft}$$

## Approach and technologies

- **Implementation:**
  - **Frontend:** React 19, Vite, Tailwind CSS v4, Lucide React (clean, responsive dark-mode developer UI with real-time model health monitoring).
  - **Backend:** Node.js, Express (ES Modules) providing REST endpoints (`/api/repo-guide`, `/api/first-issues`, `/api/copilot`, `/api/health`).
  - **AI Model:** Google Gemma 3 4B Instruction-Tuned (`google/gemma-3-4b-it`) accessed via Hugging Face Inference Providers (`@huggingface/inference` with direct Router REST fallback).
  - **Data Ingestion:** GitHub REST API v3 for bounded repository tree, manifest parsing (`package.json`, `tsconfig.json`, `requirements.txt`), and raw source code retrieval.
- **Why we chose them:** Gemma 3 4B IT offers state-of-the-art open-weight code reasoning and instruction-following within a lightweight, fast inference footprint suitable for real-time developer workflows.
- **Credits & Reused Libraries:** Standard open-source libraries (`express`, `cors`, `dotenv`, `@huggingface/inference`, `react`, `vite`, `tailwindcss`, `lucide-react`). Built with AI pair-programming assistance from Antigravity.

## Challenge evidence

### Best Open-Source AI Project

- **Open-source/open-weight AI component and its role:** 
  Google's open-weight **Gemma 3 4B Instruction-Tuned model (`google/gemma-3-4b-it`)** is the core reasoning engine driving all three primary workflows:
  1. Synthesizing repository manifests and file trees into structured onboarding guides.
  2. Inspecting raw source code files to discover unhandled edge cases, missing error checks, and testing gaps for first-time contributors.
  3. Generating code reviews, unit test recommendations, Conventional Commits, and PR descriptions in the Contribution Copilot.
- **Code link showing the integration:**
  - Gemma Inference Service: [`server/src/services/gemmaService.js`](https://github.com/Aryanshravan/QuantamSparks-MLH/blob/main/server/src/services/gemmaService.js)
  - Standalone Verification Test: [`server/src/scripts/testInference.js`](https://github.com/Aryanshravan/QuantamSparks-MLH/blob/main/server/src/scripts/testInference.js)
  - Repo Guide Route: [`server/src/routes/repoGuide.js`](https://github.com/Aryanshravan/QuantamSparks-MLH/blob/main/server/src/routes/repoGuide.js)
  - Code Inspection & First-Issue Route: [`server/src/routes/firstIssues.js`](https://github.com/Aryanshravan/QuantamSparks-MLH/blob/main/server/src/routes/firstIssues.js)
  - Contribution Copilot Route: [`server/src/routes/copilot.js`](https://github.com/Aryanshravan/QuantamSparks-MLH/blob/main/server/src/routes/copilot.js)
- **Original harness implementation or meaningful changes:**
  Built a bespoke data-bounding and evidence-injection pipeline in [`githubService.js`](https://github.com/Aryanshravan/QuantamSparks-MLH/blob/main/server/src/services/githubService.js) that grounds model inference strictly in verified repository artifacts, preventing hallucinations and prompt overflow.

## Current status

- **What works:**
  - ✅ **Repo Guide (Feature A):** Complete analysis of public GitHub repositories, generating tech stack citation, directory breakdown, execution instructions, and 3 key concepts.
  - ✅ **AI First-Issue Finder (Feature B):** Code inspection discovering grounded contribution opportunities with difficulty ratings, implementation steps, and suggested tests.
  - ✅ **Contribution Copilot (Feature C):** Interactive diff review, test generation, Conventional Commit message drafting, PR description generator, and step-by-step Git commands.
  - ✅ **Live Health & Ping:** Real-time Gemma 3 inference connection monitoring in the UI header.
- **Known limitations / incomplete features:**
  - Large repositories are analyzed via bounded representative file sampling rather than complete monorepo indexing.
  - AI-suggested code defects are hypotheses that require human developer verification before submitting fixes.
- **What you would improve next:**
  - Contributor skill profiles to match suggested issues to specific programming languages.
  - GitHub OAuth integration for one-click forking and branch creation.
  - Sandboxed WebContainer test runner to execute unit tests directly in the browser.

## Submission checklist

- [x] Project repository is public and links work.
- [x] Required challenge evidence is included.
- [x] Project uses an open-source license where required by the challenge.
- [x] Work and reused materials are represented honestly.
- [x] No API keys, tokens, passwords, or private data are included.
- [x] I followed the organizers' build window and submission instructions.
