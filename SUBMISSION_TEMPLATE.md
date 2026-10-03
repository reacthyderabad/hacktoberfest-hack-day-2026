# Project Name

## Team / attendee

- Team name (if applicable):Sahara
- Members and GitHub usernames:Aditi-Singh-14
- Profile links (optional):https://github.com/Aditi-Singh-14

## Challenge

Select the challenge you are entering:

- [ ] Best Open-Source AI Project
- [X] Best Use of Gemma 4
- [ ] Build on elah

If listing multiple categories, confirm eligibility with the organizers and complete evidence for each.

## Project links

- Public GitHub repository:https://github.com/Aditi-Singh-14/RedPen
- Open-source license (link to the license file):https://github.com/Aditi-Singh-14/RedPen/blob/main/LICENSE

## Problem and solution

**Who it's for:**
**RedPen** is for students practicing DSA who get a wrong answer and can't tell why. Chatbots give an opinion about the bug. RedPen shows evidence.

**Workflow:** the student photographs or screenshots their buggy code (paper, whiteboard, or an IDE or judge screen). Gemma 4 reads the image, transcribes the code, and explains the likely thought behind the mistake. The app runs the code against tests to find the smallest failing input, so the bug is proven, not guessed. 

## Approach and technologies

- **Model:** Gemma 4 through the Gemini API, used for reading the image (handwriting and screenshots to code) and for explaining the misconception in plain language.
- **Code execution as verifier:** Gemma explains, and code decides what is correct.
- **Stack:** Python, FAST API, React, Site. Images are resized on the client before upload.
- **AI-assisted development:** this project was built with the help of an AI coding assistant Cursor and Antigravity. Prompts, architecture decisions, and testing were done by me.


## Challenge evidence

### Best Use of Gemma 4

- Gemma 4 model identifier and Gemini API integration: gemma-4-26b-a4b-it, called via the Gemini API in main.py.
- Code link showing the integration: https://github.com/Aditi-Singh-14/RedPen/blob/main/backend/app/main.py
- Input and useful output; multimodal value where applicable: Input is a photo of handwritten or on-screen code. Output is the transcribed code, the explanation of the bug. Multimodal understanding matters because students often keep code on paper, whiteboards, or screenshots, where text-only tools can't read it.

## Current status

- **What works:** trace replay of the failing inputa hint ladder, Problem history
- **Known limitations / incomplete features:** a verified "same trap" follow-up problem,
- **What you would improve next:** trace replay of the failing input, a verified "same trap" follow-up problem, a hint ladder, and support for more languages.

## Submission checklist

- [x] Project repository is public and links work.
- [x] Required challenge evidence is included.
- [x] Project uses an open-source license where required by the challenge.
- [x] Work and reused materials are represented honestly.
- [x] No API keys, tokens, passwords, or private data are included.
- [x] I followed the organizers' build window and submission instructions.
Who is this for? What problem does it solve? Describe the main input → output workflow.


