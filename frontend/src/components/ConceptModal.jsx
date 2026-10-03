import React from 'react';
import { X, BookOpen, Lightbulb, CheckCircle2, BookmarkCheck, ArrowRight } from 'lucide-react';

export default function ConceptModal({ concept, isKnown, onToggleKnown, onClose }) {
  if (!concept) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0d1117] border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider">Mini Learning Mode</span>
              <h3 className="text-base font-bold text-white">{concept.name}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Concept definition */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              <span>Core Concept Definition</span>
            </h4>
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-slate-200 leading-relaxed">
              {concept.description}
            </div>
          </div>

          {/* Why this matters for this issue */}
          <div>
            <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Why This Matters For This Issue</span>
            </h4>
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-sm text-emerald-100 leading-relaxed">
              {concept.importanceReason || (
                `In this specific repository, mastering ${concept.name} prevents regressions, aligns your implementation with maintainers' conventions, and ensures your pull request meets code review standards.`
              )}
            </div>
          </div>

          {/* Self-Assessment toggle */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-400">Your self-assessment:</span>
            <button
              onClick={() => onToggleKnown(concept.name)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
                isKnown
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              {isKnown ? (
                <>
                  <BookmarkCheck className="w-4 h-4 text-emerald-400" />
                  <span>Marked as: I know this</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>Marked as: I need to learn this</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-900/90 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
