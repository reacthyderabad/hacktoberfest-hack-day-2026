# Maintainer Copilot

## Team / attendee
- Team name (if applicable): Problem Solverz
- Members and GitHub usernames: Mustafa-Mohd
- Profile links (optional): https://github.com/Mustafa-Mohd

## Challenge
- [x] Best Open-Source AI Project

## Project links
- Public GitHub repository: <REPO_URL>
- Open-source license (link to the license file): <REPO_URL>/blob/main/LICENSE

## Problem and solution
- **Target Audience**: Open-source maintainers facing intense floods of pull requests and issues during high-volume community events (e.g. Hacktoberfest).
- **The Problem**: Maintainers are overwhelmed by low-effort spam PRs (empty descriptions, trivial whitespace edits to READMEs), duplicate bug reports, and unstructured issue backlogs. Hosted commercial AI tools introduce recurring token bills, send private repository code to third parties, and lack deterministic safety boundaries.
- **The Solution & Workflow**: Maintainer Copilot provides an end-to-end, local-first triage copilot powered exclusively by local open-weight models via Ollama.
  - **Input**: A target GitHub repository (e.g. `owner/repo`).
  - **Pipeline**:
    1. Fetches open PRs, metadata, and diffs (with strict byte caps and binary filtering).
    2. Evaluates deterministic heuristic rule signals (unfilled templates, generic titles, trivial diffs, unlinked issues, multi-directory spread, author bursts).
    3. Runs local structured LLM inference (`qwen2.5:7b-instruct`) for quality scoring, spam likelihood estimation, and polite feedback suggestion.
    4. Computes semantic embeddings (`nomic-embed-text`) and performs cosine similarity search + LLM reranking to link duplicate issues.
    5. Suggests existing repository labels and flags good-first-issue newcomers.
  - **Output**: Terminal summary table, Markdown report, JSON export, and an interactive Web UI with non-destructive action policies (DRY-RUN by default; never deletes or closes contributor work).

## Approach and technologies
- **Local-First AI & Privacy**: Built from scratch to run 100% locally with zero external API dependencies. All inference runs via Ollama on open-weight models:
  - **Primary LLM**: `qwen2.5:7b-instruct` (Alibaba Cloud, Apache-2.0 license).
  - **Fallback LLM**: `qwen2.5:3b-instruct` (Alibaba Cloud, Apache-2.0 / Qwen license).
  - **Embeddings**: `nomic-embed-text` (Nomic AI, Apache-2.0 license, 768 dimensions).
- **Tech Stack**:
  - Python 3.12, managed with `uv`
  - **CLI**: Typer
  - **API & UI**: FastAPI, Uvicorn, and a dependency-free vanilla JS Web UI
  - **Validation & Settings**: Pydantic v2 and `pydantic-settings`
  - **Storage & Search**: SQLite via SQLAlchemy 2.0 ORM with NumPy cosine vector similarity
  - **Logging & Security**: Structlog JSON logs, prompt-injection isolation tags (`<untrusted_content>`), and Gitleaks secret scanning
  - **Testing**: 54 test cases across Pytest, `pytest-cov`, and RESPX with 77.6% code coverage and strict static typing (`mypy --strict`)
  - **Infrastructure**: Multi-stage non-root Dockerfile, Docker Compose with model initialization, GPU override profile, and Cloudflare Quick Tunnel profile
- **AI-Assisted Development Disclosure**: An AI coding assistant (Antigravity by Google DeepMind) was used during this hackathon session to assist with code authoring, scaffolding, and generating unit tests. Every architecture decision, prompt template, security barrier, database model, and test assertion was reviewed, executed, and verified locally by the submitter.

## Challenge evidence
### Best Open-Source AI Project
- **Open-source/open-weight AI component and its role**:
  The AI component is the central decision engine across triage, deduplication, and labeling:
  1. `qwen2.5:7b-instruct` acts as the primary evaluator: parses raw PR diffs and metadata to generate structured quality scores, spam likelihoods, category classifications, and constructive contributor feedback comments.
  2. `nomic-embed-text` produces 768-dimensional vector embeddings of issue descriptions for semantic candidate matching.
  3. `qwen2.5:7b-instruct` acts as a second-stage reranker on top of cosine similarity to determine whether matched issues are genuine duplicates (`duplicate`), conceptually related (`related`), or distinct (`distinct`).
  4. `qwen2.5:7b-instruct` classifies issues against the repository's existing label vocabulary and determines `good-first-issue` suitability and difficulty.
- **Code link showing the integration**:
  - Core AI Integration Client: [`src/maintainer_copilot/llm/ollama.py`](<REPO_URL>/blob/main/src/maintainer_copilot/llm/ollama.py)
  - Structured LLM Output Schemas: [`src/maintainer_copilot/llm/schemas.py`](<REPO_URL>/blob/main/src/maintainer_copilot/llm/schemas.py)
  - Versioned Prompts & Security Delimiters: [`src/maintainer_copilot/llm/prompts.py`](<REPO_URL>/blob/main/src/maintainer_copilot/llm/prompts.py)
  - PR Triage Orchestrator: [`src/maintainer_copilot/triage.py`](<REPO_URL>/blob/main/src/maintainer_copilot/triage.py)
  - Issue Deduplication & Reranker: [`src/maintainer_copilot/duplicates.py`](<REPO_URL>/blob/main/src/maintainer_copilot/duplicates.py)
  - Label Classifier: [`src/maintainer_copilot/labeling.py`](<REPO_URL>/blob/main/src/maintainer_copilot/labeling.py)
- **Agent Skill Open Standard compliance (if applicable)**: Not applicable (this is an application, not a skill).
- **Original harness implementation or meaningful changes (if applicable)**: Not applicable.

## Current status
- **What works**:
  - End-to-end pull request quality and spam triage with transparent reasoning.
  - Two-stage issue deduplication (Nomic vector similarity + Qwen 2.5 LLM reranking).
  - Repository-constrained label suggestion (strict subset enforcement) and good-first-issue difficulty rating.
  - Safe, non-destructive policy engine (dry-run default; never deletes or closes contributor work).
  - Prompt-injection defenses wrapping all untrusted input in boundary tags.
  - Public demo mode sandbox (`PUBLIC_DEMO_MODE=true`) with IP rate limiting and repository allowlisting.
  - Both Typer CLI and responsive Web UI with live scanning and feedback.
  - 54 passing automated tests with 77.6% code coverage, `mypy --strict` compliance, and verified evaluation harness (`python eval/run_eval.py`).
- **Known limitations / incomplete features**:
  - Evaluation benchmark uses a small 22-example hand-labeled synthetic dataset (`eval/dataset.jsonl`); results demonstrate integration accuracy but do not generalize across all open-source domains.
  - CPU-only execution of 7B LLM models exhibits higher latency (5-15s per item) compared to GPU-accelerated environments.
  - Scans are currently scoped per single repository.
  - No continuous background webhook receiver / GitHub App daemon yet (scans are invoked on-demand via CLI or Web UI).
  - Model verdicts are advisory recommendations requiring human maintainer confirmation.
- **What you would improve next**:
  - GitHub App integration for event-driven automatic triage on incoming webhooks.
  - PostgreSQL + pgvector migration for enterprise-scale repositories with 100,000+ historical issues.
  - Browser extension injecting Maintainer Copilot triage badges directly on GitHub pull request pages.
  - Multi-model ensembling combining lightweight 3B models for initial filtering with larger models for deep architectural analysis.

## Submission checklist
- [ ] The submission repository is public.
- [ ] The submission file contains all required evidence for the chosen challenge.
- [ ] An open-source license is included in the project repository.
- [ ] All work completed during the event is represented honestly, including original work, reused libraries or models, and AI-assisted development.
- [ ] The project repository contains no API keys, tokens, passwords, or other private data.
- [ ] The submission complies with all hackathon rules and track guidelines.
