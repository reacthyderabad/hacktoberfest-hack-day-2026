# JanSamadhan – AI-Powered Civic Grievance System

## Team / attendee

- Team name: JanSamadhan
- Members and GitHub usernames: RudraCodeUp ([@RudraCodeUp](https://github.com/RudraCodeUp))

## Challenge

Select the challenge you are entering:

- [x] Best Open-Source AI Project
- [x] Best Use of Gemma 4

## Project links

- Public GitHub repository: https://github.com/RudraCodeUp/Civic-Reporting
- Open-source license: https://github.com/RudraCodeUp/Civic-Reporting/blob/master/LICENSE

## Problem and solution

**Who is this for?** Citizens who need to report civic issues (potholes, broken streetlights, waterlogging, garbage dumps, etc.) to local municipal authorities.

**What problem does it solve?** Civic complaint filing in India is fragmented, opaque, and rarely followed up. Citizens don't know if their complaint was received, acted upon, or resolved. Municipal workers lack structured workflows.

**Main input → output workflow:**
1. Citizen submits a complaint with photo + location (via mobile app or WhatsApp)
2. Gemma 4 Vision classifies the issue type, severity, and relevant department automatically
3. Complaint is routed to the right municipal department with AI-suggested resolution steps
4. Citizen gets real-time status updates via push notifications and WhatsApp
5. Municipal dashboard shows analytics, heatmaps, and department performance metrics

## Approach and technologies

**Stack:**
- **Mobile App**: React Native (Expo) – iOS & Android
- **Web Dashboard**: React.js with interactive map (Leaflet/Mapbox)
- **Backend**: Node.js + Express + MongoDB
- **AI Classification**: Gemma 4 via Gemini API – multimodal (image + text) for complaint categorization, severity scoring, and department routing
- **WhatsApp Integration**: Python (FastAPI) + Meta WhatsApp Cloud API for conversational complaint filing
- **Real-time Updates**: Socket.IO for live status tracking
- **Image Storage**: Cloudinary

**Why Gemma 4?** Gemma 4's multimodal capability lets us process citizen-uploaded photos alongside text descriptions to accurately classify complaints without manual triage. The model identifies issue type (e.g., "pothole" vs "garbage dump"), estimates severity, and suggests the responsible department — all from a single API call.

**Key AI integration:**
- [`server/services/gemmaClient.js`](https://github.com/RudraCodeUp/Civic-Reporting/blob/master/server/services/gemmaClient.js) – Gemma 4 Vision API wrapper
- [`server/services/classificationService.js`](https://github.com/RudraCodeUp/Civic-Reporting/blob/master/server/services/classificationService.js) – AI-driven complaint classification pipeline
- [`server/services/workflowService.js`](https://github.com/RudraCodeUp/Civic-Reporting/blob/master/server/services/workflowService.js) – AI-assisted department routing and resolution workflow

## Challenge evidence

### Best Use of Gemma 4

- **Gemma 4 component and its role**: Gemma 4 Vision (via Gemini API) powers the core classification engine. It processes complaint photos + text, returns structured JSON with category, subcategory, severity score (1–5), affected department, and suggested resolution steps.
- **Multimodal input**: Every complaint supports photo upload. Gemma 4 analyzes the image alongside the citizen's text description for accurate classification.
- **Code link showing the integration**: https://github.com/RudraCodeUp/Civic-Reporting/blob/master/server/services/gemmaClient.js

### Best Open-Source AI Project

- **Open-source AI component**: Google Gemma 4 (open-weight model accessed via Gemini API)
- **Role in the project**: Automated complaint classification, severity assessment, and department routing — replacing manual triage entirely
- **Code link**: https://github.com/RudraCodeUp/Civic-Reporting/blob/master/server/services/classificationService.js
