# FirstPR

## Team / attendee

- Team name (if applicable): Individual
- Members and GitHub usernames:
  - Anil Marneni — https://github.com/AnilMarneni
- Profile links (optional):
  - https://github.com/AnilMarneni

## Challenge

- [x] Best Open-Source AI Project
- [ ] Best Use of Gemma 4
- [ ] Build on elah

## Project links

- Public GitHub repository: https://github.com/AnilMarneni/FirstPR
- Open-source license: https://github.com/AnilMarneni/FirstPR/blob/main/LICENSE

## Problem and solution

FirstPR helps developers understand unfamiliar open-source repositories and find a realistic contribution based on their experience level.

The user provides a public GitHub repository URL and selects their experience level. FirstPR collects repository information such as the README, file structure, contribution guidelines, dependencies, and open issues. This context is analyzed by Gemma 4 to explain the codebase and recommend one realistic contribution.

The user can also use "Ask the Codebase" to ask questions about the repository.

## Approach and technologies

FirstPR uses React + Vite for the frontend and Node.js + Express.js for the backend.

The backend uses the GitHub REST API to collect repository information and builds a structured repository context. This context, along with the developer's experience level, is sent to Gemma 4 running locally through Ollama.

Technologies:
- React
- Vite
- Node.js
- Express.js
- GitHub REST API
- Ollama
- Gemma 4
- JavaScript

The project is licensed under MIT.

AI-assisted development was used during implementation. The application logic, prompts, integration, UI and workflow were reviewed and adapted during development.

## Challenge evidence

### Best Open-Source AI Project

- Open-source/open-weight AI component and its role:
  - Gemma 4 is the core AI component. It analyzes repository context and generates the codebase overview, contribution recommendation and repository-specific answers.
  - Gemma 4 runs locally through Ollama.

- Code link showing the integration:
  - https://github.com/AnilMarneni/FirstPR

- Agent Skill Open Standard compliance (if applicable):
  - Not applicable.

- Original harness implementation or meaningful changes:
  - FirstPR implements an original repository-analysis workflow around Gemma 4. The backend collects repository evidence, combines it with developer experience and task-specific instructions, sends it to Gemma, and uses the structured response to create a contribution workflow.

## Demo Instructions

1. Clone the project:
   `git clone https://github.com/AnilMarneni/FirstPR.git`
2. Install and run Ollama with Gemma 4.
3. Configure the backend `.env`.
4. Run the backend using `npm run dev`.
5. Run the frontend using `npm run dev`.
6. Open the frontend in the browser.
7. Paste a public GitHub repository URL.
8. Select an experience level.
9. Analyze the repository.
10. Explore the codebase overview and contribution recommendation.
11. Use "Ask the Codebase" for repository-specific questions.

## Current status

- What works:
  - Public GitHub repository analysis
  - Codebase overview
  - Important directories and files
  - Experience-based contribution recommendations
  - Evidence-based recommendations
  - Ask the Codebase
  - Local Gemma 4 inference through Ollama
  - GitHub links

- Known limitations / incomplete features:
  - GitHub API rate limits can affect analysis.
  - Repository analysis may take some time depending on repository size.

- What you would improve next:
  - Improve analysis speed through caching and parallel API requests.
  - Improve contribution matching for larger repositories.
  - Improve repository architecture visualization.

## Submission checklist

- [x] Project repository is public and links work.
- [x] Required challenge evidence is included.
- [x] Project uses an open-source license where required.
- [x] Work and reused materials are represented honestly.
- [x] No API keys, tokens, passwords, or private data are included.
- [x] I followed the organizers' build window and submission instructions.