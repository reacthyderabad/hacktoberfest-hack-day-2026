# PR Title

Add PayPrAPI Submission for Gemma 4 and Open-Source AI Challenges

## Summary

Submit **PayPrAPI** by **Team Tech Diva** for the following Hack Day challenges:

- Best Use of Gemma 4
- Best Open-Source AI Project

## Project

**PayPrAPI** is a pay-per-use AI API marketplace where Gemma 4 acts as an intelligent multimodal router.

Instead of requiring users to manually choose an AI service, Gemma understands the user's request, selects the appropriate tool, and generates the required parameters. The selected service then goes through the existing X402 payment flow before execution.

### Core Flow

User Request → Gemma 4 → Tool Selection → X402 Payment → Algorand Verification → AI Service → Result

## Best Use of Gemma 4

- Integrated `gemma-4-26b-a4b-it` using the Google GenAI API.
- Added natural-language intent understanding and automatic tool selection.
- Supports text and optional image + text input.
- Generates structured tool arguments for existing PayPrAPI services.
- Added validation and error handling for model outputs.

### Gemma Integration

- `backend/ai-services/services/gemma.py`
- `backend/ai-services/routers/agent.py`

## Best Open-Source AI Project

PayPrAPI integrates an open Gemma 4 model as the core intelligence layer of its agentic routing workflow.

The project combines the AI routing layer with existing open-source backend services and a controlled execution architecture:

Gemma decides → Backend validates → X402 handles payment → Algorand verifies → AI service executes.

The implementation keeps the model responsible for understanding and routing requests while the backend remains responsible for validation, payment enforcement, and tool execution.

## Technologies

- Gemma 4
- Google GenAI API
- Python
- FastAPI
- Node.js
- Express.js
- React
- Next.js
- TypeScript
- X402
- Algorand Testnet
- AlgoNode
- Supabase/PostgreSQL

## Team

**Team Name:** Tech Diva

**Project:** PayPrAPI

**GitHub:** https://github.com/techy-ops/PayprAPI

## Evidence

The submission includes challenge-specific evidence, implementation details, project status, and repository links in `SUBMISSION_TEMPLATE.md`.

## Checklist

- [x] Public project repository included
- [x] Gemma 4 integration documented
- [x] Open-source AI component documented
- [x] Challenge evidence included
- [x] No API keys or secrets included
- [x] Reused materials and project components represented honestly
