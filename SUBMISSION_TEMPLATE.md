# Project Name : BugLens - an AI assistant for software developers

## Team / attendee

- Two Vectors:
- Members:
- Abdullah Murtuza: https://github.com/bdllhmurtuza-hash
- Abdul Hannan :

## Challenge

Select the challenge you are entering:

- [ ] Best Open-Source AI Project
- [ ✅] Best Use of Gemma 4
- [ ] Build on elah


## Project links

- Public GitHub repository: https://github.com/bdllhmurtuza-hash/BugLens
- Open-source license : MIT

## Problem and solution :

Developers debugging errors from IDEs, terminals, APIs, and production systems.
What problem does it solve?
It turns messy error screenshots into clear, actionable debugging information without manually going through every detail.
Input → Output:
Screenshot of an error → Gemma 4 analyzes the visual context → structured developer-ready bug report with root cause, evidence, and recommended fix.

## Approach and technologies

We built BugLens as a React + Vite frontend with a Flask backend. Screenshots are sent to Gemma 4 through the Gemini API, which analyzes the visual debugging context and returns a structured bug report. We chose Gemma 4 because the core problem requires multimodal understanding of code, tracebacks, logs, and API responses within a single screenshot.
Tools: React, Vite, Flask, Python, Gemini API, Gemma 4.
Credits: We used standard open-source libraries for the application stack and AI-assisted development during implementation. No external dataset or starter project was used.

### Best Open-Source AI Project

- Open-source/open-weight AI component and its role: Gemma 4 (gemma-4-26b-a4b-it) is used to analyze uploaded development error screenshots and generate structured bug reports.
- Code link showing the integration: backend/app.py — Gemini API integration using the Google GenAI SDK.
- Agent Skill Open Standard compliance (if applicable): Not applicable.
- Original harness implementation or meaningful changes: Built the complete React + Flask integration, including screenshot upload, multimodal Gemma 4 analysis, structured report generation, error handling, and frontend presentation.
  
### Best Use of Gemma 4

Gemma 4 model identifier and Gemini API integration: gemma-4-26b-a4b-it, accessed through the Gemini API using the Google GenAI SDK.
Code link showing the integration: backend/app.py — screenshot upload, multimodal prompt, and Gemma 4 API call.
Input and useful output; multimodal value where applicable: Input is a screenshot containing code, tracebacks, logs, or API responses. Gemma 4 analyzes the visual context and produces a structured developer-ready bug report with the error, likely root cause, evidence, recommended fix, and next debugging step.

## Current status

- What works: Screenshot upload, multimodal Gemma 4 analysis, root-cause identification, evidence extraction, recommended fixes, and structured bug-report  generation.
- Known limitations / incomplete features: Analysis depends on the information visible in the uploaded screenshot; deeper application context, logs, or source files are not available.
- What you would improve next: Support additional debugging context such as log files and source-code files, and improve report accuracy and formatting for larger production incidents.

## Submission checklist

- [ ✅] Project repository is public and links work.
- [✅ ] Required challenge evidence is included.
- [ ✅] Project uses an open-source license where required by the challenge.
- [✅ ] Work and reused materials are represented honestly.
- [✅ ] No API keys, tokens, passwords, or private data are included.
- [ ✅] I followed the organizers' build window and submission instructions.
