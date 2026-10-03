# PatchPath

## Team / attendee

- Team name (if applicable): Solo
- Members and GitHub usernames: Hrudai Maduri — @hrudaimaduri
- Profile links (optional): https://github.com/hrudaimaduri

## Challenge

Select the challenge you are entering:

- [x] Best Open-Source AI Project
- [ ] Best Use of Gemma 4
- [ ] Build on elah

## Project links

- Public GitHub repository: [https://github.com/hrudaimaduri/PatchPath]
- Open-source license (link to the license file): [https://github.com/hrudaimaduri/PatchPath/blob/main/LICENSE]

## Problem and solution

PatchPath is an open-source AI-powered GitHub contribution intelligence tool designed to help developers understand unfamiliar codebases and identify where and how to make meaningful changes.

A developer provides a repository and an issue or task. PatchPath investigates the codebase, identifies relevant files and code paths, uses evidence from the repository, and produces a structured implementation blueprint describing what should be changed and where.

The workflow is:

Repository + task → codebase investigation → relevant files/evidence → AI reasoning → structured implementation blueprint.

## Approach and technologies

PatchPath combines repository analysis with an open-weight language model to investigate codebases.

The backend scans relevant repository files, reads selected file contents, gathers evidence, and sends the resulting context to an open-weight Qwen model. The model produces a structured JSON implementation blueprint.

The current implementation uses Qwen/Qwen3-4B-Instruct-2507 through the Hugging Face Router. The system disables unnecessary thinking for the investigation workflow and uses structured JSON output so that the result can be consumed reliably by the application.

The project is open source and is intended to make contribution workflows easier by reducing the time developers spend locating relevant code and understanding where changes belong.

AI-assisted development was used during implementation and debugging, with the resulting work reviewed and integrated into the project.

## Challenge evidence

### Best Open-Source AI Project

- Open-source/open-weight AI component and its role: Qwen/Qwen3-4B-Instruct-2507 is used as the open-weight reasoning/model component. It analyzes repository evidence and produces a structured implementation blueprint.
- Code link showing the integration: [https://github.com/hrudaimaduri/PatchPath/server.js]
- Agent Skill Open Standard compliance (if applicable): Not applicable.
- Original harness implementation or meaningful changes (if applicable): PatchPath implements its own repository investigation workflow, including repository file scanning, evidence collection, context construction, model invocation, and structured blueprint generation.

## Current status

- What works:
  - Repository investigation workflow
  - Repository file scanning
  - Reading relevant source files
  - AI-powered codebase analysis
  - Qwen model integration through the Hugging Face Router
  - Structured JSON implementation blueprints

- Known limitations / incomplete features:
  - The current implementation focuses on repository investigation and implementation planning rather than automatically applying changes.
  - Repository analysis is currently bounded by the number and size of files processed.

- What you would improve next:
  - Improve repository-wide relevance ranking
  - Add deeper dependency and call-graph analysis
  - Improve issue-to-code matching
  - Add optional automated patch generation and validation
  - Support larger repositories more efficiently

## Submission checklist

- [x] Project repository is public and links work.
- [x] Required challenge evidence is included.
- [x] Project uses an open-source license where required by the challenge.
- [x] Work and reused materials are represented honestly.
- [x] No API keys, tokens, passwords, or private data are included.
- [x] I followed the organizers' build window and submission instructions.
