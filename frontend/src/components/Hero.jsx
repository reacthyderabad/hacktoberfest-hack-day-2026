import React from 'react';
import { ArrowRight, Sparkles, Terminal, FileCode, Brain, CheckCircle, GitPullRequest, Code2 } from 'lucide-react';

export default function Hero({ onScrollToInput, onSelectDemo }) {
  return (
    <section className="relative overflow-hidden pt-12 pb-16 lg:pt-16 lg:pb-20">
      {/* Background glowing gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-emerald-500/10 via-cyan-500/10 to-transparent blur-3xl -z-10 rounded-full pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
        {/* Hackathon track pill */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-medium text-slate-300 mb-6 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-slate-400">MLH × DEV × React Hyderabad Hack Day</span>
          <span className="text-slate-600">•</span>
          <span className="text-emerald-400 font-semibold">Best Open-Source AI Project</span>
        </div>

        {/* Main Title & Tagline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-4">
          ContribReady
        </h1>
        <p className="text-2xl sm:text-3xl font-semibold bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent mb-6">
          From GitHub Issue to Contribution-Ready.
        </p>

        {/* Subtitle */}
        <p className="max-w-3xl mx-auto text-base sm:text-lg text-slate-300 leading-relaxed mb-8">
          Understand what an open-source issue requires, learn the missing concepts, explore the relevant code, and test your readiness before you start contributing.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
          <button
            onClick={onScrollToInput}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center space-x-2 group cursor-pointer"
          >
            <span>Analyze a GitHub Issue</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => onSelectDemo('express-retry-middleware')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 text-slate-200 border border-slate-800 text-sm font-medium transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Try Live Demo (Express #5482)</span>
          </button>
        </div>

        {/* Secondary small text */}
        <p className="text-xs text-slate-500 flex items-center justify-center space-x-1.5 mb-14">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Powered by open-weight AI (Gemma 2 / Llama 3 / Qwen)</span>
        </p>

        {/* Visual Workflow Diagram */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800/70 text-xs text-slate-400">
            <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>THE CONTRIBREADY WORKFLOW</span>
            </span>
            <span className="hidden sm:inline font-mono text-[11px] text-slate-500">Autonomous Context Engine + Open-Weight Intelligence</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 relative">
            {/* Step 1 */}
            <div className="flex flex-col items-center p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/60 text-center hover:border-emerald-500/40 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2.5 font-bold text-xs">
                01
              </div>
              <span className="text-xs font-semibold text-slate-200 mb-1">GitHub Issue</span>
              <span className="text-[11px] text-slate-400">Target problem & user reports</span>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/60 text-center hover:border-emerald-500/40 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-2.5 font-bold text-xs">
                02
              </div>
              <span className="text-xs font-semibold text-slate-200 mb-1">AI Analysis</span>
              <span className="text-[11px] text-slate-400">Code context & AST mapping</span>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/60 text-center hover:border-emerald-500/40 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center mb-2.5 font-bold text-xs">
                03
              </div>
              <span className="text-xs font-semibold text-slate-200 mb-1">Preparation</span>
              <span className="text-[11px] text-slate-400">Relevant files & concepts</span>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col items-center p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/60 text-center hover:border-emerald-500/40 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2.5 font-bold text-xs">
                04
              </div>
              <span className="text-xs font-semibold text-slate-200 mb-1">Readiness Check</span>
              <span className="text-[11px] text-slate-400">Repo-specific quiz & gaps</span>
            </div>

            {/* Step 5 */}
            <div className="flex flex-col items-center p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-center">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center mb-2.5 font-bold text-xs">
                05
              </div>
              <span className="text-xs font-semibold text-emerald-300 mb-1">Contribution</span>
              <span className="text-[11px] text-slate-300">Confidently open PR</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
