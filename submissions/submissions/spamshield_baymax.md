# SpamShield

## Team / attendee

- Team name (if applicable): BayMax
- Members and GitHub usernames:
  - Rama Chandra — @RamaChandra53
  - Junaid ahmed khan — @junaid1156
  - Daivik Pramod — @daivikmaddula-cyber
- Profile links (optional):

## Challenge

- [x] Best Open-Source AI Project
- [ ] Best Use of Gemma 4
- [ ] Build on elah

## Project links

- Public GitHub repository: https://github.com/RamaChandra53/BayMax3
- Open-source license: https://github.com/RamaChandra53/BayMax3/blob/main/LICENSE

## Problem and solution

Open-source maintainers often receive low-value, spam, or unnecessary pull requests, especially during high-contribution events such as Hacktoberfest.

Even when a pull request looks suspicious, maintainers still have to manually inspect the description and code changes before deciding whether it is useful. This takes time away from reviewing genuine contributions.

SpamShield is a local AI-assisted pull request triage tool that helps maintainers identify potentially low-value contributions.

The workflow is:

GitHub PR URL → PR metadata and diff → rule-based signals → open-weight AI model → structured verdict

A maintainer pastes a GitHub pull request URL into SpamShield. The application retrieves the PR metadata and changed files, detects suspicious patterns using deterministic rules, and then sends the PR context and actual diff to a locally running open-weight model.

SpamShield returns:

- A PR quality verdict
- Confidence score
- Explanation
- Detected rule signals
- A separate AI-slop quality assessment

The final decision always remains with the maintainer.

## Approach and technologies

SpamShield is built using Python and provides both a Streamlit user interface and a CLI.

Technologies used:

- Python
- Streamlit
- GitHub API
- Ollama
- Gemma 3 4B (`gemma3:4b`)
- python-dotenv

The first layer uses deterministic rules to identify signals such as very small diffs, documentation-only changes, vague descriptions, whitespace-heavy changes, and contributor-style README additions.

These rules do not decide whether a PR is spam. They are provided as additional context to the AI model.

The PR title, description, changed files, code patches, and detected signals are then passed to `gemma3:4b` running locally through Ollama.

The model evaluates whether the change provides meaningful value, whether the PR description matches the actual diff, and whether there are signs of low-quality or irrelevant AI-generated content.

The model returns structured JSON, which SpamShield validates before displaying the result.

Local inference through Ollama was chosen so the workflow can run without relying on a paid hosted AI API and so the model interaction remains inspectable.

AI coding assistants were used during development to accelerate implementation and debugging.

## Challenge evidence

### Best Open-Source AI Project

- Open-source/open-weight AI component and its role:
  SpamShield uses the open-weight `gemma3:4b` model locally through Ollama. The model analyzes the pull request description, actual code diff, and rule signals to determine whether a contribution appears genuine, requires human review, or is likely low-value.

- Code link showing the integration:
  https://github.com/RamaChandra53/BayMax3/blob/main/model.py

- Agent Skill Open Standard compliance (if applicable):
  Not applicable. SpamShield is an application powered by an open-weight model rather than an Agent Skill.

- Original harness implementation or meaningful changes (if applicable):
  Not applicable. SpamShield implements its own focused PR-analysis pipeline around Ollama.

The AI component is central to the product because deterministic rules alone cannot reliably tell the difference between a useful one-line bug fix and an unnecessary one-line contribution. The model provides the contextual reasoning required for that distinction.

## Current status

- What works:
  - Accepts a public GitHub pull request URL
  - Retrieves PR metadata and changed-file patches
  - Detects deterministic suspicious signals
  - Analyzes PR context with a local open-weight AI model
  - Returns a structured quality verdict
  - Provides a confidence score and explanation
  - Provides a separate AI-slop assessment
  - Supports Streamlit UI and CLI
  - Validates model output and retries malformed responses
  - Falls back to human review when AI analysis fails

- Known limitations / incomplete features:
  - Small local models can occasionally classify PRs incorrectly
  - Confidence values are model-generated estimates rather than calibrated probabilities
  - AI-slop analysis cannot prove whether AI generated a contribution
  - Very large PRs are truncated before model analysis
  - Local CPU inference can take several seconds
  - The current MVP does not automatically comment on, label, close, or merge PRs

- What you would improve next:
  - Build SpamShield as a GitHub App
  - Automatically analyze newly opened PRs
  - Add repository-specific maintainer policies
  - Detect repeated or duplicate PR patterns
  - Add maintainer feedback to improve future decisions
  - Add optional GitHub labels such as `needs-review`
  - Build a dashboard for triaging PRs across multiple repositories

## Submission checklist

- [x] Project repository is public and links work.
- [x] Required challenge evidence is included.
- [x] Project uses an open-source license where required by the challenge.
- [x] Work and reused materials are represented honestly.
- [x] No API keys, tokens, passwords, or private data are included.
- [x] I followed the organizers' build window and submission instructions.
