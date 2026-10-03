# Scam Spotter

## Team / attendee

- Team name (if applicable): N/A (solo)
- Members and GitHub usernames: Asma (@asmatamkeen)
- Profile links (optional): https://github.com/asmatamkeen

## Challenge

Select the challenge you are entering:

- [ ] Best Open-Source AI Project
- [x] Best Use of Gemma 4
- [ ] Build on elah

## Project links

- Public GitHub repository: https://github.com/asmatamkeen/scam-spotter
- Open-source license (link to the license file): https://github.com/asmatamkeen/scam-spotter/blob/main/LICENSE

## Problem and solution

Scam Spotter is for students looking for internships. Fake internship offers that ask for a "registration fee" or personal details are common, and they are easy to fall for when you are looking for your first opportunity.

The user uploads a screenshot or a PDF of a message or offer letter. Gemma 4 reads it and the app shows:
- a SAFE / SUSPICIOUS / SCAM verdict with a risk score out of 100
- the exact lines from the document that look like red flags
- what the user should do next
- a ready-to-send WhatsApp alert, with details of the offer, that the user can forward to friends in one tap

Input: screenshot or PDF. Output: verdict, risk score, quoted red flags, next step, shareable warning.

## Approach and technologies

- Frontend: React (Vite)
- Backend: Python, FastAPI
- Model: Gemma 4 (`gemma-4-31b-it`) through the Gemini API
- PDF handling: PyMuPDF converts PDF pages to images, and Pillow shrinks screenshots before sending, so both file types go to Gemma as images
- The backend keeps the API key secret and asks Gemma to reply in a fixed JSON format, which the frontend turns into the result card
- Reused libraries: FastAPI, Uvicorn, google-genai, python-dotenv, PyMuPDF, Pillow, React, Vite
- AI-assisted development: I used Claude (Anthropic) as a coding and learning assistant while building this project, for guidance on structure, code and debugging. I tested, ran and own the final version.

## Challenge evidence

### Best Use of Gemma 4

- Gemma 4 model identifier and Gemini API integration: `gemma-4-31b-it`, called through the `google-genai` client with a Gemini API key (loaded from `.env`, not committed).
- Code link showing the integration: https://github.com/asmatamkeen/scam-spotter/blob/main/main.py
- Input and useful output; multimodal value where applicable: The input is an image of an offer letter or message. Gemma reads the layout and wording of the document itself, with no keyword matching, and returns a verdict, quoted red flags and a warning message. Reading the image is what lets it quote the exact suspicious lines.


## Current status

- What works: Upload of images and PDFs, Gemma 4 analysis, verdict with risk score, quoted red flags, next-step advice, and WhatsApp alert sharing.
- Known limitations / incomplete features: The result is an AI opinion, not a guarantee. Results can vary slightly between runs. Only the first 2 pages of a PDF are checked. It runs locally and is not deployed. No login or history.
- What you would improve next: Local-language support, checking links and sender email addresses, and saving a history of past checks.

## Submission checklist

- [x] Project repository is public and links work.
- [x] Required challenge evidence is included.
- [x] Project uses an open-source license where required by the challenge.
- [x] Work and reused materials are represented honestly.
- [x] No API keys, tokens, passwords, or private data are included.
- [x] I followed the organizers' build window and submission instructions.
