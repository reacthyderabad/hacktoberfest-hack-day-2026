import React from 'react';
import { GitPullRequest, Heart, Sparkles, Shield } from 'lucide-react';

export default function Footer({ onReset }) {
  return (
    <footer className="border-t border-slate-800/80 bg-[#07080c] py-12 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800/80">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={onReset}>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <GitPullRequest className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm text-white">ContribReady</span>
              <p className="text-[11px] text-slate-500">From GitHub Issue to Contribution-Ready</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <span className="flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Open-Weight AI Intelligence</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>MIT Licensed</span>
            </span>
            <span>MLH × DEV × React Hyderabad</span>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>
            An open-source developer tool bridging the gap between finding an issue and making your first verified pull request.
          </p>
          <p className="flex items-center space-x-1">
            <span>Built with React, Vite & Open-Weight AI</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
