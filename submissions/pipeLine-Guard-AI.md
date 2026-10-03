# PipeGuard AI

## Team / attendee

- Team name : ActReactGuard
- Members and GitHub usernames:
  - Thota Madhulika — `@butterfly-artist`
- Profile links:
  - GitHub: https://github.com/butterfly-artist

## Challenge

Select the challenge you are entering:

- [x] Best Open-Source AI Project
- [ ] Best Use of Gemma 4
- [ ] Build on elah

## Project links

- Public GitHub repository:
  - https://github.com/butterfly-artist/PipeLine-Guard-AI
- Open-source license (link to the license file):
  - MIT License — https://github.com/butterfly-artist/PipeLine-Guard-AI/blob/main/LICENSE

## Problem and solution

### Who is this for?

PipeGuard AI is designed for Data Engineers, Analytics Engineers, ML Engineers, Data Platform Engineers, and developers who work with data pipelines.

### What problem does it solve?

Modern data pipelines can fail because of schema mismatches, missing values, duplicate records, invalid data types, broken references, inconsistent formats, invalid business values, and transformation failures.

Traditional data-quality systems can identify that a rule failed, but engineers often still need to determine:

- Why did the pipeline fail?
- What data caused the failure?
- Which columns or entities are affected?
- What downstream data may be impacted?
- What should the engineer do next?
- What quality rule could prevent the same failure?

PipeGuard AI combines deterministic data-quality computation with open-weight AI reasoning to answer these questions from actual data evidence.

### Main input → output workflow

```text
Dataset
(CSV / JSON / Parquet)
        |
        v
Data Ingestion
        |
        v
Deterministic Data Profiler
        |
        v
Schema + Relationship Detection
        |
        v
Data Quality Rule Engine
        |
        +----------------------+
        |                      |
        v                      v
DQ Findings             Pipeline Logs
        |                      |
        +----------+-----------+
                   |
                   v
            Context Engine
            Evidence Pack
                   |
                   v
          Gemma Open-Weight AI
              Reasoning
                   |
                   v
       Evidence-Grounded Diagnosis
                   |
        +----------+----------+----------+
        |                     |          |
        v                     v          v
    Root Cause             Impact   Remediation
                                      |
                                      v
                               Quality Rules

```



### Why this version is better

It communicates your **main differentiator in one diagram**:

> **Python establishes what happened; Gemma reasons about why it happened and what to do next.**

That is much more compelling for the **Best Open-Source AI Project** challenge than presenting PipeGuard as simply an AI-powered data profiler.

Your underlying specification explicitly describes this separation as **“DETERMINISTIC COMPUTATION + OPEN-WEIGHT AI REASONING = DATA QUALITY INTELLIGENCE.”** :contentReference[oaicite:3]{index=3}

So yes: **your submission is on the right track.** Keep the text you already wrote, but use the revised workflow above.
