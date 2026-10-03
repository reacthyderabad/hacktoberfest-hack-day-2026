# RepoLens

## Team / attendee

- Team name (if applicable): Solo entry
- Members and GitHub usernames: Rajashekar ([@rajashekarpatha07](https://github.com/rajashekarpatha07))
- Profile links (optional): https://github.com/rajashekarpatha07

## Challenge

Select the challenge you are entering:

- [x] Best Open-Source AI Project
- [ ] Best Use of Gemma 4
- [ ] Build on elah

## Project links

- Public GitHub repository: https://github.com/rajashekarpatha07/RepoLens/
- Open-source license (link to the license file): https://github.com/rajashekarpatha07/RepoLens/blob/main/LICENSE (MIT)

## Problem and solution

**Who is this for?** Developers who are onboarding to, reviewing, or refactoring an unfamiliar TypeScript/JavaScript codebase.

**Problem:** In a large repo it's hard to tell which functions matter most, what breaks when you change something, which code is dead, and where to start reading. Plain LLM chat over source files lacks structural context and tends to hallucinate relationships between functions.

**Workflow (input → output):**
1. **Input:** a Git repo URL or local path.
2. RepoLens clones the repo, builds a function-level call graph, and stores it in Neo4j.
3. It computes criticality metrics (PageRank, betweenness, blast radius, fan-in/out, dead code, cycles).
4. An LLM summarizes functions bottom-up, and a GraphRAG agent answers natural-language questions by querying the graph.
5. **Output:** ranked critical functions, dead-code and cycle reports, AI function summaries, an onboarding reading order, and grounded answers (e.g. "What breaks if I change `pLimit`?") with full tool traces. Available via CLI and REST API.

## Approach and technologies

- **Parsing:** ts-morph (TypeScript Compiler API wrapper) extracts functions, methods, arrows, constructors and accessors, and resolves call edges with the type checker (aliases, interface implementations, cross-file imports).
- **Storage:** Neo4j 5 (`Function`, `File`, `Repo` nodes; `CALLS`, `DEFINED_IN`, `IMPORTS` edges; multi-repo support).
- **Graph analysis:** graphology + graphology-metrics.
- **LLM:** Groq API (OpenAI-compatible), default model `openai/gpt-oss-20b` (open-weight), configurable. Dual API key rotation for rate-limit resilience.
- **Summarization:** bottom-up in topological order, so each prompt includes the function's code plus its callees' summaries. Output is validated with zod and persisted incrementally.
- **GraphRAG agent:** tool-calling loop (max 5 iterations) with tools like `search_functions`, `get_callers`, `blast_radius`.
- **Interfaces:** Commander.js CLI, Fastify REST API with zod validation, Pino logging, Vitest tests.
- **Reused libraries:** simple-git, ts-morph, neo4j-driver, graphology, Fastify, Commander.js, zod, Pino, Vitest.
- **AI-assisted development:** [State honestly which tools you used, e.g. "Parts of the code were written with help from Claude." Delete if none.]

## Challenge evidence

### Best Open-Source AI Project

- Open-source/open-weight AI component and its role: The open-weight `openai/gpt-oss-20b` model (served via Groq) does function summarization and powers the GraphRAG question-answering agent. The project itself is MIT licensed.
- Code link showing the integration: [link to LLM client file], [link to summarizer], [link to GraphRAG agent loop]
- Agent Skill Open Standard compliance (if applicable): Not applicable.
- Original harness implementation or meaningful changes (if applicable): The agent harness is original: a custom tool-calling loop (max 5 iterations) over graph-query tools, which grounds answers in Neo4j results and returns full tool traces. The bottom-up summarization pipeline (topological ordering, callee-summary context, zod validation, incremental persistence, API key rotation) is also original work.

## Current status

- **What works:** Cloning and indexing TS/JS repos; call-graph extraction; Neo4j storage; metrics (PageRank, betweenness, blast radius, dead code, cycles); AI summarization; GraphRAG Q&A; full CLI (`index`, `summarize`, `analyze`, `ask`, `serve`); REST API; demo script (`scripts/demo.sh`).
- **Known limitations / incomplete features:**
  - Dynamic dispatch (callbacks, `call`/`apply`) is not fully resolved
  - Calls through `any`-typed variables can't be resolved
  - Only TypeScript and JavaScript are supported
  - Calls into `node_modules` are counted in stats but not in the graph
  - Interface/abstract method resolution is best-effort
  - Complex monorepos may miss cross-package calls
- **What you would improve next:** A graph visualization frontend using the `/subgraph` endpoint, support for more languages, better dynamic-call resolution, and an evaluation of answer quality.

## Submission checklist

- [x] Project repository is public and links work.
- [x] Required challenge evidence is included.
- [x] Project uses an open-source license where required by the challenge.
- [x] Work and reused materials are represented honestly.
- [x] No API keys, tokens, passwords, or private data are included.
- [x] I followed the organizers' build window and submission instructions.
