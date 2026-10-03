# Project Name

RepoDoctor

## Team / attendee

- Team name (if applicable): Individual
- Members and GitHub usernames: Manikanta Gattadi — Manikanta-Gattadi
- Profile links (optional): https://github.com/Manikanta-Gattadi

## Challenge

Select the challenge you are entering:

- [x] Best Open-Source AI Project
- [ ] Best Use of Gemma 4
- [ ] Build on elah

## Project links

- Public GitHub repository: https://github.com/Manikanta-Gattadi/repo-doctor
- Open-source license (link to the license file): https://github.com/Manikanta-Gattadi/repo-doctor/blob/main/LICENSE

## Problem and solution

RepoDoctor is built for developers, students, contributors, and anyone who needs to understand an unfamiliar GitHub repository quickly.

The problem is that understanding a new codebase often requires manually exploring files, identifying technologies, tracing the architecture, and figuring out where to begin.

RepoDoctor automates this process.

Main workflow:

GitHub repository URL
→ Repository scanning
→ Repository structure and relevant code extraction
→ AI analysis using Qwen2.5-Coder-32B-Instruct
→ Developer-focused report

The generated report explains the project overview, technology stack, architecture, important files, potential issues, recommended starting point, and learning path.

## Approach and technologies

RepoDoctor uses a React frontend and a Python FastAPI backend.

The frontend allows the user to enter a public GitHub repository URL and displays the generated analysis.

The backend clones and scans the repository, extracts its file structure, retrieves relevant source-code context, and sends that context to Qwen2.5-Coder-32B-Instruct through Hugging Face InferenceClient.

The AI model performs the main reasoning task: understanding the repository, explaining its architecture, identifying important files and potential issues, and recommending where the developer should start.

Technologies used:

- Frontend: React, Vite, JavaScript, CSS
- Backend: Python, FastAPI, Uvicorn
- AI model: Qwen/Qwen2.5-Coder-32B-Instruct
- AI platform: Hugging Face
- Repository analysis: Git and GitHub
- API: REST API
- Libraries: huggingface_hub, python-dotenv, requests, Pydantic
- Version control: Git and GitHub

The project uses the Qwen2.5-Coder open-weight coding model as the central AI reasoning component.

Reused libraries and tools are represented through the project's dependencies and documentation. No private API keys or tokens are included in the public repository.

AI-assisted development was used during implementation for coding assistance, debugging, documentation, and development guidance.

## Challenge evidence

### Best Open-Source AI Project

- Open-source/open-weight AI component and its role:

  Qwen/Qwen2.5-Coder-32B-Instruct is the central AI component of RepoDoctor. It receives repository structure and relevant source-code context and generates the developer-focused repository analysis.

  Model:
  https://huggingface.co/Qwen/Qwen2.5-Coder-32B-Instruct

- Code link showing the integration:

  https://github.com/Manikanta-Gattadi/repo-doctor/blob/main/llm.py

- Agent Skill Open Standard compliance (if applicable):

  Not applicable. RepoDoctor does not currently implement the Agent Skill Open Standard.

- Original harness implementation or meaningful changes (if applicable):

  RepoDoctor implements an original repository-analysis harness around the open-weight Qwen coding model.

  The application collects repository structure and relevant code context, constructs a structured analysis prompt, sends the context to Qwen2.5-Coder, and converts the model response into a developer-oriented roadmap through the React interface.

## Current status

- What works:

  - Public GitHub repository analysis
  - Repository cloning and file discovery
  - Repository structure extraction
  - Relevant source-code retrieval
  - Qwen2.5-Coder AI analysis
  - FastAPI backend
  - React/Vite frontend
  - AI-generated project overview
  - Technology stack explanation
  - Architecture explanation
  - Important file identification
  - Potential issue/risk identification
  - "Where should I start?" recommendation
  - Recommended learning path
  - End-to-end testing with a real public GitHub repository

- Known limitations / incomplete features:

  - Currently focused on public GitHub repositories
  - Private repository authentication is not implemented
  - Analysis is limited to the repository context collected by the current scanner
  - No interactive follow-up conversation with the analyzed repository
  - No automatic architecture diagram generation
  - No hosted production deployment

- What you would improve next:

  - Add GitHub authentication for private repositories
  - Perform deeper dependency and import analysis
  - Generate visual architecture diagrams
  - Add file-level interactive explanations
  - Add an interactive AI chat about the analyzed repository
  - Improve large-repository context selection
  - Add automated code-quality and dependency-risk checks
  - Deploy the application for public online use

## Submission checklist

- [x] Project repository is public and links work.
- [x] Required challenge evidence is included.
- [x] Project uses an open-source license where required by the challenge.
- [x] Work and reused materials are represented honestly.
- [x] No API keys, tokens, passwords, or private data are included.
- [x] I followed the organizers' build window and submission instructions.
