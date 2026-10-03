# RoadLens AI — Multimodal Civic Road Hazard Inspection & Instant Multilingual Complaint Generator

## Team / attendee

- Team name (if applicable): Solo (Individual Participant)
- Members and GitHub usernames: Shaikh Adnan (@shaikhadnan0123)
- Profile links (optional): https://github.com/shaikhadnan0123

## Challenge

Select the challenge you are entering:

- [x] Best Open-Source AI Project
- [x] Best Use of Gemma 4

## Project links

- Public GitHub repository: https://github.com/shaikhadnan0123/roadlens-gemma
- Open-source license (link to the license file): https://github.com/shaikhadnan0123/roadlens-gemma/blob/main/LICENSE

## Problem and solution

**Who is this for?**
Citizens, municipal officers, urban infrastructure maintenance teams, and civic advocacy groups (such as the Greater Hyderabad Municipal Corporation - GHMC).

**What problem does it solve?**
Citizen reporting of urban road hazards (deep potholes, monsoon waterlogging, collapsed traffic signage, exposed drain grates) is frequently delayed or ignored due to vague manual descriptions, lack of structured defect data, and regional language barriers when drafting formal civic complaints to municipal departments.

**Main input → output workflow:**
1. **Input**: Citizen uploads a road defect photo or quick-tests with sample demo photos (pothole, waterlogging, broken sign).
2. **Processing**: Multimodal visual reasoning engine (local open-weight Ollama model / Gemma 4 / Gemini Cloud API) inspects asphalt erosion, curb depth, surface area, and surrounding landmarks.
3. **Output**:
   - **Validated Structured JSON Schema**: Contains issue type, severity rating (`Critical` | `High` | `Medium` | `Low`), confidence meter, location hints, hazard scale, recommended repair action, and target municipal authority.
   - **Instant Multilingual Complaint Generator**: Auto-drafts formal municipal grievance letters in **English**, **Telugu**, and **Hindi** ready for one-click copy and submission to GHMC civic portals.

## Approach and technologies

**Implementation Overview:**
- **Frontend Architecture**: Built with React + Vite and an architectural dark UI design system (Stratum/Halden inspired luxury dark theme with dynamic reference scaling `--u`/`--t`, chamfered cut-corner buttons, laser scanning line overlays, and matrix letter decode scramble animations).
- **Backend Architecture**: Python Flask REST API (`app.py`) featuring a multi-strategy AI inference pipeline:
  - **Strategy 1 (Primary - Open-Source AI)**: Queries local Ollama open-weight vision model instance (`llava` / `gemma` family) via REST payload.
  - **Strategy 2 (Cloud Fallback - Gemma 4)**: Uses Google GenAI SDK (`google-genai`) with automated failover across Gemma 4 / Gemini models (`gemini-2.0-flash`, `gemini-1.5-flash`).
  - **Strategy 3 (Offline Simulation Engine)**: High-fidelity open-weight simulation fallback for instant local evaluation.

**Technologies Used**:
- Python, Flask, Flask-CORS, Pillow (PIL), `google-genai` SDK, Ollama API
- React 18, Vite, Lucide React Icons
- Custom CSS Design Tokens & Chamfered Vector Utilities

## Challenge evidence

### Best Open-Source AI Project

- **Open-source/open-weight AI component and its role**: Local open-weight vision model running via Ollama (`llava` / `gemma` open-weight vision architecture) performing raw image inspection and JSON extraction.
- **Code link showing the integration**: [query_ollama_vision() in app.py (L88-L110)](https://github.com/shaikhadnan0123/roadlens-gemma/blob/main/app.py#L88-L110)
- **Open-source license**: MIT License file available at [LICENSE](https://github.com/shaikhadnan0123/roadlens-gemma/blob/main/LICENSE)

### Best Use of Gemma 4

- **Gemma 4 model identifier and Gemini API integration**: Google GenAI SDK (`from google import genai`) integration using Gemma 4 / Gemini Flash models with fallback handling.
- **Code link showing the integration**: [Gemini Strategy 2 Fallback in app.py (L256-L276)](https://github.com/shaikhadnan0123/roadlens-gemma/blob/main/app.py#L256-L276)
- **Input and useful output**: Evaluates uploaded road defect imagery and produces structured JSON metadata alongside localized multilingual grievance drafts (English, Telugu, Hindi) for immediate municipal ticket filing.

## Current status

- **What works**: End-to-end photo upload and sample quick-test, multimodal visual defect analysis, structured JSON schema validation, instant multilingual complaint draft generation (English, Telugu, Hindi), copy-to-clipboard, portal redirection, multi-engine AI fallback pipeline, and responsive architectural dark UI theme.
- **Known limitations / incomplete features**: Requires local Ollama instance or active API key for live AI inference; OCR text extraction on worn signboards can be further fine-tuned.
- **What you would improve next**: Native mobile app integration (React Native/Flutter), auto-geocoding via photo GPS EXIF metadata, and direct automated webhook API integration with municipal grievance tracking systems (e.g. GHMC 1913 hotline portal).

## Submission checklist

- [x] Project repository is public and links work.
- [x] Required challenge evidence is included.
- [x] Project uses an open-source license where required by the challenge.
- [x] Work and reused materials are represented honestly.
- [x] No API keys, tokens, passwords, or private data are included.
- [x] I followed the organizers' build window and submission instructions.
