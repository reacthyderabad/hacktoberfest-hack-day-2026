# FinHealth AI — Real-Time Financial Health & Autonomous Multilingual Virtual CFO

## Team / attendee

- Team name: FinHealth AI
- Members and GitHub usernames:
  - Charan (@charan-dss-01)
- Profile links: https://github.com/charan-dss-01

## Challenge

Select the challenge you are entering:

- [ ] Best Open-Source AI Project
- [x] Best Use of Gemma 4
- [ ] Build on elah

## Project links

- Public GitHub repository: https://github.com/charan-dss-01/FinHealthAi.git
- Open-source license: MIT License (https://github.com/charan-dss-01/FinHealthAi/blob/main/README.md#license)

## Problem and solution

### Who is this for?

Over 63 million Indian Micro, Small, and Medium Enterprises (MSMEs), retail Kirana store owners, and local merchants who struggle with cash flow management, lack affordable financial advisory services, and face language barriers with traditional accounting software.

### What problem does it solve?

1. **Cash Flow Blindness**: Store owners lack visibility into their true cash runway and working capital burn.
2. **Fund Co-Mingling**: Personal UPI lifestyle expenses (Swiggy, Zomato, OTT, personal transfers) get mixed into business bank accounts, draining store reserves unnoticed.
3. **Complex Jargon & High Advisory Costs**: Hiring a Chartered Accountant or CFO is too expensive for small businesses, and existing tools use intimidating English financial terminology.

### Main Input → Output Workflow:

1. **Input**: User uploads a monthly bank PDF/CSV statement or UPI transaction export.
2. **Analysis & Grounding**: The system parses transactions, isolates co-mingled personal spends, runs statistical anomaly detection (e.g. supplier expense spikes), and computes a 0–100 composite Financial Health Score.
3. **Gemma 4 AI Inference**: The grounded financial snapshot is fed into Google Gemma 4 (`gemma-4-31b-it`).
4. **Output**: The user receives real-time cash runway projections, visual health indicators (Green/Amber/Red), what-if scenario simulations, and a conversational AI Virtual CFO providing 3-step practical business advice in 8 Indian languages (Telugu, Hindi, Tamil, English, etc.).

## Approach and technologies

- **Frontend & Fullstack**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons, Framer Motion, Recharts.
- **AI & LLM Integration**: Google Gemma 4 (`gemma-4-31b-it`, `gemma-4-26b-a4b-it`) via Google Generative Language API with strict context grounding and response sanitization.
- **Database & ORM**: Prisma ORM with SQLite (local) / PostgreSQL (production).
- **ML & Analytics**:
  - Unsupervised Anomaly Detection (Isolation Forest & 3-Sigma Z-Score).
  - Indian Merchant Transaction Classifier (Multinomial Naive Bayes / TF-IDF keyword vectorizer).
  - 5-Pillar Financial Health Scoring Algorithm (Liquidity, Profitability, Runway, Debt Service, Volatility).

## Challenge evidence

### Best Use of Gemma 4

- **Gemma 4 Models Used**:
  - Primary: `gemma-4-31b-it` (31B instruction-tuned model for deep business reasoning and Indic multilingual support).
  - Alternative / Fallback: `gemma-4-26b-a4b-it` (26B low-latency model architecture).
- **Role of Gemma 4 in the Solution**:
  Gemma 4 serves as the autonomous **Virtual CFO Copilot**. It processes real-time business telemetry (bank balance, monthly revenue, operational burn, cash runway days, and co-mingled personal spend) and answers complex business questions (e.g., _"Can I afford to hire helper staff at ₹18,000/month?"_ or _"What should I do about a ₹45,000 supplier spike alert?"_).
- **Grounded Context & Multilingual Execution**:
  - The model provides direct, empathetic 3-step actionable advice with exact Indian Rupee (₹) calculations.
  - Native support for 8 Indian languages (Telugu, Hindi, Tamil, Kannada, Malayalam, Marathi, Bengali, English) and mixed Hinglish / Telugu-English vernacular queries.
  - Custom output extraction ensures zero internal reasoning leaks and 100% clean user-facing guidance.
- **Code Link Showing Gemma 4 Integration**:
  - Model configuration, prompt grounding, and response cleaning: [`src/lib/ai/copilot.ts`](https://github.com/charan-dss-01/FinHealthAi/blob/main/src/lib/ai/copilot.ts)
  - API Route Handler: [`src/app/api/copilot/route.ts`](https://github.com/charan-dss-01/FinHealthAi/blob/main/src/app/api/copilot/route.ts)
  - Interactive Copilot UI: [`src/app/copilot/page.tsx`](https://github.com/charan-dss-01/FinHealthAi/blob/main/src/app/copilot/page.tsx)

---

## Demo and verification instructions

### 1. Clone & Run Locally

```bash
git clone https://github.com/charan-dss-01/FinHealthAi.git
cd FinHealthAi
npm install
cp .env.example .env
# Add your GEMINI_API_KEY from Google AI Studio in .env (GEMMA_MODEL="gemma-4-31b-it")
npm run db:push
npm run db:seed
npm run dev
```
