import React from 'react';
import { Sparkles, GitPullRequest, CheckCircle2, ShieldCheck, Compass } from 'lucide-react';
import GithubIcon from './GithubIcon.jsx';

export default function Navbar({ onSelectDemo, systemHealth, onReset }) {
  const isLive = systemHealth?.ai?.hasKey;
  const modelName = systemHealth?.ai?.model || 'Open-Weight AI';

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[#090a0f]/85 border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div 
          onClick={onReset}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-200">
            <div className="w-full h-full bg-[#0d1117] rounded-[10px] flex items-center justify-center">
              <GitPullRequest className="w-5 h-5 text-emerald-400 group-hover:text-emerald-300" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                ContribReady
              </span>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center space-x-1">
                <Sparkles className="w-2.5 h-2.5" />
                <span>Open-Weight AI</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">From GitHub Issue to Contribution-Ready</p>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center space-x-3">
          {/* AI Model indicator */}
          <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
            <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400'}`} />
            <span className="text-slate-400">Model:</span>
            <span className="font-mono text-emerald-400 font-medium truncate max-w-[160px]">
              {modelName}
            </span>
          </div>

          {/* Quick Demo Dropdown */}
          <button
            onClick={() => onSelectDemo('express-retry-middleware')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition-all"
          >
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span>Try Demo</span>
          </button>

          {/* Hackathon Challenge Badge */}
          <a
            href="https://github.com/kondl/mlh-hackathon"
            target="_blank"
            rel="noreferrer"
            className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs transition-colors"
          >
            <GithubIcon className="w-3.5 h-3.5" />
            <span>MLH Hack Day</span>
          </a>
        </div>
      </div>
    </header>
  );
}
