# TraceLens AI

## Team / attendee

- Team name (if applicable): Individual
- Members and GitHub usernames: Nabil (@baigny)
- Profile links (optional): https://github.com/baigny

## Challenge

Select the challenge you are entering:

- [ ] Best Open-Source AI Project
- [x] Best Use of Gemma 4
- [ ] Build on elah

If listing multiple categories, confirm eligibility with the organizers and complete evidence for each.

## Project links

- Public GitHub repository: https://github.com/baigny/tracelens-ai-gemma4
- Open-source license: [MIT License](https://github.com/baigny/tracelens-ai-gemma4/blob/main/LICENSE)

## Problem and solution

TraceLens AI helps people identify everyday objects without typing a description. In Air Trace mode, the user draws an outline in the air with an index finger; in Scan Object mode, the user captures an object with the camera. After the user selects Analyze, Gemma interprets that single image and returns a likely object name, confidence, and short description.

## Approach and technologies

The app uses Next.js and React for the interface, MediaPipe Hand Landmarker for browser-local fingertip tracking in Air Trace mode, and the Google GenAI SDK to send the trace or captured photo to Gemma 4 through a server-side API route. Analysis is user-triggered; live camera frames are not sent. The response is validated as structured JSON before it is shown. Reused libraries: MediaPipe Tasks Vision and the Google GenAI SDK. No dataset or starter code is documented in the project. GitHub Copilot assisted with preparing this submission; add any other significant AI assistance used during implementation.

## Demo

Requires Node.js 24, a webcam for camera workflows, and a Gemini API key with access to the configured model. The project has no hosted demo.

```powershell
npm ci
Copy-Item .env.example .env.local
# Set GEMINI_API_KEY in .env.local, then:
npm run dev
```

Open http://localhost:3000. In Air Trace, draw a simple object outline, stop the trace, and select Analyze with Gemma. In Scan Object, capture an object and select Analyze with Gemma. See the [project README](https://github.com/baigny/tracelens-ai-gemma4#demo-under-two-minutes) for full instructions and privacy behavior.

## Challenge evidence

Complete the relevant section(s) and remove those that do not apply. This entry is for Best Use of Gemma 4.

### Best Use of Gemma 4

- Gemma 4 model identifier and Gemini API integration: `gemma-4-26b-a4b-it`, called through `@google/genai` in [lib/gemma.ts](https://github.com/baigny/tracelens-ai-gemma4/blob/main/lib/gemma.ts).
- Code link showing the integration: [Model configuration, multimodal request, and result parsing](https://github.com/baigny/tracelens-ai-gemma4/blob/main/lib/gemma.ts); [server API route and image validation](https://github.com/baigny/tracelens-ai-gemma4/blob/main/app/api/interpret/route.ts).
- Input and useful output; multimodal value where applicable: A camera photo or air-drawn trace is sent as one image, and Gemma returns the likely object, confidence, and a concise description. Image input lets the user identify an object without translating its appearance into text first.

## Current status

- What works: Air Trace and Scan Object workflows are implemented, including explicit image analysis, structured result validation, and API error handling. Automated tests cover trace export and rejection cases, model-output validation, and API request validation.
- Known limitations / incomplete features: This is a localhost prototype with no authentication or hosted demo. The project README reports that a real webcam session, successful live Gemma response, and responsive browser layout were not verified. Live model use requires the user's own API key and model access.
- What you would improve next: Complete and record the webcam/API demo checks, test the responsive layout, and publish a demo with appropriate API-key protections.

## Submission checklist

- [ ] Project repository is public and links work.
- [ ] Required challenge evidence is included.
- [ ] Project uses an open-source license where required by the challenge.
- [ ] Work and reused materials are represented honestly.
- [ ] No API keys, tokens, passwords, or private data are included.
- [ ] I followed the organizers' build window and submission instructions.
