# Contrib Bud
## Team / attendee

- Team name (if applicable): `Git Push`
- Members and GitHub usernames: Saisumanthv
- Profile links (optional): https://github.com/Saisumanthv

## Challenge

Select the challenge you are entering:

- [x] Best Open-Source AI Project
- [x] Best Use of Gemma 4
- [ ] Build on elah

## Project links

- Public GitHub repository: https://github.com/Saisumanthv/Contrib-Bud
- Open-source license: [MIT License](https://github.com/Saisumanthv/Contrib-Bud/blob/main/LICENSE)

## Problem and solution

**Who is this for?**
Aspiring open-source contributors making their first Pull Request, and experienced developers looking to quickly onboard to a new open-source repository.

**What problem does it solve?**
The barrier to entry for open-source is high. Beginners spend more time struggling to find unclaimed, beginner-friendly issues and deciphering unique repository rules (like CLAs, branch naming, and commit formats) than they do writing code.

**Input → Output Workflow:**
- **Input:** A GitHub repository URL or a specific Issue URL.
- **Output:** The tool automatically reads the repo's complex documentation and finds unclaimed issues. It outputs an AI-generated, plain-English summary of the rules, a ranked list of available issues, and a highly specific, step-by-step contribution plan (including exact terminal commands, branch names, and a pre-filled PR description). It also provides a RAG-powered chat interface to ask questions directly about the repo's codebase/guidelines.

## Approach and technologies

**Implementation & Architecture:**
`contrib-bud` uses a hybrid deterministic/AI architecture. Python backend scripts securely fetch raw facts (rules, templates, issues) from the GitHub REST API. This factual data is injected into strict prompts, forcing the AI to cite sources and preventing hallucinations. The frontend is a modern SPA built with React and Vite.

**Models & Why We Chose Them:**
- **Gemma 4 (`gemma-4-26b-a4b-it`) via Gemini API:** Chosen as the default because it is an open-weight model with exceptional instruction and JSON-following capabilities, which is critical for parsing our structured contribution plans.
- **Ollama (Local Models):** Integrated to allow privacy-conscious users to run the entire pipeline offline on their own hardware.

**Tools & Libraries:**
FastAPI, Typer (CLI), Requests, React 19, Vite, and `react-markdown`. 

**Credits & Reused Assets:**
Built leveraging the GitHub REST API and adheres to the AgentSkills (`agentskills.io`) open standard. Significant AI-assisted development was utilized for styling the UI components and implementing the RAG chat mechanism.

## Challenge evidence

### Best Open-Source AI Project

- **Open-source/open-weight AI component and its role:** Uses the open-weight Gemma 4 model (or fully local open-weight models via Ollama) to translate raw repository facts into beginner-friendly guidance and structured PR plans.
- **Code link showing the integration:** [`backend/bud/providers.py`](https://github.com/Saisumanthv/Contrib-Bud/blob/main/backend/bud/providers.py)
- **Agent Skill Open Standard compliance:** Fully compliant. The project ships with a `SKILL.md` file, allowing any compatible AI agent to load `contrib-bud` as an autonomous tool.
- **Original harness implementation or meaningful changes:** Implemented a custom RAG (Retrieval-Augmented Generation) chat interface using session storage to allow users to contextually chat with the retrieved repository data without requiring a database.

### Best Use of Gemma 4

- **Gemma 4 model identifier and Gemini API integration:** Uses `gemma-4-26b-a4b-it` via the Gemini API's `generateContent` endpoint.
- **Code link showing the integration:** [`backend/bud/providers.py`](https://github.com/Saisumanthv/Contrib-Bud/blob/main/backend/bud/providers.py)
- **Input and useful output:** Takes deterministic JSON facts scraped from GitHub (README, CONTRIBUTING.md, issue lists) and outputs tightly structured JSON representing step-by-step PR plans and heuristic difficulty rankings, refusing to hallucinate if data is missing.

## Current status

- **What works:** Repository analysis, fetching and ranking unclaimed beginner issues, generating detailed PR plans, and the RAG-powered chatbot interface. Both CLI and Web UI are fully functional.
- **Known limitations / incomplete features:** "Likely files to edit" uses keyword matching rather than deep code search. Claim detection relies purely on parsing English comments from the last 14 days.
- **What you would improve next:** Integrate GitHub code search for deeper file targeting, add non-English claim detection, and add support for GitLab / Codeberg repositories.

## Submission checklist

- [x] Project repository is public and links work.
- [x] Required challenge evidence is included.
- [x] Project uses an open-source license where required by the challenge.
- [x] Work and reused materials are represented honestly.
- [x] No API keys, tokens, passwords, or private data are included.
- [x] I followed the organizers' build window and submission instructions.
