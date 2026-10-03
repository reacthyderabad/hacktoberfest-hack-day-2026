import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Sparkles, Terminal, ShieldAlert } from 'lucide-react';

export default function AnalysisProgress({ stage = 0, modelName = 'Open-Weight AI' }) {
  const stages = [
    { label: 'Validating GitHub issue URL', detail: 'Parsing owner, repository, and issue parameters' },
    { label: 'Fetching issue description & discussion', detail: 'Retrieving issue metadata and author comments from GitHub' },
    { label: 'Reading repository structure', detail: 'Extracting file tree and filtering out node_modules/vendor clutter' },
    { label: 'Identifying relevant files via heuristic scoring', detail: 'Matching issue keywords with repository modules and test files' },
    { label: 'Extracting source code context', detail: 'Reading content of target files for deep reasoning' },
    { label: `Asking open-weight AI (${modelName}) to analyze codebase`, detail: 'Reasoning about required concepts, architecture, and bugs' },
    { label: 'Generating preparation path & readiness quiz', detail: 'Structuring personalized guidance and repository-specific test' }
  ];

  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Progressively advance through stages up to stage 5 while waiting for API
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < stages.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 1100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 my-12">
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Analyzing Repository & Issue...</h3>
              <p className="text-xs text-slate-400">Context engine gathering high-signal files for the model</p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-mono border border-emerald-500/20">
            <Sparkles className="w-3 h-3 mr-1" />
            {modelName}
          </span>
        </div>

        {/* Multi-step progress list */}
        <div className="space-y-3.5">
          {stages.map((item, index) => {
            const isDone = index < currentStep;
            const isCurrent = index === currentStep;
            const isPending = index > currentStep;

            return (
              <div
                key={index}
                className={`flex items-start space-x-3.5 p-2.5 rounded-xl transition-all ${
                  isCurrent
                    ? 'bg-slate-800/80 border border-emerald-500/30'
                    : isDone
                    ? 'opacity-80'
                    : 'opacity-40'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : isCurrent ? (
                    <div className="w-4 h-4 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-700 bg-slate-900" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold ${isCurrent ? 'text-emerald-300 font-bold' : isDone ? 'text-slate-200' : 'text-slate-400'}`}>
                    {item.label}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {item.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center space-x-1.5">
            <Terminal className="w-3.5 h-3.5 text-slate-400" />
            <span>Autonomous Context Trimming & AST Extraction</span>
          </span>
          <span className="font-mono">Processing payload...</span>
        </div>
      </div>
    </div>
  );
}
