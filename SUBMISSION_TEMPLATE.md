# PayPrAPI

## Team / attendee

- Team name: Tech Diva
- Members and GitHub usernames:
  - Keerthana Potharaju — [@techy-ops](https://github.com/techy-ops)
- Profile links (optional):
  - GitHub: https://github.com/techy-ops

## Challenge

Select the challenge you are entering:

- [x] Best Open-Source AI Project
- [x] Best Use of Gemma 4
- [ ] Build on elah

## Project links

- Public GitHub repository: https://github.com/techy-ops/PayprAPI
- Open-source license: See `LICENSE` in the repository.

## Problem and solution

PayPrAPI is a pay-per-use AI API marketplace that makes AI services intent-driven instead of tool-driven.

Users can describe what they want in natural language, with optional image input. Gemma 4 understands the request, selects the appropriate AI tool, and generates the required parameters. The selected API then goes through the existing X402 payment flow on Algorand Testnet before the AI service executes.

**Workflow:**  
`User → Gemma 4 → Tool Selection → X402 Payment → Algorand Verification → AI Service → Result`

## Approach and technologies

Gemma 4 is used as the intelligent routing layer through the Google Gemini API. It receives the user's natural-language request and optional image, identifies the intent, selects one of PayPrAPI's existing AI services, and returns structured tool arguments.

The backend validates the model output before execution. X402 handles pay-per-use payments, while the Node.js gateway verifies the payment on Algorand Testnet before forwarding the request to the FastAPI AI service.

**Technologies:** Python, FastAPI, Node.js, Express.js, React, Next.js, TypeScript, Gemma 4, Google GenAI API, X402, Algorand, AlgoNode, Supabase/PostgreSQL.

Existing open-source libraries and project components are credited through the repository. AI-assisted development was used during implementation and debugging.

## Challenge evidence

### Best Use of Gemma 4

- **Gemma 4 model identifier and Gemini API integration:** `gemma-4-26b-a4b-it`, integrated using the Google GenAI API.
- **Code link showing the integration:** `backend/ai-services/services/gemma.py` and `backend/ai-services/routers/agent.py`
- **Input and useful output; multimodal value where applicable:** Gemma receives natural-language text and supports optional image input. It returns a structured tool selection such as `translate`, `summarize`, `sentiment`, or `image_gen`, together with the required arguments. Multimodal text + image routing was verified through the backend agent endpoint.

## Current status

- **What works:**
  - Gemma 4 model integration
  - Natural-language tool selection
  - Structured argument generation
  - Text and image + text routing
  - Output validation and error handling
  - Existing X402 payment flow
  - Algorand Testnet payment verification
  - Existing FastAPI AI services
  - Existing React/Next.js interface remains unchanged

- **Known limitations / incomplete features:**
  - The current UI primarily demonstrates text-based routing; multimodal image input is supported at the backend agent endpoint.
  - The implementation currently focuses on intelligent routing rather than adding new AI services.

- **What you would improve next:**
  - Add richer multimodal workflows and more AI tools.
  - Improve routing confidence and fallback handling.
  - Expand agent workflows while keeping payment and execution controlled by the backend.

## Submission checklist

- [x] Project repository is public and links work.
- [x] Required challenge evidence is included.
- [x] Project uses an open-source license where required by the challenge.
- [x] Work and reused materials are represented honestly.
- [x] No API keys, tokens, passwords, or private data are included.
- [x] I followed the organizers' build window and submission instructions.
