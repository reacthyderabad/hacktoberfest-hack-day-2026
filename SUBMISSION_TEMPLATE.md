# UI Detective

## Team / attendee

- Team name (if applicable): UI Detective
- Members and GitHub usernames:
  - Reyan Khan — @Reyan-khan1811
  - Mohd Suhel — @suhel-bin-nisar
- Profile links (optional):https://github.com/suhel-bin-nisar
  - https://github.com/Reyan-khan1811


## Challenge

Select the challenge you are entering:

- [ ] Best Open-Source AI Project
- [x] Best Use of Gemma 4
- [ ] Build on elah

## Project links

- Public GitHub repository: https://github.com/Reyan-khan1811/ui-detective
- Open-source license (link to the license file): [Add your LICENSE link if the repository contains a license]

## Problem and solution

UI Detective helps developers bridge the gap between a visual website design and its implementation.

The user uploads a screenshot of a website interface. The application sends the image to Gemma 4 for multimodal analysis. Gemma identifies the visible UI elements, layout, and structure, and the application uses the analysis to help generate reusable React UI components.

Main workflow:

Screenshot → Gemma 4 analysis → UI structure → React component/code

## Approach and technologies

UI Detective is built as a React + Vite frontend with a Node.js + Express backend.

The project uses Gemma 4 through the Gemini API for multimodal screenshot understanding. The frontend provides the screenshot upload interface, preview, analysis interface, and generated-code display. The backend receives the image and communicates with the Gemini API while keeping the API key on the server side.

Technologies used:
- Gemma 4 / Gemini API
- React.js
- Vite
- JavaScript
- Node.js
- Express.js
- HTML/CSS
- Git/GitHub

The project was developed during the Hack Day build window with AI-assisted development used during implementation.

## Challenge evidence

### Best Use of Gemma 4

- Gemma 4 model identifier and Gemini API integration:
  Gemma 4 is accessed through the Google Gemini API from the Node.js/Express backend.

- Code link showing the integration:
  https://github.com/Reyan-khan1811/ui-detective/blob/main/server/index.js

- Input and useful output; multimodal value where applicable:
  Input: a website screenshot uploaded by the user.

  Output: Gemma 4 analyzes the visual interface and identifies UI elements and layout information that can be used to create reusable React components.

  The multimodal capability is important because the primary input is a visual screenshot rather than only text.

## Current status

- What works:
  - React frontend
  - Screenshot upload
  - Image preview
  - UI analysis interface
  - React code output interface
  - Node.js/Express backend
  - Gemini API integration
  - GitHub repository and collaborative development workflow

- Known limitations / incomplete features:
  - The public deployment of the backend/API is not yet complete.
  - AI analysis requires a valid Gemini API key configured on the backend.
  - Generated React code and analysis can be further refined for different UI styles and complex layouts.

- What you would improve next:
  - Deploy the backend for a fully public demo.
  - Improve prompt engineering and generated React code quality.
  - Add more detailed component and layout detection.
  - Add responsive-layout detection.
  - Improve error handling and loading states.

## Submission checklist

- [x] Project repository is public and links work.
- [x] Required challenge evidence is included.
- [ ] Project uses an open-source license where required by the challenge.
- [x] Work and reused materials are represented honestly.
- [x] No API keys, tokens, passwords, or private data are included.
- [x] I followed the organizers' build window and submission instructions.
