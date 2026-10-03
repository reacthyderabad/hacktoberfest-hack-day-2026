# GitMate AI

## Team / attendee

- Team name (if applicable): Individual
- Members and GitHub usernames:
  - V. Shiva Prasad Naik — @vadthyashivaprasadnaik
- Profile links (optional):
  - https://github.com/vadthyashivaprasadnaik

## Challenge

Select the challenge you are entering:

- [x] Best Open-Source AI Project
- [x] Best Use of Gemma 4
- [ ] Build on elah

## Project links

- Public GitHub repository: https://github.com/vadthyashivaprasadnaik/GitMate-AI
- Open-source license: https://github.com/vadthyashivaprasadnaik/GitMate-AI/blob/main/LICENSE

## Problem and solution

Git errors can be difficult for beginner and intermediate developers to understand, especially when commands can potentially overwrite or delete work.

GitMate AI is a Git troubleshooting assistant that helps developers understand Git errors and fix them safely.

The workflow is:

**Git command + terminal error/output + optional context → Gemma 4 analysis → structured troubleshooting guidance**

The output includes an error summary, cause, recommended fix, command explanation, risk level, safety warning, alternative solution, verification steps, and a beginner-friendly explanation.

GitMate AI also identifies potentially destructive Git commands and highlights their risk.

## Approach and technologies

GitMate AI uses a React frontend and Python FastAPI backend.

### Technologies

- React + Vite
- Python + FastAPI
- Google GenAI Python SDK
- Gemma 4
- GitHub

The frontend collects the Git command, error/output, and optional context. The FastAPI backend sends the structured request to Gemma 4 and returns a structured JSON response that the React interface displays.

A prompt-based risk classification system identifies destructive Git commands as high risk, potentially risky operations as medium risk, and normally non-destructive operations as low risk.

AI-assisted development was used during implementation for code generation, debugging, prompt design, UI development, and troubleshooting. The final project integration, testing, and safety behavior were reviewed during development.

No external datasets or starter repositories were used.

## Challenge evidence

### Best Open-Source AI Project

- Open-source/open-weight AI component and its role:
  - Gemma 4 is the open-weight AI model used to analyze Git errors, identify causes, recommend fixes, explain commands, and classify command risk.
- Code link showing the integration:
  - https://github.com/vadthyashivaprasadnaik/GitMate-AI/blob/main/backend/ai/gemma.py
  - https://github.com/vadthyashivaprasadnaik/GitMate-AI/blob/main/backend/ai/prompts.py
- Agent Skill Open Standard compliance (if applicable):
  - Not applicable.
- Original harness implementation or meaningful changes (if applicable):
  - GitMate AI includes an original React + FastAPI application harness around Gemma 4, with structured Git-error input, JSON output, safety warnings, risk classification, verification steps, and beginner-friendly explanations.

### Best Use of Gemma 4

- Gemma 4 model identifier and Gemini API integration:
  - Model: `gemma-4-26b-a4b-it`
  - Integrated using the Google GenAI Python SDK in the FastAPI backend.
- Code link showing the integration:
  - https://github.com/vadthyashivaprasadnaik/GitMate-AI/blob/main/backend/ai/gemma.py
- Input and useful output; multimodal value where applicable:
  - Input: Git command, Git error/terminal output, and optional user context.
  - Output: structured troubleshooting guidance including cause, recommended fix, command explanation, risk level, safety warning, alternatives, verification steps, and beginner explanation.
  - The project uses text-based Git troubleshooting; multimodal input is not required for its core use case.

## Current status

- What works:
  - React frontend
  - FastAPI backend
  - Gemma 4 integration
  - Structured troubleshooting responses
  - Git error analysis
  - Risk classification
  - Destructive-command safety warnings
  - Beginner-friendly explanations
  - Verification steps
  - Public GitHub repository
  - MIT license

- Known limitations / incomplete features:
  - GitMate AI analyzes supplied Git commands and terminal output rather than directly executing Git commands.
  - It does not automatically inspect a user's local Git repository.
  - It currently focuses on text-based troubleshooting.

- What you would improve next:
  - Add optional local Git repository diagnostics.
  - Add more Git error test cases.
  - Improve command-specific safety detection.
  - Add GitHub repository integration for repository-aware troubleshooting.
  - Add conversation history for multi-step troubleshooting.

## Submission checklist

- [x] Project repository is public and links work.
- [x] Required challenge evidence is included.
- [x] Project uses an open-source license where required by the challenge.
- [x] Work and reused materials are represented honestly.
- [x] No API keys, tokens, passwords, or private data are included.
- [x] I followed the organizers' build window and submission instructions.
