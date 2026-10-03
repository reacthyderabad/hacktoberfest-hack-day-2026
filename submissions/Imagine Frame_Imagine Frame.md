Here is your completed submission form ready to copy and paste. Update the repository link placeholder once your repo is live on your profile.

---

# Wire2React

## Team / attendee

* Team name (if applicable): Imagine-Frame
* Members and GitHub usernames: Avyay (@Avyay-n) Yuvan (@Yuvanvenna)
* Profile links (optional): [https://github.com/Avyay-n](https://github.com/Avyay-n)

## Challenge

Select the challenge you are entering:

* [ ] Best Open-Source AI Project
* [x] Best Use of Gemma 4
* [ ] Build on elah

If listing multiple categories, confirm eligibility with the organizers and complete evidence for each.

## Project links

* Public GitHub repository: [https://github.com/Avyay-n/wire2react](https://www.google.com/search?q=https://github.com/Avyay-n/wire2react)
* Open-source license (link to the license file): [https://github.com/Avyay-n/wire2react/blob/main/LICENSE](https://www.google.com/search?q=https://github.com/Avyay-n/wire2react/blob/main/LICENSE)

## Problem and solution

**Target Audience:** Frontend developers, UI/UX engineers, and hackathon participants building fast zero-to-one prototypes.

**Problem:** Frontend developers spend 30+ minutes manually slicing and translating rough napkin doodles or whiteboard sketches into JSX layouts, CSS flex/grid structures, and Tailwind utility classes. Existing design-to-code tools fail on hand-drawn scribbles because they either require clean Figma mockups or try to literally replicate crooked pen strokes with broken CSS margins.

**Solution & Workflow:**

1. **Input:** The user uploads or drags in a rough, hand-drawn wireframe sketch (or clicks the fail-safe demo generator).
2. **Reasoning:** Gemma 4 acts as an opinionated design system engineer via the Gemini API, using multimodal visual reasoning to infer layout intent, component boundaries, interactive controls, and semantic hierarchy.
3. **Output:** A clean, self-contained, responsive Tailwind CSS + React component rendered inside an interactive, sandboxed live preview iframe alongside raw copy-pasteable source code.

## Approach and technologies

* **Frontend:** React (Vite, TypeScript, Tailwind CSS, Lucide Icons) providing a responsive split-screen UI (input controls on the left; live sandboxed preview and code inspection tabs on the right).
* **Backend:** FastAPI (Python 3.10+) serving a clean REST API endpoint (`POST /api/convert`) with CORS support.
* **Multimodal AI:** Google Gemma 4 (`gemma-4-26b-a4b-it`) accessed through the official `google-genai` SDK using Gemini API keys.
* **Rendering Engine:** Sandboxed `iframe` utilizing Tailwind CSS CDN (`[https://cdn.tailwindcss.com](https://cdn.tailwindcss.com)`) for instant client-side execution with zero compile lag.
* **Attributions & AI Disclosure:** Developed with AI assistance (Antigravity IDE / Gemini) using the official Google GenAI Python SDK and standard open-source React ecosystem libraries.

## Challenge evidence

### Best Use of Gemma 4

* **Gemma 4 model identifier and Gemini API integration:** Uses `gemma-4-26b-a4b-it` via the official Google GenAI SDK (`from google import genai`) configured through standard `GEMINI_API_KEY` environment variables.
* **Code link showing the integration:** [https://github.com/Avyay-n/wire2react/blob/main/backend/main.py](https://www.google.com/search?q=https://github.com/Avyay-n/wire2react/blob/main/backend/main.py)
* **Input and useful output; multimodal value where applicable:**
* *Multimodal Input:* A camera photo or canvas drawing of a hand-drawn napkin UI sketch (e.g., login cards, navigation headers, metric dashboards).
* *Useful Output:* Pure, production-aligned Tailwind HTML/React code with working interaction states (buttons, focus rings, hover states) rendered immediately in a live sandbox.
* *Multimodal Value:* Gemma 4 bridges the semantic "intent gap" between low-fidelity physical pen doodles and structured frontend code without requiring pixel-perfect digital vector assets or multi-paragraph text prompts.



## Current status

* **What works:**
* Full end-to-end multimodal pipeline: Image upload -> Gemma 4 reasoning -> live sandboxed interactive preview.
* Style preset selector (Modern Clean, Dark Cyberpunk, Minimalist Slate).
* Fail-safe fallback generator ("Load Backup Sample") ensuring reliable demos under spotty venue connectivity.
* One-click copy-to-clipboard for exported source code.


* **Known limitations / incomplete features:**
* Multi-page routing is not yet generated in a single pass (currently optimized for single components, modals, and landing sections).
* Complex custom icon libraries default to Unicode or standard Tailwind/SVG representations.


* **What you would improve next:**
* Support multi-screen navigation flows via wireframe arrows and linking.
* Add direct export to standard component libraries (e.g., Shadcn UI and Next.js page templates).
* Integrate a live webcam snapshot capture directly in the browser UI.



## Submission checklist

* [x] Project repository is public and links work.
* [x] Required challenge evidence is included.
* [x] Project uses an open-source license where required by the challenge.
* [x] Work and reused materials are represented honestly.
* [x] No API keys, tokens, passwords, or private data are included.
* [x] I followed the organizers' build window and submission instructions.
