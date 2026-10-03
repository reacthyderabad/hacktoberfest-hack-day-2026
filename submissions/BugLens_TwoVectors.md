# BugLens

## Team / attendee

- Team name: BugLens
- Members and GitHub usernames:
- Abdullah Murtuza: https://github.com/bdllhmurtuza-hash
- Abdul Hannan: https://github.com/Hannan86


## Challenge

- [ ] Best Open-Source AI Project
- [x] Best Use of Gemma 4
- [ ] Build on elah

## Project links

- Public GitHub repository: https://github.com/bdllhmurtuza-hash/BugLens
- Open-source license: https://github.com/bdllhmurtuza-hash/BugLens?tab=MIT-1-ov-file

## Problem and solution

BugLens is built for developers debugging errors from IDEs, terminals, APIs, and production systems.

It turns a development error screenshot into a structured, developer-ready bug report.

**Input →** Error screenshot containing code, traceback, logs, or API responses  
**Output →** Error analysis, likely root cause, evidence, recommended fix, and next debugging step.

## Approach and technologies

BugLens uses a React + Vite frontend and Flask backend. Screenshots are sent to **Gemma 4 through the Gemini API**, where the multimodal model analyzes the visual debugging context and generates a structured bug report.

**Technologies:** React, Vite, Flask, Python, Gemini API, Gemma 4.

No external dataset or starter project was used. Standard open-source libraries were used, with AI assistance during development.

## Challenge evidence

### Best Use of Gemma 4

- **Gemma 4 model identifier and Gemini API integration:** `gemma-4-26b-a4b-it`, accessed through the Gemini API using the Google GenAI SDK.
- **Code link showing the integration:** `backend/app.py`
- **Input and useful output; multimodal value:** A screenshot containing code, tracebacks, logs, or API responses is analyzed by Gemma 4. The output is a structured bug report containing the error, likely root cause, evidence, recommended fix, and next debugging step.

## Current status

- **What works:** Screenshot upload, multimodal Gemma 4 analysis, error and root-cause identification, evidence extraction, recommended fixes, and structured bug-report generation.
- **Known limitations / incomplete features:** Analysis is limited to the information visible or reasonably inferable from the uploaded screenshot.
- **What you would improve next:** Support additional debugging context such as source files and logs, and improve analysis for larger production incidents.

## Submission checklist

- [x] Project repository is public and links work.
- [x] Required challenge evidence is included.
- [x] Work and reused materials are represented honestly.
- [x] No API keys, tokens, passwords, or private data are included.
- [x] I followed the organizers' build window and submission instructions.
