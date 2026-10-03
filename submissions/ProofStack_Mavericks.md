# ProofStack

> **Show the evidence. Keep the judgment human.**

ProofStack is a human-in-the-loop multimodal evidence evaluator powered by Gemma 4. It helps reviewers compare project requirements against submitted evidence, generate evidence-grounded findings and suggested marks, and make the final decision themselves.

---

## Team / attendee

- **Team name:** Mavericks

### Members

- **Preethika Manepally** — [MPreethika16](https://github.com/MPreethika16/)
- **Sahastra Miryala** — [sahastramiryala](https://github.com/sahastramiryala)
- **Hashini Miryala** — [hashinimiryala](https://github.com/hashinimiryala)

---

## Challenge

- [ ] Best Open-Source AI Project
- [x] **Best Use of Gemma 4**
- [ ] Build on elah

---

## Project links

- **Public GitHub repository:**  
  https://github.com/MPreethika16/Proof-stack

- **Gemma 4 integration:**  
  https://github.com/MPreethika16/Proof-stack/blob/main/lib/gemma.ts

- **Gemma 4 integration commit:**  
  https://github.com/MPreethika16/Proof-stack/commit/2484791ecbe31df72ee1c219420f9020e6131add

- **Open-source license:**  
  Add the LICENSE link here if present in the repository.

---

## Problem and solution

### Who is this for?

ProofStack is designed for people who need to review software projects or feature implementations, such as:

- Hackathon judges
- Mentors
- Technical reviewers
- QA teams
- Internship/project evaluators

### The problem

A developer can say:

> "Authentication works, the core workflow works, and error handling is complete."

But the reviewer still needs to manually inspect screenshots, demo evidence, and explanations to determine whether those claims were actually demonstrated.

This creates several problems:

- Requirements can be claimed without sufficient evidence.
- Reviewers spend time manually checking every submission.
- Missing evidence can be mistaken for failed functionality.
- Scoring can become inconsistent.
- It can be difficult to trace a score back to the evidence that justified it.

### Our solution

**ProofStack asks a different question:**

> **What can the submitted evidence actually prove?**

The reviewer first defines their own evaluation criteria and maximum marks.

For example:

- User authentication works — 20 marks
- Core workflow completes end-to-end — 40 marks
- Failure states are handled gracefully — 20 marks
- Final result is clearly communicated — 20 marks

The participant then supplies evidence such as screenshots/visual evidence together with an optional explanation or claim.

Gemma 4 analyzes the reviewer-defined rubric against the supplied evidence and evaluates every criterion independently.

Each criterion receives one of five states:

- `PASS`
- `PARTIAL`
- `FAIL`
- `UNCERTAIN`
- `NOT_DEMONSTRATED`

ProofStack also provides:

- Suggested marks
- Confidence
- Evidence used
- Evidence-grounded reasoning
- Missing proof / additional evidence required

The final decision always remains with the human reviewer.

### Main workflow

`Reviewer Rubric → Multimodal Evidence → Gemma 4 → Evidence Matrix → Human Review`

---

## Approach and technologies

### Tech stack

- **Next.js**
- **React**
- **TypeScript**
- **Tailwind CSS**
- **Gemma 4**
- **Gemini API**
- **Google Gen AI SDK (`@google/genai`)**
- **Zod**

### Architecture

ProofStack separates AI observation from human judgment.

The reviewer defines:

`Requirement + Maximum Marks`

The participant supplies:

`Visual Evidence + Optional Claim`

Gemma 4 performs multimodal evidence reasoning:

`Rubric + Evidence → Criterion Evaluation`

The result is transformed into a structured Evidence Matrix containing:

`Status + Suggested Marks + Confidence + Evidence + Reasoning + Missing Proof`

Structured output is validated before being shown to the reviewer.

The human reviewer can then:

`Accept → Override → Request Evidence`

No AI-generated score automatically becomes the final judgment.

---

## Key evaluation principle

ProofStack follows an important rule:

> **Absence of evidence is not evidence of failure.**

For example, suppose the criterion is:

> "The application handles invalid login attempts."

If the submitted evidence only shows a successful login, ProofStack should **not** conclude that error handling failed.

Instead, it returns:

`NOT_DEMONSTRATED`

and can request evidence such as:

> "Show an invalid login attempt and the resulting error state."

Similarly:

- `FAIL` is used when supplied evidence contradicts the criterion.
- `PARTIAL` is used when only part of the requirement is demonstrated.
- `UNCERTAIN` is used when relevant evidence exists but is insufficient or ambiguous.
- `NOT_DEMONSTRATED` is used when the required behavior is simply not shown.

This reduces unsupported AI conclusions and makes uncertainty explicit.

---

## Human-in-the-loop design

Gemma 4 does **not** act as the final judge.

For each criterion, ProofStack presents the AI-generated recommendation to the human reviewer.

The reviewer can:

### Accept

Accept Gemma's suggested status and marks.

### Override

Change:

- Evaluation status
- Awarded marks

### Request Evidence

Use the identified missing proof to request additional evidence from the participant.

The interface keeps the AI suggestion and human decision conceptually separate.

This ensures that Gemma assists evaluation rather than replacing the reviewer.

---

## Challenge evidence

### Best Use of Gemma 4

#### Gemma 4 model identifier and Gemini API integration

ProofStack uses:

`gemma-4-26b-a4b-it`

The model is accessed through Google's Gemini API using:

`@google/genai`

The integration is implemented server-side so the Gemini API key is not exposed to the browser.

**Integration code:**

https://github.com/MPreethika16/Proof-stack/blob/main/lib/gemma.ts

**Commit switching the evaluation engine to Gemma 4:**

https://github.com/MPreethika16/Proof-stack/commit/2484791ecbe31df72ee1c219420f9020e6131add

---

### Input

ProofStack combines multiple forms of information:

**Textual context**

- Reviewer-defined criteria
- Maximum marks
- Optional participant claim

**Visual evidence**

- Screenshots/images supplied as evidence

The architecture is designed so additional multimodal evidence types can be incorporated as the project evolves.

---

### Useful output

For every criterion, Gemma 4 returns a structured evaluation containing:

- Criterion
- Evaluation status
- Suggested marks
- Maximum marks
- Confidence
- Evidence observations
- Reasoning
- Missing evidence when applicable

Example structure:

```json
{
  "criterion": "User authentication works",
  "status": "NOT_DEMONSTRATED",
  "suggestedMarks": 0,
  "maxMarks": 20,
  "confidence": 100,
  "evidence": [],
  "reasoning": "The supplied visual evidence does not demonstrate an authentication workflow.",
  "missingEvidence": "Provide visual evidence showing the login flow and authenticated state."
}
