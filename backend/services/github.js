import axios from 'axios';
import { getGitHubToken } from '../config/env.js';

/**
 * GitHub URL parsing and validation
 */
export function parseGitHubIssueUrl(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('Please enter a valid GitHub issue URL.');
  }

  const trimmed = url.trim();
  // Match https://github.com/:owner/:repo/issues/:number
  const match = trimmed.match(
    /^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/issues\/(\d+)(?:[#?].*)?$/i
  );

  if (!match) {
    throw new Error('Invalid GitHub issue URL. Expected format: https://github.com/owner/repository/issues/123');
  }

  return {
    owner: match[1],
    repo: match[2],
    issueNumber: parseInt(match[3], 10),
    canonicalUrl: `https://github.com/${match[1]}/${match[2]}/issues/${match[3]}`
  };
}

/**
 * Diagnostic: Check GitHub API rate limit using the configured token safely
 */
export async function checkGitHubRateLimit(token = null) {
  const activeToken = (token || getGitHubToken() || '').trim();
  const headers = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'ContribReady-Engine/1.0'
  };

  if (activeToken.length > 0) {
    headers['Authorization'] = `Bearer ${activeToken}`;
  }

  try {
    const res = await axios.get('https://api.github.com/rate_limit', {
      headers,
      timeout: 10000
    });

    const rate = res.data.rate;
    const isAuthenticated = rate.limit > 60;

    return {
      authenticated: isAuthenticated,
      limit: rate.limit,
      remaining: rate.remaining,
      reset: rate.reset,
      resetTime: new Date(rate.reset * 1000).toLocaleTimeString()
    };
  } catch (err) {
    if (err.response?.status === 401) {
      return {
        authenticated: false,
        error: 'TOKEN_INVALID',
        message: 'GitHub rejected the configured token (Bad credentials).'
      };
    }
    return {
      authenticated: false,
      error: 'GITHUB_API_ERROR',
      message: err.message
    };
  }
}

/**
 * Fetch issue details, repository metadata, repository tree, and relevant files
 */
export async function fetchRepositoryAndIssueContext(owner, repo, issueNumber, token = null) {
  const activeToken = (token || getGitHubToken() || '').trim();
  const headers = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'ContribReady-Engine/1.0'
  };

  if (activeToken.length > 0) {
    // Authenticated requests send standard Bearer token
    headers['Authorization'] = `Bearer ${activeToken}`;
  }

  const api = axios.create({
    baseURL: 'https://api.github.com',
    headers,
    timeout: 15000
  });

  // 1. Fetch Issue Data
  let issueRes;
  try {
    issueRes = await api.get(`/repos/${owner}/${repo}/issues/${issueNumber}`);
  } catch (err) {
    handleGitHubApiError(err, owner, repo, issueNumber, activeToken);
  }

  const issueData = issueRes.data;
  if (issueData.pull_request) {
    throw new Error('The provided URL points to a Pull Request, not an Issue. Please provide a GitHub Issue URL.');
  }

  // 2. Fetch comments (top 5 to give extra context if available)
  let comments = [];
  try {
    if (issueData.comments > 0) {
      const commentsRes = await api.get(`/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=5`);
      comments = commentsRes.data.map(c => ({
        author: c.user?.login,
        body: c.body?.slice(0, 1000) || '',
        createdAt: c.created_at
      }));
    }
  } catch (err) {
    console.warn('[GitHub Engine] Could not fetch issue comments:', err.message);
  }

  // 3. Fetch Repository Details
  let repoRes;
  try {
    repoRes = await api.get(`/repos/${owner}/${repo}`);
  } catch (err) {
    handleGitHubApiError(err, owner, repo, issueNumber, activeToken);
  }
  const repoData = repoRes.data;

  // 4. Fetch Repository Tree (recursive tree of default branch)
  const defaultBranch = repoData.default_branch || 'main';
  let treeItems = [];
  try {
    const treeRes = await api.get(`/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`);
    if (treeRes.data && Array.isArray(treeRes.data.tree)) {
      treeItems = treeRes.data.tree;
    }
  } catch (err) {
    console.warn(`[GitHub Engine] Could not fetch recursive git tree for ${defaultBranch}:`, err.message);
  }

  // Filter out noise files
  const excludedDirs = [
    'node_modules', '.git', 'dist', 'build', 'coverage', 'vendor',
    'tmp', '.cache', '.next', '.nuxt', '__pycache__', '.pytest_cache',
    'target', 'bin', 'obj', '.idea', '.vscode'
  ];

  const excludedExtensions = [
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.pdf', '.woff',
    '.woff2', '.ttf', '.eot', '.mp4', '.webm', '.mp3', '.zip', '.tar',
    '.gz', '.exe', '.dll', '.so', '.dylib', '.lock', 'package-lock.json',
    'yarn.lock', 'pnpm-lock.yaml'
  ];

  const validFiles = treeItems.filter(item => {
    if (item.type !== 'blob') return false;
    const pathLower = item.path.toLowerCase();

    // Check directory exclusion
    for (const dir of excludedDirs) {
      if (pathLower.startsWith(`${dir}/`) || pathLower.includes(`/${dir}/`)) {
        return false;
      }
    }

    // Check extension exclusion
    for (const ext of excludedExtensions) {
      if (pathLower.endsWith(ext)) {
        return false;
      }
    }

    return true;
  });

  // 5. Intelligent File Relevance Scoring
  const keywords = extractIssueKeywords(issueData.title, issueData.body, issueData.labels);
  const scoredFiles = scoreFilesByRelevance(validFiles, keywords, repoData.language);

  // Top candidate files to fetch content for (up to 5 most relevant)
  const topCandidateFiles = scoredFiles.slice(0, 5);

  // 6. Fetch file contents (using raw.githubusercontent.com or API)
  const contextFiles = [];
  for (const candidate of topCandidateFiles) {
    try {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${candidate.path}`;
      const rawHeaders = { 'User-Agent': 'ContribReady-Engine/1.0' };
      if (activeToken.length > 0) {
        rawHeaders['Authorization'] = `Bearer ${activeToken}`;
      }

      const rawRes = await axios.get(rawUrl, {
        timeout: 8000,
        headers: rawHeaders
      });

      if (typeof rawRes.data === 'string' || typeof rawRes.data === 'object') {
        const text = typeof rawRes.data === 'string' ? rawRes.data : JSON.stringify(rawRes.data, null, 2);
        // Truncate to first ~180 lines or 6,000 characters to prevent context overflow
        const truncated = truncateContent(text, 180, 6000);
        contextFiles.push({
          path: candidate.path,
          score: candidate.score,
          matchReasons: candidate.reasons,
          content: truncated.text,
          totalLines: truncated.totalLines,
          isTruncated: truncated.isTruncated
        });
      }
    } catch (err) {
      console.warn(`[GitHub Engine] Could not fetch content for ${candidate.path}:`, err.message);
      contextFiles.push({
        path: candidate.path,
        score: candidate.score,
        matchReasons: candidate.reasons,
        content: `// Content could not be loaded directly (${err.message})`,
        totalLines: 0,
        isTruncated: false
      });
    }
  }

  // Also include README if available and not already in contextFiles
  const readmeItem = validFiles.find(f => /^readme(\.(md|markdown|txt|rst))?$/i.test(f.path));
  let readmeSnippet = '';
  if (readmeItem && !contextFiles.some(f => f.path.toLowerCase().startsWith('readme'))) {
    try {
      const readmeUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${readmeItem.path}`;
      const readmeRes = await axios.get(readmeUrl, { timeout: 6000 });
      if (typeof readmeRes.data === 'string') {
        readmeSnippet = truncateContent(readmeRes.data, 80, 2500).text;
      }
    } catch (err) {
      // Ignore
    }
  }

  // Include CONTRIBUTING guidelines if available
  const contribItem = validFiles.find(f => /(^|\/)contributing(\.(md|markdown|txt|rst))?$/i.test(f.path));
  let contributingSnippet = '';
  if (contribItem) {
    try {
      const contribUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${contribItem.path}`;
      const contribRes = await axios.get(contribUrl, { timeout: 6000 });
      if (typeof contribRes.data === 'string') {
        contributingSnippet = truncateContent(contribRes.data, 60, 2000).text;
      }
    } catch (err) {
      // Ignore
    }
  }

  // Extract structural tree summary (top 60 files)
  const treeSummary = validFiles.slice(0, 60).map(f => f.path);

  return {
    issue: {
      id: issueData.id,
      number: issueData.number,
      title: issueData.title,
      body: issueData.body || '',
      state: issueData.state,
      labels: (issueData.labels || []).map(l => (typeof l === 'string' ? l : l.name)),
      author: issueData.user?.login || 'unknown',
      createdAt: issueData.created_at,
      htmlUrl: issueData.html_url,
      commentsCount: issueData.comments || 0,
      commentsSnippet: comments
    },
    repository: {
      name: repoData.name,
      fullName: repoData.full_name,
      owner: owner,
      description: repoData.description || 'No repository description available.',
      language: repoData.language || 'Unknown',
      topics: repoData.topics || [],
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      defaultBranch,
      totalTrackedFiles: validFiles.length,
      readmeSnippet,
      contributingSnippet
    },
    contextFiles,
    treeSummary,
    isPartialContext: validFiles.length > 5
  };
}

/**
 * Dissect GitHub API error into exact diagnostic codes:
 * TOKEN_MISSING | TOKEN_INVALID | RATE_LIMITED | TOKEN_FORBIDDEN | NOT_FOUND | GITHUB_API_ERROR
 */
function handleGitHubApiError(err, owner, repo, issueNumber, token) {
  const status = err.response?.status;
  const data = err.response?.data;
  const headers = err.response?.headers || {};
  const remaining = headers['x-ratelimit-remaining'];
  const reset = headers['x-ratelimit-reset'];
  const resetTime = reset ? new Date(parseInt(reset, 10) * 1000).toLocaleTimeString() : 'soon';

  if (status === 401) {
    throw new Error(
      'TOKEN_INVALID: The GITHUB_TOKEN configured in backend/.env is invalid or has expired (Bad credentials). Please update GITHUB_TOKEN in backend/.env.'
    );
  }

  if (status === 403 || status === 429) {
    const isRateLimit = remaining === '0' || (data?.message && data.message.toLowerCase().includes('rate limit'));
    if (isRateLimit) {
      if (!token || token.length === 0) {
        throw new Error(
          `TOKEN_MISSING: GitHub unauthenticated API rate limit reached (60 req/hr). GITHUB_TOKEN is not configured in backend/.env. Please configure GITHUB_TOKEN in backend/.env or use Demo mode.`
        );
      }
      throw new Error(
        `RATE_LIMITED: GitHub authenticated API rate limit (5,000 req/hr) exhausted. Resets at ${resetTime}.`
      );
    }

    throw new Error(
      `TOKEN_FORBIDDEN: GitHub API access forbidden: ${data?.message || 'Token lacks repository permission'}.`
    );
  }

  if (status === 404) {
    throw new Error(
      `NOT_FOUND: Issue #${issueNumber} or repository ${owner}/${repo} could not be found on GitHub. Please verify the URL.`
    );
  }

  throw new Error(`GITHUB_API_ERROR: GitHub API request failed: ${err.message}`);
}

/**
 * Extract meaningful keywords and identifiers from issue text
 */
function extractIssueKeywords(title = '', body = '', labels = []) {
  const combined = `${title} ${body} ${labels.join(' ')}`;
  
  // Extract code tokens, words, path mentions, function names
  const words = combined
    .toLowerCase()
    .replace(/[^\w\s/.-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !isStopWord(w));

  // Extract any explicit file mentions or path fragments e.g. "src/client.js"
  const pathMatches = combined.match(/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_./-]+/g) || [];

  return {
    keywords: Array.from(new Set(words)),
    pathMentions: Array.from(new Set(pathMatches.map(p => p.toLowerCase())))
  };
}

/**
 * Score repository files based on relevance to issue keywords and test relationships
 */
function scoreFilesByRelevance(files, { keywords, pathMentions }, primaryLang = '') {
  const scored = [];

  for (const file of files) {
    const pLower = file.path.toLowerCase();
    let score = 0;
    const reasons = [];

    // Explicit path match from issue description
    for (const mention of pathMentions) {
      if (pLower.includes(mention) || mention.includes(pLower)) {
        score += 40;
        reasons.push(`Directly referenced in issue (${mention})`);
      }
    }

    // Keyword matching in filename or path
    const pathParts = pLower.split('/');
    const fileName = pathParts[pathParts.length - 1];

    for (const kw of keywords) {
      if (fileName.includes(kw)) {
        score += 18;
        reasons.push(`Filename matches keyword "${kw}"`);
      } else if (pLower.includes(kw)) {
        score += 8;
        reasons.push(`Directory path matches keyword "${kw}"`);
      }
    }

    // High priority source directories
    if (pLower.startsWith('src/') || pLower.startsWith('lib/') || pLower.startsWith('app/') || pLower.startsWith('packages/')) {
      score += 6;
    }

    // Relevant tests
    if (pLower.includes('test') || pLower.includes('spec')) {
      if (score > 10) {
        score += 12;
        reasons.push('Relevant test suite file');
      }
    }

    // Core config / entry files
    if (['package.json', 'requirements.txt', 'pyproject.toml', 'cargo.toml', 'go.mod'].includes(fileName)) {
      score += 4;
      reasons.push('Core manifest/dependency file');
    }

    if (score > 0) {
      scored.push({
        path: file.path,
        score,
        reasons: Array.from(new Set(reasons))
      });
    }
  }

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  // Cross-reference: boost tests for top implementation files
  const topImp = scored.slice(0, 3);
  for (const imp of topImp) {
    const baseName = imp.path.split('/').pop().replace(/\.[^/.]+$/, '').toLowerCase();
    for (const f of files) {
      const pLow = f.path.toLowerCase();
      if ((pLow.includes('test') || pLow.includes('spec')) && pLow.includes(baseName)) {
        const existing = scored.find(s => s.path === f.path);
        if (existing) {
          existing.score += 20;
          existing.reasons.push(`Direct unit test for ${imp.path}`);
        } else {
          scored.push({
            path: f.path,
            score: imp.score - 5,
            reasons: [`Direct unit test for ${imp.path}`]
          });
        }
      }
    }
  }

  // Re-sort after boosting tests
  scored.sort((a, b) => b.score - a.score);

  // If very few scored files found, fallback to top src/lib files
  if (scored.length < 3) {
    for (const file of files) {
      if (!scored.some(s => s.path === file.path)) {
        const pLower = file.path.toLowerCase();
        if (pLower.startsWith('src/') || pLower.startsWith('lib/') || pLower.includes('index')) {
          scored.push({
            path: file.path,
            score: 2,
            reasons: ['Key project source file']
          });
          if (scored.length >= 6) break;
        }
      }
    }
  }

  return scored;
}

/**
 * Truncate long content with line and char limits
 */
function truncateContent(text, maxLines = 180, maxChars = 6000) {
  const lines = text.split('\n');
  const totalLines = lines.length;
  let isTruncated = false;

  let slicedLines = lines;
  if (lines.length > maxLines) {
    slicedLines = lines.slice(0, maxLines);
    isTruncated = true;
  }

  let joined = slicedLines.join('\n');
  if (joined.length > maxChars) {
    joined = joined.slice(0, maxChars);
    isTruncated = true;
  }

  if (isTruncated) {
    joined += `\n\n// ... [Content trimmed for context optimization: showing ${slicedLines.length} of ${totalLines} lines] ...`;
  }

  return {
    text: joined,
    totalLines,
    isTruncated
  };
}

function isStopWord(word) {
  const stopWords = new Set([
    'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'are', 'was',
    'when', 'what', 'which', 'there', 'their', 'some', 'could', 'would', 'should',
    'about', 'into', 'over', 'after', 'then', 'also', 'will', 'just', 'more',
    'been', 'were', 'than', 'does', 'only', 'very', 'here', 'where', 'why',
    'how', 'all', 'any', 'both', 'each', 'few', 'most', 'other', 'same', 'such'
  ]);
  return stopWords.has(word);
}
