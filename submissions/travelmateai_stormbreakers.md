# TravelMateAI

## Team / attendee

- Team name (if applicable): StormBreakers
- Members and GitHub usernames:
  - Vegiraju Mahaveer Varma — [VegirajuMahaveerVarma](https://github.com/VegirajuMahaveerVarma)
  - Akshaya Vurumadla — [akshayavurumadla-18](https://github.com/akshayavurumadla-18)
  - Olive Ramola Rampal — [rsolive07](https://github.com/rsolive07)
  - Mokshagna Tiruvaipati — [mokshagna-monarch](https://github.com/mokshagna-monarch)
- Profile links (optional):
  - https://github.com/VegirajuMahaveerVarma
  - https://github.com/akshayavurumadla-18
  - https://github.com/rsolive07
  - https://github.com/mokshagna-monarch

## Challenge

Select the challenge you are entering:

- [x] Best Open-Source AI Project
- [x] Best Use of Gemma 4

If listing multiple categories, confirm eligibility with the organizers and complete evidence for each.

## Project links

- Public GitHub repository: https://github.com/VegirajuMahaveerVarma/TravelMateAI
- Open-source license (link to the license file): https://github.com/VegirajuMahaveerVarma/TravelMateAI/blob/main/LICENSE

## Problem and solution

TravelMateAI is designed for travelers who need to plan multiple parts of a journey without manually entering the same information into different services.

Travel planning is often fragmented across flight or train information, airport transfers, hotels, local transport, food, documents, notifications, and travel support. Users may have to provide similar journey details repeatedly.

TravelMateAI provides an AI-first journey planning workflow. The user starts with a natural-language description of their journey, for example:

"I'm travelling from Hyderabad to Mumbai next Friday. My flight is AI 542 and I'm travelling with my parents. We have 3 large suitcases and 2 cabin bags. We need an airport pickup, a hotel near Andheri and local transport."

The application sends the travel request to Gemma 4, which understands the journey and extracts structured information such as origin, destination, travel date, transport mode, travel reference, passengers, luggage, and preferences.

The extracted journey intent is then used to create a connected travel workspace with arrival-aware pickup planning, vehicle matching, hotels, food, local transport, documents, notifications, emergency information, and AI travel support.

The main workflow is:

Natural-language travel prompt → Gemma 4 → structured journey intent → journey planning → connected travel services → personalized journey workspace.

## Approach and technologies

TravelMateAI uses React and Vite for the frontend and Node.js with Express for the backend.

The core AI workflow uses Google's Gemma 4 through the Google GenAI SDK (@google/genai). Gemma 4 converts a user's natural-language travel request into structured journey information using a defined JSON schema. This allows the rest of the application to work with predictable fields instead of relying only on free-form text.

The main technologies used are:

- React
- Vite
- JavaScript
- Node.js
- Express
- Google GenAI SDK (@google/genai)
- Google Gemma 4
- HTML/CSS
- GitHub Actions

Gemma 4 was chosen because natural-language understanding is central to the product. Users can describe an entire journey in their own words instead of filling out multiple forms, while the application converts that request into structured information that drives the rest of the workflow.

The application also includes a deterministic fallback parser for common travel information when the AI service is unavailable or does not return usable structured data.

The project uses open-source libraries including React, Vite, Express, and the Google GenAI SDK. The project is released under the MIT License.

AI-assisted development was used during development to help with implementation, debugging, UI iteration, code refinement, and documentation. The final application architecture, integration, workflow, and project decisions were reviewed and adapted by the StormBreakers team.

## Challenge evidence

### Best Open-Source AI Project

- Open-source/open-weight AI component and its role:

TravelMateAI uses the open-weight Gemma 4 model as the central AI component of the application. Gemma 4 interprets the user's natural-language travel request and extracts structured journey intent including origin, destination, date, transport mode, travel reference, passengers, luggage, and preferences.

This structured AI output drives the journey-planning workflow, so the AI component is central to the application's functionality rather than being used only as a decorative chatbot.

- Code link showing the integration:

https://github.com/VegirajuMahaveerVarma/TravelMateAI/blob/main/server/index.js

- Agent Skill Open Standard compliance (if applicable):

Not applicable. TravelMateAI does not currently implement the Agent Skill Open Standard.

- Original harness implementation or meaningful changes (if applicable):

TravelMateAI implements a custom application harness around Gemma 4. The harness accepts a complete natural-language travel request, sends it to Gemma 4 with a structured JSON schema, validates the returned journey information, applies deterministic fallback parsing when required, and passes the resulting structured intent into the journey-planning workflow.

The extracted intent is then combined with passenger and luggage controls, vehicle matching, travel services, booking flow, notifications, documents, and AI travel support.

### Best Use of Gemma 4

- Gemma 4 model identifier and Gemini API integration:

Model identifier:

`gemma-4-26b-a4b-it`

TravelMateAI uses the Google GenAI SDK (`@google/genai`) to access Gemma 4. The backend uses the GenAI interactions API with a structured JSON schema so that the model returns machine-readable journey information.

- Code link showing the integration:

https://github.com/VegirajuMahaveerVarma/TravelMateAI/blob/main/server/index.js

- Input and useful output; multimodal value where applicable:

Example input:

"I'm travelling from Hyderabad to Mumbai next Friday. My flight is AI 542 and I'm travelling with my parents. We have 3 large suitcases and 2 cabin bags. We need an airport pickup, a hotel near Andheri and local transport."

Gemma 4 extracts useful structured information such as:

- Origin: Hyderabad
- Destination: Mumbai
- Travel date: next Friday
- Transport mode: flight
- Travel reference: AI 542
- Passengers: 3
- Large bags: 3
- Cabin bags: 2
- Required services: airport pickup, hotel, local transport
- Hotel preference: near Andheri

This information is then used by TravelMateAI to generate a connected journey workspace and personalize transport and other travel services.

Multimodal input is not currently used. The current implementation focuses on natural-language travel requests.

## Current status

- What works:
  - Natural-language travel journey input
  - Gemma 4 structured journey extraction
  - Support for flight, train, metro, and bus journey planning
  - Origin and destination extraction
  - Travel date and journey reference extraction
  - Passenger and luggage handling
  - Vehicle selection based on passenger and luggage requirements
  - Bike, Auto, Sedan, SUV, and XL Van options
  - Airport pickup planning
  - Hotel, food, and local transport service modules
  - Trip history and booking workflow
  - Notifications
  - Documents section
  - AI travel support
  - Emergency information and escalation guidance
  - Deterministic fallback parsing when AI extraction is unavailable
  - Responsive travel dashboard
  - Public GitHub repository
  - MIT open-source license
  - GitHub Actions build workflow

- Known limitations / incomplete features:
  - Hotel, food, and transport results currently use demo/mock data rather than live provider APIs.
  - Transport availability is demo data and is not connected to real-time vehicle providers.
  - Bookings are stored in application memory and are not yet persisted in a production database.
  - Emergency functionality provides guidance but does not directly contact emergency services.
  - The application currently focuses on travel planning rather than completing real external bookings.
  - Some date and travel-intent parsing relies on predefined patterns when the AI fallback is used.

- What you would improve next:
  - Integrate live flight, train, hotel, and transport provider APIs.
  - Add persistent user accounts and database-backed trip and booking storage.
  - Add real-time journey tracking and live travel alerts.
  - Add secure production booking and payment integrations.
  - Improve multilingual travel-prompt understanding.
  - Add richer document and itinerary processing.
  - Expand the AI travel assistant with context from the user's complete journey and real-time travel updates.

## Submission checklist

- [✓] Project repository is public and links work.
- [✓] Required challenge evidence is included.
- [✓] Project uses an open-source license where required by the challenge.
- [✓] Work and reused materials are represented honestly.
- [✓] No API keys, tokens, passwords, or private data are included.
- [✓] I followed the organizers' build window and submission instructions.
