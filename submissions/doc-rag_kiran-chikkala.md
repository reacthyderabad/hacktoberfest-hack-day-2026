# DocRAG

## Team / attendee

- Team name: Individual
- Members and GitHub usernames: Kiran Chikkala — [@kiranchikkala-dev](https://github.com/kiranchikkala-dev)
- Profile links: https://github.com/kiranchikkala-dev

## Challenge

- [ ] Best Open-Source AI Project
- [x] Best Use of Gemma 4
- [ ] Build on elah

## Project links

- Public GitHub repository: https://github.com/kiranchikkala-dev/document-rag
- Demo URL: ADD_YOUR_DEPLOYED_URL_HERE
- Open-source license: ADD_LICENSE_LINK_HERE

## Problem and solution

DocRAG helps users understand long PDF documents by allowing them to upload a PDF and ask questions in natural language.

The application extracts and chunks the document text, creates embeddings, stores them in Qdrant, retrieves the most relevant passages for each question, and uses Gemma to generate a grounded answer with source and page references.

## Approach and technologies

DocRAG is built with Next.js, TypeScript, React, LangChain, Google GenAI, Gemma 4, and Qdrant.

The indexing pipeline extracts PDF text page by page, splits it into overlapping chunks, creates embeddings using `gemini-embedding-001`, and stores the chunks and metadata in Qdrant.

During question answering, the question is embedded, the five most relevant chunks are retrieved, and only that context is sent to Gemma. This reduces unsupported answers and makes the response easier to verify.

AI-assisted development was used during implementation, with the final code, architecture, testing, and documentation reviewed and validated by the project owner.

## Challenge evidence

### Best Use of Gemma 4

- Gemma 4 model identifier: `gemma-4-26b-a4b-it`
- Gemini API integration: Google GenAI through LangChain's `ChatGoogleGenerativeAI`
- Code link: https://github.com/kiranchikkala-dev/document-rag/blob/main/src/lib/retrieval.ts
- Input and useful output: The model receives a user's question and the most relevant PDF passages, then produces a concise grounded answer with source/page metadata.

## Current status

- What works:
  - PDF upload and validation
  - PDF text extraction
  - Text chunking with overlap
  - Google embeddings
  - Qdrant vector storage and similarity search
  - Gemma-based grounded answers
  - Source and page references
  - Local Docker and cloud Qdrant support
  - Unit tests and production build

- Known limitations:
  - PDF files only
  - Scanned PDFs requiring OCR are not supported
  - Upload limit is 10 MB
  - No user accounts or multi-user document isolation
  - Background indexing is not implemented

- What I would improve next:
  - Add OCR support
  - Add document deletion and management
  - Add streaming responses
  - Add retrieval and answer-quality evaluation
  - Add authentication and per-user collections

## Submission checklist

- [x] Project repository is public and links work.
- [x] Required challenge evidence is included.
- [ ] Project uses an open-source license where required by the challenge.
- [x] Work and reused materials are represented honestly.
- [x] No API keys, tokens, passwords, or private data are included.
- [x] I followed the organizers' build window and submission instructions.
