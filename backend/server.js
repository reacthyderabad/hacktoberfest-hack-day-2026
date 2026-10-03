import './config/env.js';
import { getGitHubToken, getGeminiApiKey, getAiModel, getAiProvider } from './config/env.js';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseGitHubIssueUrl, fetchRepositoryAndIssueContext, checkGitHubRateLimit } from './services/github.js';
import { AIService } from './services/ai/aiService.js';
import { evaluateQuizSubmission } from './services/quizService.js';
import { DEMO_SAMPLES, findDemoSample } from './demo/sampleData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration to allow local frontend access
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

const aiService = new AIService();

// Health & System Info (Safe Diagnostic Schema)
app.get('/api/health', (req, res) => {
  const token = getGitHubToken();
  const aiInfo = aiService.getInfo();
  res.json({
    status: 'ok',
    version: '1.0.0',
    platform: 'ContribReady Engine',
    github: {
      tokenConfigured: Boolean(token && token.length > 0)
    },
    ai: {
      provider: aiInfo.provider,
      model: aiInfo.model,
      mode: aiInfo.hasKey ? 'live' : 'demo'
    },
    timestamp: new Date().toISOString()
  });
});

// Safe GitHub Rate Limit Diagnostic Endpoint
app.get('/api/github/rate-limit', async (req, res) => {
  try {
    const rateLimit = await checkGitHubRateLimit();
    res.json({
      success: true,
      ...rateLimit
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Demo Samples Endpoint
app.get('/api/demo-samples', (req, res) => {
  const sanitizedSamples = DEMO_SAMPLES.map(s => ({
    id: s.id,
    name: s.name,
    owner: s.owner,
    repo: s.repo,
    issueNumber: s.issueNumber,
    url: s.url,
    title: s.issue.title,
    language: s.repository.language,
    labels: s.issue.labels
  }));
  res.json({ samples: sanitizedSamples });
});

// Analyze GitHub Issue Endpoint
app.post('/api/analyze', async (req, res) => {
  try {
    const { issueUrl, demoId } = req.body;

    // Check for explicit demo request
    if (demoId) {
      const demoData = DEMO_SAMPLES.find(s => s.id === demoId);
      if (demoData) {
        return res.json({
          success: true,
          isDemo: true,
          demoNotice: 'Demonstration Mode: Using verified repository dataset and benchmark analysis.',
          issue: demoData.issue,
          repository: demoData.repository,
          contextFiles: [
            {
              path: demoData.analysis.relevant_files[0]?.path || 'lib/router/layer.js',
              score: 95,
              matchReasons: ['Target file identified by context engine'],
              content: `// Sample verified extract from ${demoData.repository.fullName}\n// ${demoData.analysis.relevant_files[0]?.reason}`,
              totalLines: 120,
              isTruncated: false
            }
          ],
          analysis: {
            ...demoData.analysis,
            _meta: {
              model: 'Benchmark Verified Analysis (Open-Weight Reference)',
              provider: 'demo-cache',
              isPartialContext: false
            }
          }
        });
      }
    }

    if (!issueUrl) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid GitHub issue URL.'
      });
    }

    // 1. Validate GitHub URL
    let parsed;
    try {
      parsed = parseGitHubIssueUrl(issueUrl);
    } catch (urlErr) {
      return res.status(400).json({
        success: false,
        error: urlErr.message
      });
    }

    // 2. Fetch GitHub Issue and Repository Context via Authenticated API
    const activeToken = getGitHubToken();
    console.log(`[Engine] Analyzing ${parsed.owner}/${parsed.repo}#${parsed.issueNumber} (GitHub token configured: ${Boolean(activeToken)})...`);
    let context;
    try {
      context = await fetchRepositoryAndIssueContext(
        parsed.owner,
        parsed.repo,
        parsed.issueNumber,
        activeToken
      );
    } catch (ghErr) {
      console.error(`[Engine] GitHub fetch failed for ${parsed.owner}/${parsed.repo}#${parsed.issueNumber}:`, ghErr.message);
      const errorCode = ghErr.message.startsWith('TOKEN_MISSING') ? 'TOKEN_MISSING' :
                        ghErr.message.startsWith('TOKEN_INVALID') ? 'TOKEN_INVALID' :
                        ghErr.message.startsWith('RATE_LIMITED') ? 'RATE_LIMITED' :
                        ghErr.message.startsWith('TOKEN_FORBIDDEN') ? 'TOKEN_FORBIDDEN' :
                        ghErr.message.startsWith('NOT_FOUND') ? 'NOT_FOUND' : 'GITHUB_API_ERROR';
      return res.status(400).json({
        success: false,
        errorCode,
        error: ghErr.message
      });
    }

    // 3. Open-Weight AI Analysis
    console.log(`[Engine] Sending context to AI service layer...`);
    let analysis;
    try {
      analysis = await aiService.analyzeIssue(context);
    } catch (aiErr) {
      console.error('[Engine] AI Analysis error:', aiErr.message);
      return res.status(500).json({
        success: false,
        error: `AI analysis failed: ${aiErr.message}. Please check your model configuration.`
      });
    }

    res.json({
      success: true,
      isDemo: false,
      issue: context.issue,
      repository: context.repository,
      contextFiles: context.contextFiles,
      treeSummary: context.treeSummary,
      isPartialContext: context.isPartialContext,
      analysis
    });
  } catch (err) {
    console.error('[Engine] Unexpected error:', err);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while analyzing the issue. Please try again.'
    });
  }
});

// Quiz Evaluation Endpoint
app.post('/api/quiz/evaluate', (req, res) => {
  try {
    const { quiz, answers } = req.body;
    if (!quiz || !answers) {
      return res.status(400).json({
        success: false,
        error: 'Missing quiz questions or user answers.'
      });
    }

    const evaluation = evaluateQuizSubmission(quiz, answers);
    res.json({
      success: true,
      evaluation
    });
  } catch (err) {
    console.error('[Quiz] Evaluation error:', err.message);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// Contributor Assistant Chat Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [], issue, repository, contextFiles = [] } = req.body;

    if (!message || !issue || !repository) {
      return res.status(400).json({
        success: false,
        error: 'Missing message or repository context for chat.'
      });
    }

    const response = await aiService.chatWithContext({
      message,
      history,
      issue,
      repository,
      contextFiles
    });

    res.json({
      success: true,
      ...response
    });
  } catch (err) {
    console.error('[Chat] Error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to process chat query.'
    });
  }
});

// Serve static frontend in production
const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(frontendDist, 'index.html'));
});

app.listen(PORT, () => {
  const token = getGitHubToken();
  console.log(`\n======================================================`);
  console.log(`🚀 ContribReady Engine running on http://localhost:${PORT}`);
  console.log(`🧠 AI Provider: ${aiService.provider} | Model: ${aiService.model}`);
  console.log(`🔑 Live AI Key: ${aiService.apiKey ? 'Configured' : 'Demo/Fallback Mode'}`);
  console.log(`🐙 GitHub Token configured: ${Boolean(token && token.length > 0)}`);
  if (token && token.length > 0) {
    console.log(`🐙 GitHub Token length: ${token.length}`);
  }
  console.log(`======================================================\n`);
});

