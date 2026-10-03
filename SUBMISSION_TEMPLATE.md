# Highness

## Team / attendee

- Team name (if applicable): The Wise Man
- Members and GitHub usernames: nsk6704
- Profile links (optional): https://sakethkashyap.dev

## Challenge

Select the challenge you are entering:

- [x] Best Open-Source AI Project
- [ ] Best Use of Gemma 4
- [ ] Build on elah

If listing multiple categories, confirm eligibility with the organizers and complete evidence for each.

## Project links

- Public GitHub repository: https://github.com/nsk6704/highness
- Open-source license (link to the license file): https://github.com/nsk6704/highness/blob/main/LICENSE

## Problem and solution

Highness is for developers who want to use AI coding agents while retaining independent, runtime-controlled verification of the changes they produce.

Highness gives an AI a coding task and lets it try to fix the code. Then Highness runs real tests to check the result. If the tests fail, the failure is sent back to the AI so it can try again.

Some projects can also provide held-out tests. These are extra tests the AI is not allowed to read. They check whether the AI understood the requirement instead of fixing only the examples it saw.

## Approach and technologies

### Model

Highness uses Ollama Cloud through its OpenAI-compatible API. The default model is:

```text
gpt-oss:120b
```

The model is responsible for reasoning about the task and requesting tool calls. The runtime remains responsible for executing those tools and deciding whether the result passes verification.

### Tools

The agent has four repository tools:

- `read_file` for inspecting source files.
- `write_file` for creating or replacing files.
- `edit_file` for modifying files.
- `shell` for running project commands and tests.

The harness also includes:

- Visible test execution.
- Optional held-out test execution.
- Integrity hashing for protected files.
- Guard rules preventing access to protected tests and configuration.
- Failure classification and feedback.
- Detection of test commands that exit successfully without running tests.
- A bounded repair loop.

### Technology Used

- TypeScript
- Node.js
- Ollama Cloud
- OpenAI Node SDK
- Zod
- dotenv
- Jest
- ts-jest
- npm

### Reused Libraries and Credits

Highness uses established open-source libraries rather than reimplementing their functionality:

- **OpenAI Node SDK** for API-compatible communication with Ollama.
- **Ollama Cloud** for access to the open-weight model.
- **Zod** for schema validation.
- **dotenv** for environment-variable loading.
- **Jest** and **ts-jest** for the demonstration test suite.
- **TypeScript** and **Node.js** for the runtime and build system.

No external datasets were used. The calculator example, contract, verification flow, and harness logic were created specifically for this project.

AI coding assistants(with models like Nemotron - an OSS LLM with OpenCode) were used during development for implementation assistance, debugging, documentation, and iteration. The final project’s central AI component is the Ollama open-weight model running inside the Highness agent and verification workflow.

The gpt-oss:120b model is used as the driving LLM for the agent. It is an open-weight model that is compatible with OpenAI’s API. The model is responsible for reasoning about the task and requesting tool calls. The runtime remains responsible for executing those tools and deciding whether the result passes verification.

## Challenge evidence

### Best Open-Source AI Project

- Original harness implementation or meaningful changes (if applicable):

- Open-source/open-weight AI component and its role:
  `gpt-oss:120b` is the driving open-weight model used by Highness for task reasoning and tool selection.

- Code link showing the integration:
  https://github.com/nsk6704/highness/blob/main/src/model/ollama.ts

#### Original Implementation

The original work in this project is the verification-first harness around the model, including:

- The tool-calling agent loop.
- Independent verification outside the model.
- Held-out test support.
- Protected-file integrity checks.
- Repair attempts based on verification failures.
- Failure triage.
- Empty-test detection.
- The command-line interface.

The calculator project is an intentionally small demonstration target with visible tests and additional held-out contract tests.

## Current status

- **What works:**
  - AI agent connects to Ollama Cloud.
  - Agent can read, edit, write, and run shell commands.
  - Highness runs visible and optional held-out tests.
  - Failed tests are sent back to the AI for repair.
  - Protected files are checked for unauthorized changes.
  - CLI works with `highness "your task"`.

- **Known limitations / incomplete features:**
  - Shell protection is not a complete security sandbox.
  - No production deployment or rollback support.
  - No frontend interface.
  - Hidden tests must be configured by the project owner.
  - Verification depends on the project’s test quality.
  - No automatic pull-request creation.

- **What you would improve next:**
  - Add container or OS-level sandboxing.
  - Add resource and timeout limits.
  - Generate a Git diff or pull request automatically.
  - Add stronger checks such as typechecking, linting, and security scans.
  - Add human approval before merging or deploying changes.

## Submission checklist

- [x] Project repository is public and links work.
- [x] Required challenge evidence is included.
- [x] Project uses an open-source license where required by the challenge.
- [x] Work and reused materials are represented honestly.
- [x] No API keys, tokens, passwords, or private data are included.
- [x] I followed the organizers' build window and submission instructions.
