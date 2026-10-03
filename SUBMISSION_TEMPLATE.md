# FixLens AI

## Team / attendee

- Team name (if applicable):Code Pulse
- Members and GitHub usernames:H Shivanand — shivanand0719
- Profile links (optional):https://github.com/shivanand0719/Fix-lens-AI

## Challenge

Select the challenge you are entering:

- [ ] Best Open-Source AI Project
- [x] Best Use of Gemma 4
- [ ] Build on elah

If listing multiple categories, confirm eligibility with the organizers and complete evidence for each.

## Project links

- Public GitHub repository:https://github.com/shivanand0719/Fix-lens-AI
- Open-source license (link to the license file):https://github.com/shivanand0719/Fix-lens-AI/blob/main/LICENSE

## Problem and solution

Who is this for? What problem does it solve? Describe the main input → output workflow.
## Problem and solution

FixLens AI is designed for developers and students who encounter programming errors shown in screenshots and need to quickly understand what went wrong.

The problem is that an error screenshot contains useful context such as the programming language, source code, error message, line number, and surrounding code, but manually interpreting all of this can take time.

FixLens AI uses multimodal AI to analyze the uploaded screenshot and transform it into an actionable debugging explanation.

Main workflow:

Screenshot → Gemma 4 multimodal understanding → Error detection → Cause analysis → Language-specific correction → Explanation → Next action

The system identifies the programming language and visible error, explains what is wrong, identifies the relevant location in the code, provides a corrected version in the same programming language, explains why the correction works, and suggests what the user should do next.

## Approach and technologies

Describe your implementation, model(s), tools, and why you chose them. Credit reused libraries, datasets, starter code, and significant AI-assisted development.
## Approach and technologies

FixLens AI is implemented as a multimodal AI debugging assistant. The user uploads a programming error screenshot, and the application sends the image together with an analysis prompt to the Gemini API using Gemma 4.

The model analyzes both the visible source code and the error information in the screenshot. The application then presents the analysis as structured debugging information, including the detected error, explanation, location of the problem, corrected code, reason for the correction, step-by-step guidance, and the recommended next action.

The application is designed to preserve the programming language detected from the uploaded screenshot. For example, when the input contains Python code, the generated correction should remain Python rather than being converted into another programming language.

Technologies used include the project's existing frontend stack, Gemini API/Gemma 4 for multimodal AI analysis, browser-based image upload and processing, and Git/GitHub for source-code management.

AI-assisted development was used during development. AI assistance was used for development support, debugging, implementation guidance, and related project-development tasks. The final project implementation and submission are represented according to the actual project repository.

## Challenge evidence

Complete the relevant section(s) and remove those that do not apply.
### Best Use of Gemma 4

- Gemma 4 model identifier and Gemini API integration:
  [ADD THE EXACT GEMMA 4 MODEL IDENTIFIER USED IN THE PROJECT AND DESCRIBE THE GEMINI API INTEGRATION]

- Code link showing the integration:
  [ADD THE EXACT GITHUB FILE LINK WHERE GEMMA 4 / GEMINI API IS CALLED]

- Input and useful output; multimodal value where applicable:
  FixLens AI accepts a programming error screenshot as its input. The screenshot provides visual context containing source code, programming-language information, error messages, line numbers, and surrounding code.

  Gemma 4 analyzes the uploaded image and produces a debugging-oriented result including the detected error, what is wrong, the location of the problem, the cause, corrected code in the detected programming language, an explanation of why the fix works, step-by-step guidance, and a recommended next action.

  The multimodal capability is important because the system analyzes the actual contents of the uploaded screenshot rather than requiring the user to manually copy the error message and source code into a text prompt.

### Best Open-Source AI Project

- Open-source/open-weight AI component and its role:
- Code link showing the integration:
- Agent Skill Open Standard compliance (if applicable):
- Original harness implementation or meaningful changes (if applicable):

### Best Use of Gemma 4

- Gemma 4 model identifier and Gemini API integration:
- Code link showing the integration:
- Input and useful output; multimodal value where applicable:

### Build on elah

- Editing workflow / idea direction and elah version:
- Model/runtime and structured-edit implementation:
- Validation/correction metrics, caption/frame checks, or keep/discard/replay evidence for your option.

## Current status

- What works:- Users can upload programming error screenshots.
  - The application analyzes the uploaded image using the configured AI integration.
  - The system identifies the programming language and visible programming error.
  - The application provides an explanation of the problem and its cause.
  - The application provides a language-specific corrected code example.
  - The application explains why the correction works.
  - The application provides step-by-step guidance and a recommended next action.
  - The interface presents the analysis in a focused debugging workflow.
- Known limitations / incomplete features:- AI-generated analysis depends on the quality and readability of the uploaded screenshot.
  - Complex or ambiguous screenshots may require a clearer image.
  - AI-generated debugging suggestions should be reviewed by the developer before being applied to production code.
- What you would improve next:- Improve analysis reliability for more programming languages and complex debugging scenarios.
  - Add more detailed validation of generated fixes.
  - Improve handling of low-quality or partially visible screenshots.
  - Expand the debugging workflow with additional developer tools and integrations.

## Submission checklist

- [ ] Project repository is public and links work.
- [ ] Required challenge evidence is included.
- [ ] Project uses an open-source license where required by the challenge.
- [ ] Work and reused materials are represented honestly.
- [ ] No API keys, tokens, passwords, or private data are included.
- [ ] I followed the organizers' build window and submission instructions.
