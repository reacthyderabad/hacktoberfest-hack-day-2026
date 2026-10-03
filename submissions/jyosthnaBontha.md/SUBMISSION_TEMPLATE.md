# Project Name

## Team / attendee

- Team name (if applicable):Verilog (solo)
- Members and GitHub usernames:Jyosthna Bontha ,jyosthna-tech-in
- Profile links (optional):

## Challenge

Select the challenge you are entering:


- [ ] Best Use of Gemma 4


If listing multiple categories, confirm eligibility with the organizers and complete evidence for each.

## Project links

- Public GitHub repository:https://github.com/jyosthna-tech-in/NextStep-hackdayChallenge
- Open-source license (link to the license file):https://github.com/jyosthna-tech-in/NextStep-hackdayChallenge/blob/main/LICENSE

## Problem and solution

problem : Navigating hospitals, government offices, or transit hubs can be overwhelming. Confusing noticeboards, complex forms, and vague queue displays create friction—especially for the elderly or those with language barriers. 
solution : GuideEase allows users to point their phone at a confusing notice or queue and ask a question in their native language. Powered by Gemma 4's multimodal intelligence (gemma-4-26b-a4b-it) via the Gemini API, the app instantly provides: Situation Summary: A clear explanation of what is happening. Required Documents: A list of items needed for the task. Action Journey: A simple, 3-step action plan in the user's preferred local language (Hindi, Telugu, Tamil, Kannada, English)

## Approach and technologies
Built with Next.js (App Router), React, and Tailwind CSS for a fast, responsive UI. The core engine is Gemma 4 (gemma-4-26b-a4b-it) accessed via the @google/genai SDK, chosen for its lightweight yet powerful multimodal OCR to parse chaotic, real-world physical forms and noticeboards into structured JSON. Used native browser Web Speech APIs for accessibility without bloating the MVP. Gemini was used to assist with UI scaffolding and system prompt optimization.

## Challenge evidence

Complete the relevant section(s) and remove those that do not apply.



### Best Use of Gemma 4

- Gemma 4 model identifier and Gemini API integration:gemma-4-26b-a4b-it called via the official @google/genai SDK.
- Code link showing the integration:[https://github.com/jyosthna-tech-in/NextStep-hackdayChallenge/blob/main/guide-ease/app/api/analyze/route.ts]
- Input and useful output; multimodal value where applicable:Base64 image (noticeboard/form), text/voice query, and target language.

Output: Structured JSON with a situation summary, required documents, 3-step action plan, and an interactive form checklist.

Value: Uses vision intelligence to bridge the physical-to-digital gap, translating confusing visual environments into actionable, localized digital UI elements..


## Current status

- What works:
Image upload/capture, multimodal form/sign parsing, multi-language translation, dynamic interactive checklists, and browser-native voice query/read-aloud capabilities.

- Known limitations / incomplete features:Speech-to-text accuracy relies entirely on the user's specific browser; highly blurred images degrade field extraction.
What you would improve next: Client-side PII redaction (blurring Aadhar/phone numbers before API calls), stateful "Quest Mode" to remember context across multiple photos in a single building, and a RAG pipeline to verify extracted rules against official government databases.
- What you would improve next:

## Submission checklist

- [ ] Project repository is public and links work.
- [ ] Required challenge evidence is included.
- [ ] Project uses an open-source license where required by the challenge.
- [ ] Work and reused materials are represented honestly.
- [ ] No API keys, tokens, passwords, or private data are included.
- [ ] I followed the organizers' build window and submission instructions.
