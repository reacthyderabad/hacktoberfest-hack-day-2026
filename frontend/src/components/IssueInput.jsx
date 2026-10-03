import React, { useState } from 'react';
import { Search, Sparkles, AlertCircle, ArrowRight, ExternalLink } from 'lucide-react';
import GithubIcon from './GithubIcon.jsx';

export default function IssueInput({ onAnalyze, onSelectDemo, isLoading, error }) {
  const [url, setUrl] = useState('');
  const [localError, setLocalError] = useState('');

  const sampleIssues = [
    {
      id: 'express-retry-middleware',
      label: 'Express.js #5482',
      name: 'Retry Logic for Router',
      tag: 'JavaScript'
    },
    {
      id: 'react-suspense-hydration',
      label: 'React #28190',
      name: 'Suspense Hydration Warning',
      tag: 'React / Reconciler'
    },
    {
      id: 'flask-json-errors',
      label: 'Flask #2490',
      name: 'Structured JSON Error Responses',
      tag: 'Python'
    }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError('');

    if (!url || !url.trim()) {
      setLocalError('Please enter a GitHub issue URL to analyze.');
      return;
    }

    const trimmed = url.trim();
    if (!trimmed.includes('github.com') || !trimmed.includes('/issues/')) {
      setLocalError('Invalid GitHub issue URL. Expected format: https://github.com/owner/repository/issues/123');
      return;
    }

    onAnalyze(trimmed);
  };

  const handleSelectSample = (sample) => {
    setLocalError('');
    onSelectDemo(sample.id);
  };

  const formatErrorMessage = (errMsg) => {
    if (!errMsg) return null;
    const msg = typeof errMsg === 'object' ? (errMsg.message || JSON.stringify(errMsg)) : String(errMsg);

    if (msg.startsWith('TOKEN_MISSING')) {
      return {
        code: 'TOKEN_MISSING',
        title: 'GitHub Token Required (Unauthenticated Limit Exhausted)',
        description: 'GitHub permits only 60 unauthenticated requests/hour per IP, which has been exhausted. To analyze live GitHub repositories, configure GITHUB_TOKEN in backend/.env. Alternatively, select any verified hackathon demo below.',
        type: 'warning',
        action: 'demo'
      };
    }

    if (msg.startsWith('TOKEN_INVALID')) {
      return {
        code: 'TOKEN_INVALID',
        title: 'Invalid GitHub Personal Access Token',
        description: 'GitHub rejected the credentials configured in backend/.env (401 Bad credentials). Please check and refresh your Personal Access Token in backend/.env.',
        type: 'error',
        action: 'config'
      };
    }

    if (msg.startsWith('RATE_LIMITED')) {
      return {
        code: 'RATE_LIMITED',
        title: 'Authenticated GitHub Rate Limit Exhausted',
        description: 'The authenticated GitHub API limit (5,000 requests/hr) for this token has been temporarily exhausted. Please wait for the quota window reset or try a verified demo.',
        type: 'warning',
        action: 'demo'
      };
    }

    if (msg.startsWith('TOKEN_FORBIDDEN')) {
      return {
        code: 'TOKEN_FORBIDDEN',
        title: 'Repository Access Forbidden',
        description: 'GitHub returned a 403 Forbidden. The repository might be private, or the token may lack permission to read repository metadata.',
        type: 'error',
        action: 'config'
      };
    }

    if (msg.startsWith('NOT_FOUND')) {
      return {
        code: 'NOT_FOUND',
        title: 'Repository or Issue Not Found',
        description: 'Please ensure the repository is public and the issue URL exists on GitHub.',
        type: 'error',
        action: 'check-url'
      };
    }

    return {
      code: 'GITHUB_API_ERROR',
      title: 'GitHub API Communication Error',
      description: msg.replace(/^[A-Z_]+:\s*/, ''),
      type: 'error',
      action: 'retry'
    };
  };

  return (
    <div id="issue-input-section" className="max-w-4xl mx-auto px-4 sm:px-6 mb-16">
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Top subtle highlight */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500" />

        <div className="text-center sm:text-left mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <GithubIcon className="w-6 h-6 text-emerald-400" />
              <span>Analyze an Open-Source Issue</span>
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              Auto-extracts repo, files & requirements
            </span>
          </div>
          <p className="text-sm text-slate-400">
            Paste any public GitHub issue URL. ContribReady inspects the repository tree, fetches relevant source modules, and uses open-weight AI to evaluate your contribution readiness.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex flex-col sm:flex-row items-stretch gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (localError) setLocalError('');
                }}
                disabled={isLoading}
                placeholder="https://github.com/facebook/react/issues/12345"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-950/80 border border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-slate-100 placeholder-slate-500 text-sm font-mono transition-all outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 shrink-0 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <span>Analyze Issue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {(localError || error) && (() => {
            const errInfo = formatErrorMessage(localError || error);
            const isWarning = errInfo.type === 'warning';
            return (
              <div className={`mt-4 p-4 rounded-xl border text-xs flex items-start space-x-3 transition-all ${
                isWarning
                  ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                  : 'bg-red-950/40 border-red-500/40 text-red-200'
              }`}>
                <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${
                  isWarning ? 'text-amber-400' : 'text-red-400'
                }`} />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-bold text-sm text-white">{errInfo.title}</p>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      isWarning
                        ? 'bg-amber-950/60 border-amber-500/30 text-amber-300'
                        : 'bg-red-950/60 border-red-500/30 text-red-300'
                    }`}>
                      {errInfo.code}
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-xs">{errInfo.description}</p>
                  {errInfo.action === 'demo' && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center gap-1.5 text-emerald-400 font-medium">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span>Zero-config exploration: Click any verified hackathon demo issue below to test the full analysis pipeline immediately.</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </form>

        {/* Quick Demo Samples */}
        <div className="pt-4 border-t border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Or try a verified hackathon demo issue:</span>
            </span>

            <div className="flex flex-wrap items-center gap-2">
              {sampleIssues.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => handleSelectSample(sample)}
                  disabled={isLoading}
                  className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-slate-300 hover:text-emerald-300 text-xs font-mono transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <span className="font-semibold text-white">{sample.label}</span>
                  <span className="text-[10px] text-slate-400">({sample.tag})</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
