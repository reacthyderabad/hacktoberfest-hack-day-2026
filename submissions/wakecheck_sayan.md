# WakeCheck

## Team / attendee

- Team name (if applicable): WakeCheck
- Members and GitHub usernames: Sayan Mukherjee (@sayan2276)
- Profile links (optional): https://github.com/sayan2276

## Challenge

Select the challenge you are entering:

- [ ] Best Open-Source AI Project
- [x] Best Use of Gemma 4
- [ ] Build on elah

## Project links

- Public GitHub repository: https://github.com/sayan2276/wakeCheck
- Open-source license (link to the license file): https://github.com/sayan2276/wakeCheck/blob/main/LICENSE

## Problem and solution

**Who is this for?**  
Heavy sleepers, students, and professionals who struggle with morning grogginess and reflexively hit snooze or turn off basic alarms without actually waking up.

**What problem does it solve?**  
Standard alarms require zero cognitive engagement—users dismiss them while half-asleep and immediately drift back to sleep. Math alarms often become frustrating or mechanical without waking up the visual cortex.

**Main input → output workflow:**  
1. **Trigger:** At the alarm time, WakeCheck initiates persistent looping audio via `expo-audio` and displays a high-resolution scene image.
2. **Input:** The mobile client sends the image to Gemma 4 via the FastAPI backend to generate 3 specific visual questions about details in the scene. The user types answers to all 3 questions into separate input fields.
3. **Multimodal Evaluation:** Gemma 4 inspects the image alongside the questions and user answers, scoring visual perception and factual accuracy from 0–100%.
4. **Output:** If the score reaches 80% or higher, the alarm turns OFF and a celebration screen is shown. If under 80%, the alarm continues ringing and per-question corrective feedback is displayed for another attempt.

## Approach and technologies

- **Mobile Client:** React Native with Expo SDK 54, TypeScript, and React Hooks.
- **Audio Engine:** `expo-audio` for non-blocking, reliable looping playback that cannot be silenced without passing the challenge.
- **Backend Service:** FastAPI (Python 3.12) with asynchronous endpoints for question generation (`/generate-questions`) and multimodal evaluation (`/evaluate`).
- **AI Model:** Google Gemma 4 (`gemma-4-31b-it`) via the Gemini API (`google-genai` / `google-generativeai` SDK).
- **Image Pipeline:** Dynamic client-side Base64 serialization paired with Python Pillow (`PIL`) image processing.
- **Dynamic LAN Discovery:** Automatically resolves Metro host URI (`Constants.expoConfig?.hostUri`) so physical mobile devices on Wi-Fi seamlessly communicate with the local backend.
- **Resilience:** Built-in intelligent semantic fallback engine on the backend ensuring reliable demonstrations even in restricted hackathon Wi-Fi environments.

## Challenge evidence

### Best Use of Gemma 4

- **Gemma 4 model identifier and Gemini API integration:**  
  `gemma-4-31b-it` integrated via Google GenAI / Gemini API SDK (`google-genai` and `google-generativeai`). Configured with temperature `0.2` and structured JSON response parsing.
- **Code link showing the integration:**  
  [server/main.py (lines 125–215)](https://github.com/sayan2276/wakeCheck/blob/main/server/main.py#L125-L215)
- **Input and useful output; multimodal value where applicable:**  
  - *Input:* Challenge scene image (raw visual pixels / Base64) + 3 visual questions + 3 user-typed observation answers.
  - *Useful Output:* Structured JSON evaluation payload containing `score` (0–100%), per-question `correct` booleans, specific `feedback`, and `passed` status.
  - *Multimodal Value:* Gemma 4 directly interprets fine-grained visual features (colors, counts, spatial arrangements) from image pixels and compares them semantically against free-form natural language responses. It rewards genuine visual perception rather than rigid keyword matching.

## Current status

- **What works:**  
  - Interactive alarm configuration with custom time steppers, AM/PM toggle, and quick test presets.
  - Instant "🚨 TEST ALARM NOW" mode for judging and demonstrations.
  - Continuous non-stop alarm audio looping via `expo-audio`.
  - Dynamic multimodal question generation using Gemma 4.
  - Triple-input visual challenge UI with real-time feedback and score calculation.
  - Automatic audio silencing only upon achieving an 80%+ accuracy threshold.
  - Real-time backend connection status badge on mobile home screen.
- **Known limitations / incomplete features:**  
  - Background execution is currently limited to active Expo Go foreground sessions; standalone native OS alarm daemon is not yet compiled.
- **What you would improve next:**  
  - Live camera integration where Gemma 4 generates questions about the user's real room (e.g., *"Show me your toothbrush"* or *"What color is your curtains?"*).
  - Waking streak analytics and customizable difficulty levels.

## Submission checklist

- [x] Project repository is public and links work.
- [x] Required challenge evidence is included.
- [x] Project uses an open-source license where required by the challenge.
- [x] Work and reused materials are represented honestly.
- [x] No API keys, tokens, passwords, or private data are included.
- [x] I followed the organizers' build window and submission instructions.
