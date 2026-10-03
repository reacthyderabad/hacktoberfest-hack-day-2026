# m.AI.leage

## Team / attendee

- Team name (if applicable): token gobblers
- Members and GitHub usernames: Narra Dhanvi (@DhanviND360)
- Profile links (optional): https://github.com/DhanviND360

## Challenge

Select the challenge you are entering:

- [x] Best Open-Source AI Project
- [ ] Best Use of Gemma 4
- [ ] Build on elah

## Project links

- Public GitHub repository: https://github.com/DhanviND360/m.AI.leage
- Open-source license (link to the license file): https://github.com/DhanviND360/m.AI.leage/blob/main/README.md

## Problem and solution

### Who is this for?
Developers, solo builders, and engineering teams who want a local-first, privacy-respecting autonomous AI pair programmer that runs 100% offline using open-weight models, provides hands-free voice control, executes real test-driven repair loops, and escalates gracefully to cloud AI (GitHub Copilot) only when local models hit overcapacity.

### What problem does it solve?
1. **Privacy & API Costs**: Cloud AI coding assistants leak proprietary workspace code and incur continuous token subscription costs.
2. **Local Model Reliability**: Local models often hallucinate, produce malformed JSON, or struggle with complex multi-step coding tasks.
3. **No Overcapacity Strategy**: Developers are forced to choose between 100% cloud or 100% local. m.AI.leage bridges this by keeping routine, private tasks 100% local, and escalating with full context to GitHub Copilot only when local capacity is exceeded.

### Main Workflow (Input → Output)
1. **Launch (`mileage start`)**: Starts a Claude-Code-style persistent workspace with a speedometer companion mascot and hands-free voice listening.
2. **Intent Planning**: User speaks a goal (e.g. *"Add fibonacci utility function with unit tests"*). Open-weight **Gemma** structures it into a strict `ActionPlan` with prioritized requirements (`R1`, `R2`) and testable acceptance criteria (`AC1`, `AC2`).
3. **Model Routing**: Router selects the optimal local model (e.g., `qwen2.5-coder`) based on task complexity.
4. **Autonomous Coding Loop**: The Coding Agent executes an inspect-plan-edit-test-repair loop using permission-scoped file tools.
5. **Native Testing & Repair**: Automatically discovers and runs project tests (`pytest`, `npm test`, `cargo test`, `go test`). If a test fails, the agent diagnoses the failure and applies autonomous code repairs.
6. **Acceptance Evaluation**: The Evaluator Agent checks implementation evidence against each acceptance criterion. Never claims success without test proof.
7. **Escalation / Completion**:
   - If overcapacity or persistent failure is detected: Generates `.mileage_copilot_prompt.md` with full context and opens the project in VS Code.
   - If verified locally: Confirms completion, saves token metrics, and announces completion via speech synthesis.
8. **Real-time Mission Control (`mileage serve`)**: React + Vite dashboard streams live agent states over SSE to desktop and mobile devices on local Wi-Fi.

## Approach and technologies

### Implementation & Model Architecture
- **Local Inference Engine**: Powered by **Ollama**, executing open-weight models entirely on the user's hardware with zero cloud API keys or telemetry.
- **Planning & Reasoning**: **Google Gemma** (`gemma:2b` / `gemma4:e2b`) analyzes user intent and multimodal inputs to formulate structured ActionPlans.
- **Code Generation & Self-Repair**: **Qwen 2.5 Coder** (`qwen2.5-coder`) performs code generation, syntactic diffing, and test failure repair.
- **Hands-Free Speech-to-Text**: **OpenAI Faster-Whisper** (`tiny.en` / `base.en`) coupled with **Silero VAD / webrtcvad** for real-time voice boundary segmentation.
- **Situational Speech Synthesis**: **pyttsx3 / piper** speaks concise milestone announcements with strict acoustic isolation to prevent microphone feedback loops.
- **CLI & UX**: Built with **Python 3.11**, **Typer**, and **Rich** featuring custom mascot ASCII/ANSI character art.
- **Mission Control Dashboard**: Built with **React 18**, **Vite**, **TypeScript**, and **Tailwind CSS**, consuming a local FastAPI/HTTP Server-Sent Events (SSE) stream.

### Why Chosen
- **Open-source & 100% on-device**: Total privacy for codebases with zero API costs.
- **Reproducible native verification**: Tests run using the project's own native tools rather than simulated mocks.
- **Sandboxed execution**: Strict directory-scoped permissions (`ToolPermission`) prevent destructive execution outside the project root.

### Credits & Reused Open-Source Libraries
- `ollama-python`: Local model HTTP communication.
- `faster-whisper`: Optimized local Whisper speech-to-text inference.
- `webrtcvad` / `sounddevice`: Low-latency audio capture and voice activity detection.
- `rich` & `typer`: Modern terminal UI, tables, panels, and CLI architecture.
- `react`, `vite`, `tailwindcss`: Lightweight, responsive mission control dashboard.

## Challenge evidence

### Best Open-Source AI Project

- **Open-source/open-weight AI components and their roles**:
  - **Ollama**: Local model server running 100% offline on the user's CPU/GPU.
  - **Google Gemma**: Intent comprehension, multimodal image input analysis, and strict JSON ActionPlan extraction.
  - **Qwen 2.5 Coder**: Code synthesis, file editing, and test repair loops.
  - **Faster-Whisper**: Local speech recognition.
  - **Silero VAD / webrtcvad**: Real-time voice activity detection.
- **Code links showing the integration**:
  - Ollama client & daemon management: [src/mileage/models/ollama_client.py](https://github.com/DhanviND360/m.AI.leage/blob/main/src/mileage/models/ollama_client.py)
  - Gemma planner & multi-stage JSON repair: [src/mileage/agents/planner.py](https://github.com/DhanviND360/m.AI.leage/blob/main/src/mileage/agents/planner.py)
  - Autonomous coding agent & repair loop: [src/mileage/agents/coding_agent.py](https://github.com/DhanviND360/m.AI.leage/blob/main/src/mileage/agents/coding_agent.py)
  - Model router & capability matching: [src/mileage/agents/router.py](https://github.com/DhanviND360/m.AI.leage/blob/main/src/mileage/agents/router.py)
  - Native project test discovery & runner: [src/mileage/agents/project_tester.py](https://github.com/DhanviND360/m.AI.leage/blob/main/src/mileage/agents/project_tester.py)
  - Acceptance criteria evaluator: [src/mileage/agents/evaluator.py](https://github.com/DhanviND360/m.AI.leage/blob/main/src/mileage/agents/evaluator.py)
  - Copilot escalation engine: [src/mileage/agents/escalation.py](https://github.com/DhanviND360/m.AI.leage/blob/main/src/mileage/agents/escalation.py)
  - One-command interactive session & acoustic isolation: [src/mileage/interactive/session.py](https://github.com/DhanviND360/m.AI.leage/blob/main/src/mileage/interactive/session.py)
  - Live SSE dashboard server & event bus: [src/mileage/dashboard/server.py](https://github.com/DhanviND360/m.AI.leage/blob/main/src/mileage/dashboard/server.py)
- **Original harness implementation & innovations**:
  - **Closed-Loop Agent Harness**: Built an inspect → plan → edit → test → repair cycle with stagnation detection, file modification tracking, and retry limits.
  - **Permission-Scoped Sandboxing**: Implemented explicit tool permission boundary policies preventing arbitrary commands or directory escape.
  - **Multi-Stage JSON Auto-Repair**: Designed an extraction harness that strips thinking tokens (`<think>`), cleans trailing commas before closing brackets, balances unclosed braces from token cutoffs, and guarantees non-empty ActionPlans.
  - **Overcapacity Escalation Protocol**: Detects when a local model is stuck or under-parameterized for a task, builds a self-contained markdown handoff prompt, and automatically opens VS Code for GitHub Copilot.
  - **Dual-Device Command Center**: Server-Sent Events architecture allows developers to monitor autonomous agent execution live from their mobile phone on the local Wi-Fi while their laptop builds the code.

## Current status

- **What works**:
  - Full end-to-end flow: `mileage start` → Voice Input → Intent Planning → Model Routing → Coding → Auto Testing → Acceptance Evaluation → Escalation / Completion.
  - 181 comprehensive automated pytest tests passing with zero errors.
  - Situational speech synthesis with acoustic isolation.
  - Minimal Claude-Code-style persistent workspace with speedometer mascot logo.
  - Precompiled React Vite command center dashboard (`mileage serve`).
- **Known limitations / incomplete features**:
  - Local LLM inference speed depends on host hardware (runs best with 8GB+ RAM/VRAM).
  - Hands-free voice requires working microphone input (falls back gracefully to keyboard input when unavailable).
- **What you would improve next**:
  - Local vector embeddings / RAG indexing for repositories exceeding 10,000 files.
  - Multi-agent debate loops where Gemma and Qwen review each other's diffs prior to file writes.

## Submission checklist

- [x] Project repository is public and links work.
- [x] Required challenge evidence is included.
- [x] Project uses an open-source license where required by the challenge.
- [x] Work and reused materials are represented honestly.
- [x] No API keys, tokens, passwords, or private data are included.
- [x] I followed the organizers' build window and submission instructions.
