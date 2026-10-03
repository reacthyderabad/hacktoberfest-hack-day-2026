# FixLens — Show It What's Wrong

## Team / attendee

- **Team name:** Paradise
- **Members and GitHub usernames:**
  - Bulusu Vyaghri Aiswarya — [@github-Aishwarya00806]
  - Neelam Anjali — [@github-Anjali112005]
  - Ashritha Kadarla - [@github-ashrithakadarla]

## Challenge

**Best Use of Gemma 4**

## Project links

- **Public GitHub repository:** https://github.com/ashrithakadarla/hacktoberfest-fixlens.git

## Problem and solution

### Problem

When something stops working, people often have to describe the problem manually or search through complicated troubleshooting guides. This is especially difficult for physical setups such as electronics, devices, mechanical assemblies, and hardware projects where the problem is easier to see than to describe.

### Solution

**FixLens** is a multimodal AI troubleshooting assistant that lets users show a problem instead of describing it.

The user captures or uploads an image and can optionally describe the problem. FixLens sends the visual input and context to **Gemma 4 through the Gemini API**. Gemma 4 analyzes the image, identifies visible components and potential issues, explains the evidence behind its diagnosis, and provides actionable troubleshooting steps.

### Main workflow

```text
Image / Camera
      ↓
Optional problem description
      ↓
Gemma 4 multimodal analysis
      ↓
Identify visible evidence
      ↓
Detect possible issue
      ↓
Explain why
      ↓
Suggest troubleshooting steps
      ↓
User fixes the problem
```

FixLens is designed to communicate uncertainty rather than presenting guesses as facts. When the image does not contain enough information, the application asks the user for a clearer or more complete image instead of inventing a diagnosis.

## Approach and technologies

### Technologies

- React
- Vite
- TypeScript
- FastAPI
- Python
- Gemini API
- Gemma 4
- HTML/CSS
- REST API

### Architecture

```text
React Frontend
      │
      │ Image + optional description
      ▼
FastAPI Backend
      │
      ▼
Gemma 4 via Gemini API
      │
      ▼
Structured Diagnosis
      │
      ├── Observations
      ├── Possible Issue
      ├── Reasoning
      ├── Troubleshooting Steps
      ├── Alternative Causes
      └── Safety Guidance
      │
      ▼
React Diagnosis Interface
```

Gemma 4 was chosen because the core problem requires understanding visual information together with natural-language context. A simple text-only chatbot would not provide the same value.

The application uses structured model output so that the frontend can present the diagnosis as a dedicated troubleshooting interface rather than displaying an unstructured AI response.

### AI-assisted development

AI-assisted development tools were used during implementation for code generation, debugging, architectural suggestions, and development assistance. All generated code was reviewed and integrated into the project by the team.

Third-party libraries and frameworks are credited through their respective package metadata and project documentation.

## Challenge evidence

### Best Use of Gemma 4

 - **Gemma 4 model identifier and Gemini API integration:** `gemma-4-31b-it`

  FixLens integrates the selected Gemma 4 model through the Gemini API. The backend sends the user's uploaded image together with optional problem context and requests a structured troubleshooting analysis.

- **Code link showing the integration:**  
  https://github.com/ashrithakadarla/hactoberfest-fixlens/blob/main/backend/app/services/gemini_service.py

- **Input and useful output; multimodal value where applicable:**

  **Input:**
  - User-uploaded photograph or camera image
  - Optional natural-language description
  - Optional troubleshooting category

  **Example input:**

  > A photograph of an Arduino circuit where the LED is not turning on.

  **Gemma 4 output:**
  - Identifies visible components
  - Separates observations from inferred issues
  - Suggests a possible fault
  - Explains why the issue is suspected
  - Provides ordered troubleshooting steps
  - Provides alternative possible causes
  - Provides safety guidance when appropriate
  - Requests additional information when the image is insufficient

  **Example workflow:**

  ```text
  Photograph of circuit
          ↓
  Gemma 4 multimodal analysis
          ↓
  Visible components identified
          ↓
  Possible wiring/polarity issue
          ↓
  Explanation of visual evidence
          ↓
  Step-by-step troubleshooting
  ```

  The multimodal input is essential because the primary information required for diagnosis is contained in the image itself. The user does not need to know the names of components or accurately describe the problem before receiving assistance.

## Current status

### What works

- Image upload
- Multimodal image analysis
- Gemma 4 integration through the Gemini API
- Optional user problem description
- Automatic troubleshooting analysis
- Structured diagnosis output
- Visible observations
- Possible issue identification
- Explanation/reasoning
- Troubleshooting steps
- Alternative possible causes
- Safety guidance where relevant
- Handling of insufficient visual evidence
- Responsive web interface

### Known limitations / incomplete features

- Visual diagnosis is limited by the quality, angle, lighting, and completeness of the uploaded image.
- FixLens cannot physically test or verify a device after recommending a fix.
- Some hardware faults cannot be reliably determined from a photograph alone.
- The current implementation focuses on a small number of troubleshooting scenarios rather than attempting to diagnose every possible physical problem.
- AI-generated diagnoses should be treated as assistance and not as a guaranteed technical diagnosis.

### What you would improve next

- Add more specialized troubleshooting categories.
- Add guided image capture that tells users what additional view is needed.
- Add multi-image diagnosis for complex setups.
- Add visual comparison between the original and corrected setup.
- Add a troubleshooting session history.
- Improve confidence and uncertainty communication.
- Add more domain-specific diagnostic workflows for electronics, software, and mechanical systems.

## Submission checklist

- [✓] Project repository is public and links work.
- [✓] Required Gemma 4 challenge evidence is included.
- [✓] Project uses an open-source license.
- [✓] Work and reused materials are represented honestly.
- [✓] No API keys, tokens, passwords, or private data are included.
- [✓] I followed the organizers' build window and submission instructions.