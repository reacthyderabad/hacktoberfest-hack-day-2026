# Project Name
FirstPR-AI
## Team / attendee

- Team name : CodeForces
- Members and GitHub usernames: 1. Manvith Reddy (manvithdandi-create)
                                2. P.Adarsh (adrashproddaturidev-code)
                                3. Syed Ayaan (Ayaanzaroon78)
                                4. Neelagiri Rakesh (neelagirirakeshdev-pixel)
- Profile links (optional):

## Challenge

Select the challenge you are entering:

- [x] Best Open-Source AI Project
- [ ] Best Use of Gemma 4
- [ ] Build on elah

If listing multiple categories, confirm eligibility with the organizers and complete evidence for each.

## Project links

- Public GitHub repository: https://github.com/Ayaanzaroon78/CodeForces
- Open-source license (link to the license file): https://github.com/Ayaanzaroon78/CodeForces/blob/main/LICENSE

## Problem and solution

FirstPR-AI is an open-source AI mentor designed to help developers, especially beginners, find and understand a suitable first contribution in an unfamiliar GitHub repository.

Getting started with open source can be challenging. Developers often encounter large repositories containing many files, complex project structures, and numerous open issues. It can be difficult to determine which issue matches their current skills, how difficult the task is, which files are relevant, and what they should do first.

FirstPR-AI addresses this problem by combining the developer's skills and experience with real GitHub repository and issue information.

The main workflow is:

Developer Skills + Experience + GitHub Repository
→ Repository & Documentation Analysis
→ Open Issues Retrieval
→ Open-Source AI Analysis
→ Personalized Contribution Recommendation
→ Relevant Files & Skills
→ Step-by-Step Contribution Roadmap

The user provides a public GitHub repository URL, their technical skills, and their experience level. FirstPR-AI retrieves relevant repository information, documentation, structure, and open issues through the GitHub API.

The open-source/open-weight AI model then analyzes the repository context and candidate issues against the developer's profile. Instead of simply displaying a list of issues, the system recommends a contribution that matches the developer's current capabilities and explains why it is suitable.

The output includes:

A recommended GitHub issue
Contribution difficulty
Skill and contribution match
Explanation of why the issue was selected
Relevant repository files
Skills required for the contribution
Learning opportunities
A step-by-step contribution roadmap
A suggested first action
AI-powered follow-up assistance through an AI mentor

The goal is to transform:

"I want to contribute to open source, but I don't know where to start."

into:

"I know what I can contribute, why it fits me, and how to begin."

## Approach and technologies

FirstPR-AI is implemented as a full-stack web application with React on the frontend and Python/FastAPI on the backend.

The frontend provides the developer onboarding experience, repository input, skill selection, analysis progress, recommendation dashboard, contribution roadmap, and AI mentor interface.

The Python backend acts as the orchestration layer between the frontend, GitHub APIs, and the open-source/open-weight AI model.

The application retrieves relevant GitHub information including:

Repository metadata
README and documentation
Repository structure
Programming languages
Open GitHub issues
Issue descriptions and labels
Relevant repository files where required

This information is converted into structured repository context and combined with the developer's skills and experience.

The open-source/open-weight AI model is then used as the reasoning component to evaluate candidate issues based on factors such as:

Skill compatibility
Experience level
Technical complexity
Contribution scope
Repository knowledge required
Learning value
Feasibility for a first contribution

The model produces structured recommendation data which is validated by the backend before being presented in the React interface.

Technologies used

React
Vite
JavaScript
Tailwind CSS
Python
FastAPI
Pydantic
llama-3.3-70b-versatile
openai
API key : Ollama

## Challenge evidence

Complete the relevant section(s) and remove those that do not apply.

### Best Open-Source AI Project

Open-source/open-weight AI component and its role:

Ollama is used as the core AI reasoning component of FirstPR-AI. It analyzes structured GitHub repository context, candidate issues, and the developer's skills and experience to identify a suitable first contribution.

The model generates the personalized recommendation, explains why the issue is appropriate, identifies relevant files and skills, and produces a step-by-step contribution roadmap.

Example format:
https://github.com/Ayaanzaroon78/CodeForces/blob/main/[path-to-ai-integration-file]

Agent Skill Open Standard compliance (if applicable):

Not applicable.

Original harness implementation or meaningful changes (if applicable):

FirstPR-AI implements an application-level AI orchestration and reasoning workflow around the open-source/open-weight model.

The application collects repository information through the GitHub API, filters and structures relevant issues and repository context, combines this information with the developer profile, sends the resulting context to the AI model, validates the structured model response, and converts the result into an actionable contribution recommendation.

The project therefore uses the AI model as a core reasoning component rather than as a standalone conversational chatbot.l changes (if applicable):

## Current status

What works:
-Public GitHub repository input
-Repository validation
-Developer skill and experience collection
-GitHub repository information retrieval
-Repository documentation/context analysis
-Open issue retrieval
-Candidate issue analysis
-Open-source AI-powered contribution recommendation
-Contribution difficulty analysis
-Explanation of why an issue is suitable
-Relevant file identification
-Required skill identification
-Learning opportunity identification
-Step-by-step contribution roadmap
-Suggested first action
-AI mentor for follow-up questions
-React-based user interface
-Python/FastAPI backend
-Error and loading states


Known limitations / incomplete features:
-The current version primarily targets public GitHub repositories.
-Repository analysis is limited to the context required for generating a contribution recommendation.
-AI recommendations should still be reviewed by the contributor against the current repository state and issue discussion.
-The current version does not automatically modify repository code or create a pull request on behalf of the user.


What you would improve next:
-Deeper repository and codebase analysis
-More accurate issue-to-code mapping
-Improved understanding of repository architecture
-Personalized learning paths based on contributor goals
-Better analysis of issue discussions and maintainer expectations
-Optional AI-generated patches that remain under human review
-Deeper GitHub contribution workflow integration
-Support for additional open-source contribution types beyond GitHub issues

## Submission checklist

- [x] Project repository is public and links work.
- [x] Required challenge evidence is included.
- [x] Project uses an open-source license where required by the challenge.
- [x] Work and reused materials are represented honestly.
- [x] No API keys, tokens, passwords, or private data are included.
- [x] I followed the organizers' build window and submission instructions.
