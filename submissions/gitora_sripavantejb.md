# Gitora

## Team / attendee

- Team name (if applicable): Solo
- Members and GitHub usernames: sripavantejb ([@sripavantejb](https://github.com/sripavantejb))
- Profile links (optional): https://github.com/sripavantejb

## Challenge

Select the challenge you are entering:

- [x] Best Open-Source AI Project
- [x] Best Use of Gemma 4
- [ ] Build on elah

I am listing two categories and will confirm eligibility with the organizers; evidence for both is below.

## Project links

- Public GitHub repository: https://github.com/sripavantejb/gitora
- Open-source license (link to the license file): [MIT](https://github.com/sripavantejb/gitora/blob/main/LICENSE)

## Problem and solution

**Who it is for:** developers and new contributors facing an unfamiliar GitHub repository, for example someone picking up their first Hacktoberfest issue.

**Problem:** reading a new codebase is slow, and AI chat answers about code are often confident but wrong: invented files, functions and relationships.

**Solution:** Gitty, an evidence-grounded codebase explorer. Open `/<owner>/<repo>/explore` and Gitora:

1. Reads the repository through the GitHub API and statically analyzes up to 160 source files (declarations, imports, services).
2. Draws an interactive **codebase map** from that analysis.
3. Lets you **Ask** questions, or select any node to **Explain** it, see **Why** it exists, or see the **Impact** of changing it. **GitBrief** gives a short explanation of anything clicked; **Learn** suggests a reading order; **Trace** follows a feature across layers.

**Workflow:** repository URL → static analysis + map → Gemma 4 researches with read-only tools → streamed Markdown answer with `[[path:line]]` citations that link to the source. Citations to code Gemma was never shown are rejected.

## Approach and technologies

- **Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Bun.
- **Model:** Gemma 4 (`gemma-4-26b-a4b-it` on Google AI Studio through the Gemini API; `google/gemma-4-31B-it` on Hugging Face Inference as an alternative). Chosen because it is open-weight, strong at tool use, and fast enough for interactive answers.
- **Agent harness (original):** a bounded research loop. Gemma requests up to 3 read-only tool calls per round for up to 4 rounds (`read_file`, `find_symbol`, `find_references`, `get_dependencies`, `get_dependents`, `get_callers`, `get_callees`, `search_code`, `get_git_history`, `trace_feature`, …); the application validates and runs them, then Gemma streams the final answer. It uses native tool calls when the endpoint supports them and falls back to a JSON tool protocol otherwise.
- **Safety and grounding:** relationships (imports, dependents, impact) are computed deterministically, never by the model; citations are validated against the evidence actually shown; outgoing prompts are scrubbed of secrets; the repository is read-only; sensitive paths are excluded.
- **Reliability:** per-request timeouts and retries, a Google AI Studio fallback when the primary Gemma endpoint fails, filtering of Gemma's inline reasoning, and per-IP rate limiting.

**Credits and reused material:** Gitora is built on the open-source [GitDiagram](https://github.com/ahmedkhaleel2004/gitdiagram) project (MIT), which supplies the base Next.js app, GitHub ingestion, source ranking and the AI architecture-diagram generator. Gitty (everything under `src/server/gitty/`, `src/components/gitty/`, `src/features/gitty/` and `src/app/api/gitty/`) was built during the event. Development was AI-assisted with Cursor.

## Challenge evidence

### Best Open-Source AI Project

- Open-source/open-weight AI component and its role: Gemma 4 (open-weight) is central: it chooses which tools to call to gather evidence, then writes every Ask / Explain / Why / Impact / GitBrief / Trace answer. Without it there are only the map and raw source.
- Code link showing the integration:
  - Agent loop: [`src/server/gitty/agent.ts`](https://github.com/sripavantejb/gitora/blob/main/src/server/gitty/agent.ts)
  - Read-only tools: [`src/server/gitty/tools.ts`](https://github.com/sripavantejb/gitora/blob/main/src/server/gitty/tools.ts)
  - Citation validation: [`src/server/gitty/citations.ts`](https://github.com/sripavantejb/gitora/blob/main/src/server/gitty/citations.ts)
  - Static analysis: [`src/server/gitty/analysis/`](https://github.com/sripavantejb/gitora/tree/main/src/server/gitty/analysis)
- Agent Skill Open Standard compliance (if applicable): Not applicable (this is an application with an agent harness, not a skill submission).
- Original harness implementation or meaningful changes (if applicable): The Gitty agent harness is original: bounded tool rounds, native-or-JSON tool protocol with automatic downgrade, an evidence budget, deterministic impact analysis supplied to the model, and post-hoc citation validation.

### Best Use of Gemma 4

- Gemma 4 model identifier and Gemini API integration: `gemma-4-26b-a4b-it` via the Gemini API, either the native `generateContent` / `streamGenerateContent` endpoints or Google AI Studio's OpenAI-compatible endpoint, configured with `GEMMA_API_KEY`.
- Code link showing the integration:
  - Native Gemini API client: [`src/server/gitty/ai/gemma.ts`](https://github.com/sripavantejb/gitora/blob/main/src/server/gitty/ai/gemma.ts)
  - Provider selection and Google AI Studio fallback: [`src/server/gitty/ai/provider.ts`](https://github.com/sripavantejb/gitora/blob/main/src/server/gitty/ai/provider.ts)
  - OpenAI-compatible client: [`src/server/gitty/ai/openai-compatible.ts`](https://github.com/sripavantejb/gitora/blob/main/src/server/gitty/ai/openai-compatible.ts)
- Input and useful output; multimodal value where applicable: Input is a GitHub repository plus a question or a clicked map node; output is a streamed, cited explanation linked to exact lines of source. Gitty currently sends text only (source code and analysis); multimodal input, such as explaining a screenshot of an error or a diagram, is not implemented yet.

## Demo instructions

```bash
git clone https://github.com/sripavantejb/gitora.git
cd gitora
bun install
cp .env.example .env
# In .env set GEMMA_API_KEY=<Google AI Studio key> (or HF_TOKEN=<Hugging Face token>)
# Optional: GITHUB_PAT=<token> for higher GitHub rate limits
bun run dev
```

Open http://localhost:3000/facebook/react/explore (any public `owner/repo` works). Click a node on the map to get a GitBrief, use **Explain**, **Why** or **Impact** on it, or type a question in **Ask** and follow the cited links into the source.

## Current status

- What works: repository analysis and interactive map; Ask with tool-using research and validated citations; Explain / Why / Impact; GitBrief; Learn; Trace; source viewer and command search; Gemma via Google AI Studio, Hugging Face or any OpenAI-compatible endpoint, with automatic fallback.
- Known limitations / incomplete features: text-only (no image input); analysis covers up to 160 files (80 for private repos), so very large repositories are partially mapped; analysis is cached in memory per server instance; the full diagram generator needs extra infrastructure (Cloudflare R2, Upstash Redis, an OpenAI or OpenRouter key).
- What you would improve next: multimodal input (screenshots of errors or diagrams); persistent analysis cache; deeper call-graph analysis for more languages.

## Submission checklist

- [x] Project repository is public and links work.
- [x] Required challenge evidence is included.
- [x] Project uses an open-source license where required by the challenge.
- [x] Work and reused materials are represented honestly.
- [x] No API keys, tokens, passwords, or private data are included.
- [x] I followed the organizers' build window and submission instructions.
