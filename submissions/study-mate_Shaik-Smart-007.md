# Project Name

## Team / attendee

- Team name (if applicable):
- Members and GitHub usernames: Shaik Yaqoob Ishaq Shaik-Smart-007
- Profile links (optional): https://github.com/Shaik-Smart-007

## Challenge

Select the challenge you are entering:

- [ ] Best Open-Source AI Project
- [✔] Best Use of Gemma 4
- [ ] Build on elah

If listing multiple categories, confirm eligibility with the organizers and complete evidence for each.

## Project links

- Public GitHub repository: https://github.com/Shaik-Smart-007/Study-Mate
- Open-source license (link to the license file): https://github.com/Shaik-Smart-007/Study-Mate/blob/main/LICENSE.md

## Problem and solution

Who is this for? What problem does it solve? Describe the main input → output workflow.
StudyMate is designed for students who want to turn study material into active learning instead of simply receiving AI-generated answers.

The main workflow is:

Study material → Understand → Revise → Practice → Diagnose → Practice Again

The primary input is text such as a question, topic, or pasted notes. Students can also optionally upload an image of a textbook page, handwritten notes, or a diagram.

StudyMate provides:

Explain — beginner-friendly explanation of the material.
Revise — concise exam-oriented revision notes.
Quiz — multiple-choice questions generated from the material.
Quiz scoring — answers are checked locally and a score is shown.
Weak-area detection — incorrect answers are used to identify weak topics.
Practice weak areas — new questions are generated specifically for those weak topics.
Study Plan — a short study plan based on the available time.

The key idea is to close the learning loop rather than stopping at an AI-generated answer.

## Approach and technologies

Describe your implementation, model(s), tools, and why you chose them. Credit reused libraries, datasets, starter code, and significant AI-assisted development.

StudyMate is built with Python and Streamlit.

Technologies used:

Python
Streamlit
Google GenAI Python SDK
Gemma 4 through the Gemini API
Pillow for image validation and preprocessing
python-dotenv for environment-variable configuration

Gemma 4 handles the core AI generation for explanations, revision notes, quizzes, study plans, and targeted practice. Image input is converted and prepared before being sent to the model.

The application is split into a simple architecture:

app.py — Streamlit interface, quiz interaction, scoring, and learning flow.
prompts.py — prompt templates and output instructions.
gemma.py — Gemini API integration, image preparation, Gemma requests, and quiz parsing.

No private API keys are included in the repository.

AI-assisted development was used during implementation, including GitHub Copilot for coding assistance and debugging, and Claude/Antigravity for architecture and implementation assistance. These tools were used to accelerate development while the project code and final workflow were reviewed and tested during the build.

## Challenge evidence

Complete the relevant section(s) and remove those that do not apply.

### Best Use of Gemma 4

- Gemma 4 model identifier and Gemini API integration: gemma-4-26b-a4b-it, accessed through the Google GenAI Python SDK and Gemini API.
- Code link showing the integration:(https://github.com/Shaik-Smart-007/Study-Mate/blob/main/gemma.py)
- Input and useful output; multimodal value where applicable:
Text input:
A student enters a topic, question, or study notes.

Gemma 4 output:
StudyMate generates a beginner-friendly explanation, concise revision notes, a quiz, or a study plan depending on the selected mode.

Multimodal input:
Students can additionally upload a photo of textbook material, notes, or diagrams. The image is validated, rotated when necessary, resized, converted to JPEG, and passed to Gemma together with the text prompt.

Learning-loop output:
After a quiz, StudyMate scores the student's answers, identifies weak topics, and can generate new practice questions targeting those weak areas.


## Current status

- What works:
 - Text-based Explain mode
 - Revise mode
 - Quiz generation
 - Interactive quiz answering and local scoring
 - Weak-area detection
 - Targeted weak-area practice
 - Optional image input
 - Study Plan generation
 - Gemma 4 integration through the Gemini API
 - Basic image preprocessing and API error handling
- Known limitations / incomplete features:
 - The app does not currently use persistent user accounts or a database.
 - Learning history is limited to the current session.
 - AI-generated content can still contain mistakes and should be checked for important    academic information.
 - Some malformed model output may require another generation attempt.
-What you would improve next:
 - More robust structured quiz generation and validation
 - Persistent progress and learning history
 - More adaptive difficulty based on quiz performance
 - Better study-plan validation and personalization
 - More polished multimodal study workflows

## Submission checklist

- [✔] Project repository is public and links work.
- [✔] Required challenge evidence is included.
- [✔] Project uses an open-source license where required by the challenge.
- [✔] Work and reused materials are represented honestly.
- [✔] No API keys, tokens, passwords, or private data are included.
- [✔] I followed the organizers' build window and submission instructions.
