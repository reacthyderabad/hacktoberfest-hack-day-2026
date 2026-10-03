# Civiq

## Team / attendee

- Team name (if applicable): Solo
- Members and GitHub usernames: Gurutej Ganapurapu — [@GURUTEJGANAPURAPU](https://github.com/GURUTEJGANAPURAPU)
- Profile links (optional): https://github.com/GURUTEJGANAPURAPU

## Challenge

Select the challenge you are entering:

- [ ] Best Open-Source AI Project
- [x] Best Use of Gemma 4
- [ ] Build on elah

## Project links

- Public GitHub repository: https://github.com/GURUTEJGANAPURAPU/civiq
- Open-source license (link to the license file): https://github.com/GURUTEJGANAPURAPU/civiq/blob/main/LICENSE

## Problem and solution

Civic problems such as potholes, overflowing garbage, broken streetlights, damaged footpaths, and water leaks are often reported as isolated complaints. This makes it difficult to understand whether multiple reports describe the same real-world problem, how long the problem has existed, whether it keeps recurring, and whether a reported resolution actually addresses the issue.

Civiq is a community-powered civic intelligence platform that gives every civic problem a persistent memory.

A citizen starts by taking or uploading a photo of a civic issue. Gemma 4 directly analyzes the multimodal image and produces structured observations about the issue, its context, potential impact, severity, uncertainty, and recommended next action. Civiq then checks for nearby existing incidents.

If the issue already exists, the citizen can support the existing incident or contribute independent evidence instead of creating another duplicate complaint. If it is new, Civiq creates a persistent Issue Twin for that real-world problem.

The Issue Twin maintains evidence, community support, status history, authority actions, resolution evidence, and recurrence history. This allows a civic problem to move from observation and corroboration toward reporting, action, resolution review, and long-term civic memory.

Main workflow:

USER → PHOTO → GEMMA 4 UNDERSTANDS → CORROBORATE → ISSUE TWIN → ACT → RESOLUTION REVIEW → CIVIC MEMORY

## Approach and technologies

Civiq uses a focused multimodal workflow where Gemma 4 is used as the core image understanding layer.

Technologies used:

- React + TypeScript
- Vite
- TanStack Start
- Tailwind CSS + shadcn/ui
- Google Gemma 4 through the Gemini API
- TanStack Start server functions
- Supabase PostgreSQL
- Supabase Authentication
- Supabase Storage
- Supabase Realtime
- Leaflet + React Leaflet
- OpenStreetMap
- Browser Geolocation API

The application uses structured model output so that image understanding can be converted into actionable civic information rather than only generating a natural-language description.

The civic workflow also separates community support from independent evidence. Multiple citizens can contribute evidence to the same real-world issue, while the persistent Issue Twin preserves the problem's history even after a complaint is closed.

Leaflet and OpenStreetMap are used for the civic map experience and nearby issue discovery.

AI-assisted development tools were used during development for UI scaffolding, implementation assistance, debugging, and iteration. Reused libraries and frameworks are credited through the project's dependencies and repository documentation.

## Challenge evidence

### Best Use of Gemma 4

- Gemma 4 model identifier and Gemini API integration: `gemma-4-31b-it` accessed through the Gemini API using the server-side `GEMINI_API_KEY`. Gemma 4 is used as the multimodal civic-image understanding layer.
- Code link showing the integration: https://github.com/GURUTEJGANAPURAPU/civiq/blob/main/src/lib/gemma.functions.ts
- Input and useful output; multimodal value where applicable:

  **Input:** A citizen uploads a real-world civic issue image such as a pothole, garbage accumulation, broken streetlight, damaged footpath, or water leakage.

  **Gemma 4 output:** The model analyzes the image and extracts structured information such as the likely issue type, visible observations, surrounding context, severity, potential impact, uncertainty, and recommended next action.

  The multimodal capability is essential because the system needs to understand visual evidence directly from the citizen's image. Instead of requiring the user to manually describe the problem, Gemma 4 converts the image into structured information that Civiq can use for corroboration, incident creation, prioritization, and action.

## Current status

- What works:

  - Civic issue reporting workflow
  - Multimodal Gemma 4 integration through the Gemini API
  - Image-based civic issue understanding
  - Supabase-backed issue data model
  - Civic issue and evidence storage
  - Nearby issue discovery
  - Community support and evidence concepts
  - Persistent Issue Twin workflow
  - Civic map experience using Leaflet and OpenStreetMap
  - Authority and community workflow concepts
  - Resolution evidence workflow

- Known limitations / incomplete features:

  - Some advanced civic intelligence and authority-side workflows are still prototype-level.
  - Real-world government integrations are not currently connected.
  - AI-assisted resolution assessment is not an official government verification mechanism.
  - The platform is currently designed as a hackathon prototype rather than a production-scale municipal deployment.

- What you would improve next:

  - Add integrations with municipal complaint systems and public civic APIs.
  - Improve multi-citizen evidence fusion and recurring issue detection.
  - Expand authority-side workflows and notifications.
  - Add stronger geospatial clustering and historical civic analytics.
  - Improve production scalability, moderation, and privacy controls.

## Submission checklist

- [x] Project repository is public and links work.
- [x] Required challenge evidence is included.
- [x] Project uses an open-source license where required by the challenge.
- [x] Work and reused materials are represented honestly.
- [x] No API keys, tokens, passwords, or private data are included.
- [ ] I followed the organizers' build window and submission instructions.