# RepoGuide AI

## Team / attendee

- Team name (if applicable): Individual
- Members and GitHub usernames:
  - Pranay Bandanakanti — [Pranay-6669](https://github.com/Pranay-6669)
- Profile links (optional):
  - https://github.com/Pranay-6669

## Challenge

Select the challenge you are entering:

- [*] Best Open-Source AI Project
- [ ] Best Use of Gemma 4
- [ ] Build on elah

## Project links

- Public GitHub repository: https://github.com/Pranay-6669/Agentic-Research-Assistant
- Open-source license (link to the license file): https://github.com/Pranay-6669/Agentic-Research-Assistant/blob/main/LICENSE

## Problem and solution

RepoGuide AI is designed for developers who need to understand an unfamiliar
open-source codebase.

Understanding a new repository can require reading many source-code and
documentation files. RepoGuide AI provides a way to ask questions about the
actual repository instead of manually searching through the entire codebase.

The main workflow is:

Repository folder → File scanning → Text chunking → Embeddings →
ChromaDB → Semantic retrieval → Llama 3.2 → Answer + relevant source files

The user provides a local repository folder. RepoGuide scans supported source
code and documentation files, creates searchable chunks, and stores them in
ChromaDB. When the user asks a question, the system retrieves relevant
repository content and provides it as context to Llama 3.2. The generated
answer is displayed together with the relevant source filenames.

## Approach and technologies

RepoGuide AI uses a Retrieval-Augmented Generation (RAG) approach.

The repository is scanned using Python and relevant files are divided into
smaller chunks. Hugging Face Sentence Transformers are used to create
embeddings, and ChromaDB is used for vector storage and semantic retrieval.

When a question is submitted, the most relevant repository chunks are
retrieved and passed as context to Llama 3.2 (3B), which runs locally through
Ollama. The model generates a repository-specific answer based on the
retrieved context.

The backend is implemented with Python and FastAPI. The frontend uses
HTML, CSS, and JavaScript.

Technologies used:
- Python
- FastAPI
- Llama 3.2 (3B)
- Ollama
- ChromaDB
- Hugging Face Sentence Transformers
- HTML, CSS, JavaScript
- Retrieval-Augmented Generation (RAG)
- Git/GitHub

The project was adapted from an existing Agentic Research Assistant
foundation. The core RAG/local-LLM architecture was reused and adapted into
the repository-understanding use case. Existing libraries and open-source
components are credited through their respective licenses and project
documentation.

AI-assisted development was used during implementation and debugging.

## Challenge evidence

### Best Open-Source AI Project

- Open-source/open-weight AI component and its role:
  Llama 3.2 (3B) is the open-weight AI component used by RepoGuide AI. It
  generates answers based on the retrieved repository context and runs
  locally through Ollama.

- Code link showing the integration:
  https://github.com/Pranay-6669/Agentic-Research-Assistant/blob/main/app.py

- Agent Skill Open Standard compliance (if applicable):
  Not applicable. RepoGuide AI is implemented as an AI-powered application,
  not as an Agent Skill.

- Original harness implementation or meaningful changes (if applicable):
  The project uses an original repository-understanding workflow built around
  repository scanning, chunking, vector retrieval, and local LLM generation.
  The existing Agentic Research Assistant RAG foundation was adapted into
  this new developer-focused repository understanding workflow.

## Current status

- What works:
  - Local repository scanning
  - Supported source-code and documentation file ingestion
  - Text chunking
  - Embedding generation
  - ChromaDB vector storage
  - Semantic retrieval
  - Llama 3.2 local generation through Ollama
  - FastAPI backend
  - Web-based user interface
  - Repository-specific answers with relevant source filenames

- Known limitations / incomplete features:
  - The current prototype works with local repository folders.
  - Only supported text-based source and documentation files are indexed.
  - Very large repositories may require additional optimization.

- What you would improve next:
  - GitHub repository URL support
  - Incremental indexing instead of rebuilding the index
  - Better handling of large repositories
  - Repository structure visualization
  - More detailed code navigation and file-level explanations

## Submission checklist

- [x] Project repository is public and links work.
- [x] Required challenge evidence is included.
- [x] Project uses an open-source license where required by the challenge.
- [x] Work and reused materials are represented honestly.
- [x] No API keys, tokens, passwords, or private data are included.
- [x] I followed the organizers' build window and submission instructions.
