# OpenFix AI

## Team / attendee

- Team name (if applicable): Individual submission
- Members and GitHub usernames: Sri Nidhi Kuchana — @srinidhikuchana
- Profile links (optional): https://github.com/srinidhikuchana

## Challenge

Select the challenge you are entering:

- [x] Best Open-Source AI Project
- [ ] Best Use of Gemma 4
- [ ] Build on elah

## Project links

- Public GitHub repository: https://github.com/srinidhikuchana/git-issue-solver-application
- Open-source license: https://github.com/srinidhikuchana/git-issue-solver-application/blob/main/LICENSE
- Live demo: https://git-issue-solver-application.vercel.app/

## Problem and solution

OpenFix AI is designed for developers who want to contribute to unfamiliar open-source GitHub repositories but are unsure where to begin.

New contributors often have to understand a new codebase, read open issues, identify suitable tasks, determine which files are related to an issue, and figure out how to test a fix before they can make a useful contribution.

OpenFix simplifies that process.

The main workflow is:

1. The user pastes a public GitHub repository URL.
2. OpenFix retrieves repository metadata, README content, and open issues using the GitHub API.
3. An open-weight AI model generates a repository overview and performs issue triage.
4. Issues are classified by type, priority, difficulty, skills required, and estimated contributor friendliness.
5. The user selects an issue to investigate.
6. OpenFix retrieves the repository file tree and asks the model to identify likely relevant files.
7. The backend fetches the actual contents of those files.
8. The AI generates an evidence-grounded root-cause explanation, fix plan, files to edit, suggested patch when enough evidence exists, testing steps, and a contribution checklist.

OpenFix also includes an optional multimodal screenshot debugger. A user can upload an error screenshot, terminal output, browser error, or broken UI screenshot. A vision-capable open-weight model analyzes the visible error and provides debugging guidance. If a repository URL is also supplied, repository context is included in the analysis.

## Approach and technologies

OpenFix uses a React + Vite frontend and a Python FastAPI backend.

The frontend provides the repository URL input, repository analysis dashboard, issue triage interface, issue investigation view, patch display, and optional screenshot debugger.

The FastAPI backend communicates with:

- GitHub REST API for repository metadata, README files, issues, repository file trees, and source files.
- OpenRouter as the inference gateway for an open-weight AI model.

The AI component is responsible for repository understanding, issue triage, contribution difficulty estimation, relevant-file selection, code reasoning, root-cause analysis, fix planning, patch suggestions, test planning, and multimodal screenshot analysis.

Technologies used include:

- React
- Vite
- JavaScript
- HTML
- CSS
- Python
- FastAPI
- GitHub REST API
- OpenRouter
- Open-weight multimodal AI
- Render
- Vercel

The project was built specifically for the hackathon. Standard open-source libraries and platform APIs are used. AI assistance was also used during development for implementation guidance, debugging, and iteration.

## Challenge evidence

### Best Open-Source AI Project

- Open-source/open-weight AI component and its role:

OpenFix uses an open-weight AI model accessed through OpenRouter (model : qwen/qwen3-vl-32b-instruct ). The model is a core part of the product rather than a decorative feature. It performs repository summarization, issue classification, contributor difficulty estimation, source-file selection, code reasoning, root-cause analysis, fix planning, suggested patch generation, testing guidance, and optional multimodal screenshot debugging.

- Code link showing the integration:

Backend OpenRouter and model integration:

https://github.com/srinidhikuchana/git-issue-solver-application/blob/main/backend/app.py

Frontend React implementation:

https://github.com/srinidhikuchana/git-issue-solver-application/blob/main/frontend/src/App.jsx

- Agent Skill Open Standard compliance (if applicable):

Not applicable. OpenFix is implemented as a model-powered developer tool rather than an Agent Skill.

- Original harness implementation or meaningful changes (if applicable):

Not applicable. OpenFix is not submitted as a model-harness entry. It is an original application that combines GitHub repository data with open-weight model inference in a custom contribution workflow.

## Current status

- What works:

  - Public GitHub repository URL analysis
  - Repository metadata and README retrieval
  - Open issue retrieval
  - AI-generated repository summary
  - AI issue triage
  - Issue difficulty and contributor-friendliness estimation
  - Repository file-tree analysis
  - Relevant source-file selection
  - Actual repository source-file retrieval
  - Root-cause and fix-plan generation
  - Suggested patch generation when enough repository evidence exists
  - Testing recommendations
  - Contribution checklist generation
  - Optional multimodal screenshot debugging
  - React frontend deployment on Vercel
  - FastAPI backend deployment on Render

- Known limitations / incomplete features:

  - The application currently focuses on public GitHub repositories.
  - AI-generated patches must still be reviewed and tested by a human before being used in a pull request.
  - Repository analysis may be affected by GitHub API rate limits.
  - OpenRouter model availability and rate limits can affect inference.
  - Very large repositories are intentionally limited to a subset of files so the prototype remains fast and demo-friendly.

- What you would improve next:

  - Add deeper repository-wide semantic search using embeddings.
  - Read CONTRIBUTING.md and project-specific contribution rules automatically.
  - Generate a complete pull-request draft after a fix is prepared.
  - Add duplicate-issue detection using semantic embeddings.
  - Add test execution or CI integration for validating generated fixes.
  - Support authenticated/private repositories with secure GitHub OAuth.
  - Improve model fallback handling when a selected OpenRouter endpoint is unavailable.

## Submission checklist

- [x] Project repository is public and links work.
- [x] Required challenge evidence is included.
- [x] Project uses an open-source license where required by the challenge.
- [x] Work and reused materials are represented honestly.
- [x] No API keys, tokens, passwords, or private data are included.
- [x] I followed the organizers' build window and submission instructions.