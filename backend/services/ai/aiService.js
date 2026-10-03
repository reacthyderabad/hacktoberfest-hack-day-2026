import axios from 'axios';
import { findDemoSample } from '../../demo/sampleData.js';
import { getGeminiApiKey, getAiModel, getAiProvider } from '../../config/env.js';

/**
 * ContribReady AI Service Layer
 * Supports open-weight models via Google AI / Gemini API (Gemma 2 / Gemma 4 / Gemini),
 * Groq, OpenRouter, and Ollama, with automated AST heuristic synthesis fallback.
 */

export class AIService {
  constructor() {
    this.refreshConfig();
    this.ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
  }

  refreshConfig() {
    this.apiKey = getGeminiApiKey() || (process.env.GEMINI_API_KEY || process.env.AI_API_KEY || '').trim();
    this.provider = (getAiProvider() || process.env.AI_PROVIDER || (this.apiKey ? 'gemini' : 'gemini')).toLowerCase();
    const defaultModel = this.provider === 'gemini' ? 'gemma-4-31b-it' : 'llama-3.3-70b-versatile';
    this.model = getAiModel() || process.env.AI_MODEL || defaultModel;
  }

  getInfo() {
    this.refreshConfig();
    return {
      provider: this.provider,
      model: this.model,
      hasKey: Boolean(this.apiKey && this.apiKey.length > 5),
      mode: (this.apiKey && this.apiKey.length > 5) ? 'live-open-weight-ai' : 'demo-hybrid-mode'
    };
  }

  /**
   * Main analysis pipeline
   * Accepts issue context, repository metadata, extracted context files, and tree summary
   */
  async analyzeIssue(context) {
    this.refreshConfig();
    const { issue, repository, contextFiles = [], treeSummary = [], isPartialContext = false } = context;

    // If live API key is available, call the open-weight model (Gemma 4)
    if (this.apiKey && this.apiKey.length > 5) {
      try {
        console.log(`[AI Service] Calling open-weight model: ${this.model} via ${this.provider}...`);
        const structuredOutput = await this.callOpenWeightModel(context);
        return {
          ...structuredOutput,
          _meta: {
            model: this.model,
            provider: this.provider,
            isPartialContext
          }
        };
      } catch (err) {
        console.error(`[AI Service] Live model call failed: ${err.message}. Falling back to repository context synthesis engine.`);
      }
    }

    // Fallback: Synthesize structured analysis using real repository context & issue AST
    console.log('[AI Service] Synthesizing repository analysis from extracted context and AST/tree...');
    return this.synthesizeAnalysisFromContext(context);
  }

  /**
   * Call the configured open-weight model with the system instruction and structured prompt
   */
  async callOpenWeightModel(context) {
    const systemPrompt = `You are an expert open-source software mentor for the ContribReady platform.
Analyze the provided GitHub issue and the provided repository context.
Your goal is to prepare a developer to understand what they need to know before attempting the issue.

CRITICAL MENTORSHIP RULES:
1. Only make claims supported by the supplied issue and repository context.
2. Do not invent repository facts. Do not invent files. Do not invent functions or classes.
3. Do not claim to have inspected files that were not supplied in the context.
4. If repository context is incomplete or partial, explicitly note this limitation in the problem explanation.
5. In "relevant_files", specify exact reasons and any relevant functions/classes/modules found in the file content.
6. The quiz questions MUST be repository and issue specific (not generic programming trivialities).

You MUST respond with valid JSON ONLY.
Schema:
{
  "issue_summary": "1-2 sentence concise summary of the issue",
  "problem_explanation": "Clear explanation of the problem, why it occurs, and why the change is needed",
  "expected_change": "Conceptual explanation of what needs to be changed in the codebase",
  "relevant_files": [
    {
      "path": "path/to/file",
      "reason": "Specific reason why this file is relevant to the issue",
      "target_symbols": ["functionName", "ClassName"],
      "importance": "high" // or "medium" or "low"
    }
  ],
  "required_concepts": [
    {
      "name": "Concept name",
      "description": "Clear explanation of the concept and why it matters for this issue",
      "importance": "high" // or "medium" or "low"
    }
  ],
  "knowledge_gaps": [
    {
      "concept": "Concept or skill name",
      "reason": "Why a contributor should understand this before writing code"
    }
  ],
  "preparation_steps": [
    {
      "title": "Actionable step title",
      "description": "Concrete guidance on what to read, inspect, or try",
      "related_files": ["path/to/file"]
    }
  ],
  "practice_task": {
    "title": "Small practical exercise to validate understanding",
    "description": "A small isolated task or test to try before attempting the real issue",
    "related_files": ["path/to/file"]
  },
  "quiz": [
    {
      "question": "Repository and issue-specific question",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A",
      "explanation": "Why this answer is correct based on the repository context"
    }
  ]
}`;

    const userPrompt = this.buildUserPrompt(context);

    let rawResponse = '';

    if (this.provider === 'gemini') {
      rawResponse = await this.callGeminiModel(systemPrompt, userPrompt);
    } else if (this.provider === 'groq') {
      const res = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: this.model || 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 45000
        }
      );
      rawResponse = res.data.choices[0].message.content;
    } else if (this.provider === 'openrouter') {
      const res = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: this.model || 'google/gemma-2-9b-it:free',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.2
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://contribready.dev',
            'X-Title': 'ContribReady'
          },
          timeout: 45000
        }
      );
      rawResponse = res.data.choices[0].message.content;
    } else if (this.provider === 'ollama') {
      const res = await axios.post(
        `${this.ollamaHost}/api/chat`,
        {
          model: this.model || 'gemma2',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          format: 'json',
          stream: false
        },
        { timeout: 60000 }
      );
      rawResponse = res.data.message.content;
    } else {
      throw new Error(`Unsupported AI provider: ${this.provider}`);
    }

    return this.parseAndValidateAIOutput(rawResponse, context);
  }

  /**
   * Resilient Google Generative Language API caller (Gemma 2 / Gemma 4 / Gemini)
   */
  async callGeminiModel(systemPrompt, userPrompt) {
    const cleanModel = this.model.replace(/^models\//, '');
    const combinedPrompt = `${systemPrompt}\n\n====================\nGITHUB ISSUE & REPOSITORY CONTEXT:\n====================\n${userPrompt}\n\nRespond with valid JSON matching the exact schema above.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${this.apiKey}`;

    const headers = {
      'Content-Type': 'application/json',
      'x-goog-api-key': this.apiKey
    };

    // Attempt 1: Try with responseMimeType: 'application/json'
    try {
      const res = await axios.post(
        url,
        {
          contents: [{ role: 'user', parts: [{ text: combinedPrompt }] }],
          generationConfig: {
            temperature: 0.15,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json'
          }
        },
        { headers, timeout: 60000 }
      );
      const text = res.data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch (err1) {
      console.warn(`[AI Service] Gemini call with JSON mimeType failed (${err1.response?.status || err1.message}), retrying with standard prompt...`);
      
      // Attempt 2: If model doesn't support responseMimeType (like Gemma open-weight), retry without responseMimeType
      try {
        const res2 = await axios.post(
          url,
          {
            contents: [{ role: 'user', parts: [{ text: combinedPrompt }] }],
            generationConfig: {
              temperature: 0.15,
              maxOutputTokens: 4096
            }
          },
          { headers, timeout: 60000 }
        );
        const text2 = res2.data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text2) return text2;
      } catch (err2) {
        // If 404 Model Not Found, try alternate verified Gemma/Gemini models
        if (err2.response?.status === 404) {
          const fallbackCandidates = ['gemma-4-31b-it', 'gemma-2-27b-it', 'gemma-2-9b-it', 'gemini-1.5-flash', 'gemini-2.0-flash'].filter(m => m !== cleanModel);
          for (const fallbackModel of fallbackCandidates) {
            try {
              console.log(`[AI Service] Attempting fallback model ${fallbackModel}...`);
              const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/${fallbackModel}:generateContent?key=${this.apiKey}`;
              const resFallback = await axios.post(
                fallbackUrl,
                {
                  contents: [{ role: 'user', parts: [{ text: combinedPrompt }] }],
                  generationConfig: { temperature: 0.15, maxOutputTokens: 4096 }
                },
                { headers, timeout: 60000 }
              );
              const textFallback = resFallback.data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (textFallback) {
                this.model = fallbackModel;
                return textFallback;
              }
            } catch (fbErr) {
              // Continue to next fallback
            }
          }
        }
        throw new Error(`Google AI API call failed: ${err2.response?.data?.error?.message || err2.message}`);
      }
    }

    throw new Error('No candidate response received from Google AI API.');
  }

  buildUserPrompt(context) {
    const { issue, repository, contextFiles = [], treeSummary = [], isPartialContext = false } = context;

    let filesContext = '';
    for (const f of contextFiles) {
      filesContext += `\n--- FILE: ${f.path} (${f.totalLines || 'N/A'} lines) ---\n${f.content}\n`;
    }

    return `GITHUB ISSUE DETAILS:
Title: ${issue.title}
Issue Number: #${issue.number}
Labels: ${(issue.labels || []).join(', ') || 'None'}
Author: ${issue.author}
Repository: ${repository.fullName} (Primary Language: ${repository.language})
Description: ${repository.description}

ISSUE DESCRIPTION:
${issue.body || 'No description provided in issue.'}

COMMENTS SNIPPET:
${(issue.commentsSnippet || []).map(c => `[${c.author}]: ${c.body}`).join('\n\n') || 'None'}

README SNIPPET:
${repository.readmeSnippet || 'None'}

CONTRIBUTING GUIDELINES SNIPPET:
${repository.contributingSnippet || 'None'}

PARTIAL REPOSITORY TREE (Top Relevant Paths):
${treeSummary.slice(0, 40).join('\n')}

EXTRACTED RELEVANT SOURCE FILES (${contextFiles.length} files provided):
${filesContext || 'No raw file contents available.'}

${isPartialContext ? 'NOTE: The repository context provided above is partial due to size limits. Base your analysis strictly on what is provided and state this clearly.' : ''}`;
  }

  /**
   * Robust JSON parsing, repair, and schema validation
   */
  parseAndValidateAIOutput(raw, context) {
    if (!raw || typeof raw !== 'string') {
      throw new Error('AI returned an empty response.');
    }

    let parsed = null;
    let cleanText = raw.trim();

    // Strip markdown code fences if present
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    }

    // Attempt direct parse
    try {
      parsed = JSON.parse(cleanText);
    } catch (e1) {
      // Find outermost { ... }
      const firstBrace = cleanText.indexOf('{');
      const lastBrace = cleanText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonSubstring = cleanText.slice(firstBrace, lastBrace + 1);
        try {
          parsed = JSON.parse(jsonSubstring);
        } catch (e2) {
          // Attempt trailing comma and comment removal
          try {
            const fixedJson = jsonSubstring
              .replace(/,\s*([}\]])/g, '$1')
              .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
            parsed = JSON.parse(fixedJson);
          } catch (e3) {
            console.warn('[AI Service] JSON recovery failed:', e3.message);
          }
        }
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      console.warn('[AI Service] Failed to parse model output as JSON. Using synthesized context output.');
      return this.synthesizeAnalysisFromContext(context);
    }

    // Ensure required keys exist with safe schema validation
    return {
      issue_summary: parsed.issue_summary || `Issue #${context.issue.number}: ${context.issue.title}`,
      problem_explanation: parsed.problem_explanation || 'Identified problem from GitHub issue and repository context.',
      expected_change: parsed.expected_change || 'Proposed architectural changes in target files.',
      relevant_files: Array.isArray(parsed.relevant_files) && parsed.relevant_files.length > 0
        ? parsed.relevant_files.map(f => ({
            path: f.path || 'src/index.js',
            reason: f.reason || 'Identified relevant file for this issue.',
            target_symbols: Array.isArray(f.target_symbols) ? f.target_symbols : [],
            importance: ['high', 'medium', 'low'].includes(f.importance) ? f.importance : 'medium'
          }))
        : (context.contextFiles || []).map((f, i) => ({
            path: f.path,
            reason: f.matchReasons?.[0] || 'Target file matching issue keywords',
            target_symbols: [],
            importance: i === 0 ? 'high' : 'medium'
          })),
      required_concepts: Array.isArray(parsed.required_concepts) && parsed.required_concepts.length > 0
        ? parsed.required_concepts
        : [
            {
              name: `${context.repository.language || 'Codebase'} Architecture`,
              description: `Core structural conventions used in ${context.repository.name}.`,
              importance: 'high'
            }
          ],
      knowledge_gaps: Array.isArray(parsed.knowledge_gaps) ? parsed.knowledge_gaps : [],
      preparation_steps: Array.isArray(parsed.preparation_steps) && parsed.preparation_steps.length > 0
        ? parsed.preparation_steps
        : [
            {
              title: 'Review Relevant Files',
              description: 'Inspect the primary target files identified in the dashboard.',
              related_files: (context.contextFiles || []).slice(0, 2).map(f => f.path)
            }
          ],
      practice_task: parsed.practice_task || {
        title: 'Review existing test suite',
        description: 'Run the existing tests locally and isolate the reported scenario.',
        related_files: []
      },
      quiz: Array.isArray(parsed.quiz) && parsed.quiz.length >= 2
        ? parsed.quiz
        : this.generateFallbackQuiz(context)
    };
  }

  generateFallbackQuiz(context) {
    const { issue, repository, contextFiles = [] } = context;
    const targetFile = contextFiles[0]?.path || 'src/index.js';

    return [
      {
        question: `Which file in ${repository.name} was identified by the context engine as primary target for issue #${issue.number}?`,
        options: [
          targetFile,
          'package-lock.json',
          '.gitignore',
          'license.txt'
        ],
        correct_answer: targetFile,
        explanation: `${targetFile} directly matches the issue keywords and logic flow.`
      },
      {
        question: `Before submitting a pull request to ${repository.fullName}, what is the maintainer recommendation?`,
        options: [
          'Directly push changes to the default branch',
          'Reproduce the issue locally and write/verify tests in the test suite',
          'Delete existing test files',
          'Open a duplicate issue on GitHub'
        ],
        correct_answer: 'Reproduce the issue locally and write/verify tests in the test suite',
        explanation: 'Open-source maintainers expect contributors to verify fixes with automated tests and follow existing conventions.'
      },
      {
        question: `Why is repository context for large projects trimmed before being sent to the AI?`,
        options: [
          'To optimize context size, focus on high-signal files, and prevent token overflow',
          'Because GitHub blocks all files',
          'Because the repository has no files',
          'Because the code cannot be read'
        ],
        correct_answer: 'To optimize context size, focus on high-signal files, and prevent token overflow',
        explanation: 'Intelligent context trimming extracts high-signal files matching the issue without overloading context windows with unnecessary assets.'
      }
    ];
  }

  /**
   * Synthesize real repository analysis when live AI key is not supplied
   */
  synthesizeAnalysisFromContext(context) {
    const { issue, repository, contextFiles = [], treeSummary = [], isPartialContext = false } = context;

    const relevantFiles = contextFiles.map((f, i) => ({
      path: f.path,
      reason: f.matchReasons && f.matchReasons.length > 0
        ? f.matchReasons.join('. ')
        : `Contains core logic for ${repository.language || 'the application'} execution.`,
      target_symbols: [],
      importance: i === 0 ? 'high' : (i < 3 ? 'medium' : 'low')
    }));

    if (relevantFiles.length === 0 && treeSummary.length > 0) {
      relevantFiles.push({
        path: treeSummary[0],
        reason: 'Primary source entry point identified in directory tree.',
        target_symbols: [],
        importance: 'high'
      });
    }

    const lang = repository.language || 'programming';

    const requiredConcepts = [
      {
        name: `${lang} Control Flow & Error Propagation`,
        description: `How ${lang} manages control flow, catches exceptions, and maintains state consistency when operations fail.`,
        importance: 'high'
      },
      {
        name: 'Repository Module Architecture & Dispatch',
        description: `How modules in ${repository.name} connect, export public APIs, and delegate processing internally.`,
        importance: 'high'
      },
      {
        name: 'Unit Testing & Regression Verification',
        description: `Writing automated tests to assert the issue fix without breaking existing repository test suites.`,
        importance: 'medium'
      }
    ];

    const knowledgeGaps = [
      {
        concept: `${lang} error propagation patterns`,
        reason: `Understanding whether errors in this repository are raised as exceptions, passed via callbacks, or emitted as events.`
      },
      {
        concept: `Repository testing framework conventions`,
        reason: `How mock objects, fixtures, and assertions are established in this codebase.`
      }
    ];

    const preparationSteps = [
      {
        title: 'Inspect Primary Relevant Files',
        description: `Read through ${relevantFiles.slice(0, 2).map(f => f.path).join(' and ') || 'the source files'} to trace how the current behavior is implemented.`,
        related_files: relevantFiles.slice(0, 2).map(f => f.path)
      },
      {
        title: 'Locate Existing Test Cases',
        description: 'Find the test file corresponding to the target module and run the test suite locally.',
        related_files: relevantFiles.filter(f => f.path.includes('test') || f.path.includes('spec')).map(f => f.path)
      },
      {
        title: 'Review Contribution Guidelines',
        description: 'Check CONTRIBUTING.md or the README to verify code style, branch naming, and pull request requirements.',
        related_files: ['CONTRIBUTING.md', 'README.md']
      },
      {
        title: 'Isolate the Issue with a Failing Test',
        description: 'Write a small reproduction test that fails on the current codebase and will pass once your proposed fix is applied.',
        related_files: relevantFiles.slice(0, 1).map(f => f.path)
      }
    ];

    const practiceTask = {
      title: 'Trace Code Execution and Write a Reproduction Assertion',
      description: `In a local clone, locate ${relevantFiles[0]?.path || 'the core module'} and add a test case reproducing the scenario described in #${issue.number}.`,
      related_files: [relevantFiles[0]?.path || 'src/index.js']
    };

    const targetFile = relevantFiles[0]?.path || 'src/index.js';
    const testFile = relevantFiles.find(f => f.path.includes('test'))?.path || 'tests/index.test.js';

    const quiz = [
      {
        question: `Based on the repository structure, which file is most critical for addressing the issue "${issue.title.slice(0, 50)}..."?`,
        options: [
          targetFile,
          'package-lock.json',
          '.gitignore',
          'license.txt'
        ],
        correct_answer: targetFile,
        explanation: `${targetFile} was identified by the context engine as directly matching the issue keywords and logic flow.`
      },
      {
        question: `Before submitting a pull request to ${repository.fullName}, what is the recommended first step?`,
        options: [
          'Directly push changes to the main branch',
          'Reproduce the issue locally and write/verify tests in the test suite',
          'Delete all existing test files to make the build pass',
          'Open a duplicate issue on GitHub'
        ],
        correct_answer: 'Reproduce the issue locally and write/verify tests in the test suite',
        explanation: 'Open-source maintainers expect contributors to verify fixes with automated tests and follow existing codebase patterns.'
      },
      {
        question: `Why does the AI indicate this repository context is ${isPartialContext ? 'partial' : 'scoped'}?`,
        options: [
          'Because only relevant files were fetched to optimize context size and focus on the issue',
          'Because the GitHub API is completely broken',
          'Because the repository has no files in it',
          'Because the code is written in binary'
        ],
        correct_answer: 'Because only relevant files were fetched to optimize context size and focus on the issue',
        explanation: 'Intelligent context trimming extracts high-signal files matching the issue without overloading context windows with unnecessary assets.'
      }
    ];

    return {
      issue_summary: `Issue #${issue.number}: ${issue.title}`,
      problem_explanation: issue.body
        ? `The issue describes: ${issue.body.slice(0, 250)}... ${isPartialContext ? '(Note: Repository context is partial; analysis is scoped to extracted candidate files).' : ''}`
        : `The contributor reported an issue in ${repository.name} regarding: ${issue.title}.`,
      expected_change: `Update the implementation in ${targetFile} and ensure regression tests in ${testFile} pass.`,
      relevant_files: relevantFiles,
      required_concepts: requiredConcepts,
      knowledge_gaps: knowledgeGaps,
      preparation_steps: preparationSteps,
      practice_task: practiceTask,
      quiz,
      _meta: {
        model: 'Repository AST & Heuristic Synthesis Engine',
        provider: 'context-engine',
        isPartialContext
      }
    };
  }

  /**
   * Interactive Contributor Assistant Chat
   */
  async chatWithContext({ message, history = [], issue, repository, contextFiles = [] }) {
    if (this.apiKey && this.apiKey.length > 5) {
      try {
        const systemPrompt = `You are ContribReady AI, an expert open-source mentor helping a developer prepare to contribute to the GitHub issue #${issue.number} (${issue.title}) in repository ${repository.fullName}.
Answer using the repository context provided.
Be concise, clear, and encouraging.
If asked about a file, function, or concept, explain its role in this repository.
Always clarify: "AI answers are based on the repository context loaded for this issue."`;

        const contextSummary = contextFiles.map(f => `File ${f.path}:\n${f.content.slice(0, 1500)}`).join('\n\n');

        if (this.provider === 'gemini') {
          const cleanModel = this.model.replace(/^models\//, '');
          const chatPrompt = `${systemPrompt}\n\nREPOSITORY CONTEXT:\n${contextSummary}\n\nUser Question: ${message}`;
          const res = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${this.apiKey}`,
            {
              contents: [{ role: 'user', parts: [{ text: chatPrompt }] }],
              generationConfig: { temperature: 0.3, maxOutputTokens: 1024 }
            },
            {
              headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
              timeout: 30000
            }
          );
          const reply = res.data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) {
            return {
              reply: `${reply.trim()}\n\n*(AI answers are based on the repository context loaded for this issue.)*`,
              provider: 'gemini',
              model: this.model
            };
          }
        } else if (this.provider === 'groq') {
          const messages = [
            { role: 'system', content: `${systemPrompt}\n\nREPOSITORY CONTEXT:\n${contextSummary}` },
            ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
            { role: 'user', content: message }
          ];
          const res = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
              model: this.model || 'llama-3.3-70b-versatile',
              messages,
              temperature: 0.3
            },
            {
              headers: { 'Authorization': `Bearer ${this.apiKey}` },
              timeout: 30000
            }
          );
          return {
            reply: res.data.choices[0].message.content,
            provider: this.provider,
            model: this.model
          };
        }
      } catch (err) {
        console.warn('[AI Service] Live chat call failed:', err.message);
      }
    }

    // Contextual fallback response for chat
    const mLower = message.toLowerCase();
    let reply = '';

    if (mLower.includes('file') || mLower.includes('start') || mLower.includes('where')) {
      const topFile = contextFiles[0]?.path || 'the core entry file';
      reply = `Based on the repository context loaded for this issue, you should start by inspecting \`${topFile}\`. It matches the key concepts in issue #${issue.number} ("${issue.title}"). Then, check the corresponding test file to understand expected inputs and outputs.`;
    } else if (mLower.includes('test') || mLower.includes('how to test')) {
      reply = `In ${repository.name} (${repository.language}), make sure to check the test directory. Before writing production code, write a reproduction test that fails with the current behavior. Once your fix is in place, the test should turn green without breaking any existing tests.`;
    } else if (mLower.includes('concept') || mLower.includes('learn')) {
      reply = `For this issue in ${repository.name}, focus on understanding the data flow and error handling in ${repository.language}. Review how parameters are passed into the relevant functions in \`${contextFiles[0]?.path || 'the source files'}\`.`;
    } else {
      reply = `Regarding "${message}": In repository ${repository.fullName} for issue #${issue.number}, maintainers prioritize minimal, well-tested changes that preserve backwards compatibility. Review the relevant files listed in the dashboard and take the readiness check to ensure your mental model is aligned!`;
    }

    return {
      reply: `${reply}\n\n*(AI answers are based on the repository context loaded for this issue.)*`,
      provider: 'context-engine',
      model: 'ContribReady Mentor Engine'
    };
  }
}
