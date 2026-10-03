import React from 'react';
import { X, FileCode, CheckCircle2, ShieldAlert, Copy, Check } from 'lucide-react';

export default function FileViewerModal({ file, repo, onClose }) {
  const [copied, setCopied] = React.useState(false);

  if (!file) return null;

  const handleCopy = () => {
    if (file.content) {
      navigator.clipboard.writeText(file.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const lines = file.content ? file.content.split('\n') : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0d1117] border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900/90 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-sm font-semibold text-white">{file.path}</span>
                {file.importance && (
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                    file.importance === 'high' ? 'bg-red-500/15 text-red-400 border border-red-500/30' :
                    file.importance === 'medium' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                    'bg-slate-700 text-slate-300'
                  }`}>
                    {file.importance} priority
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate max-w-xl mt-0.5">{file.reason}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs flex items-center space-x-1"
              title="Copy code"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-auto p-4 bg-[#090d13] font-mono text-xs text-slate-300 leading-relaxed selection:bg-emerald-500/30">
          {lines.length > 0 ? (
            <div className="table w-full">
              {lines.map((line, idx) => (
                <div key={idx} className="table-row hover:bg-slate-800/40">
                  <span className="table-cell select-none text-right pr-4 pl-2 text-slate-600 font-mono text-[11px] w-12 border-r border-slate-800/80">
                    {idx + 1}
                  </span>
                  <span className="table-cell pl-4 whitespace-pre">
                    {line}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 font-sans">
              <FileCode className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p>No preview content available for this file.</p>
              <p className="text-xs mt-1">This file path was identified as high-relevance in the repository tree.</p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>{lines.length} lines loaded into context</span>
          {repo && (
            <a
              href={`https://github.com/${repo.fullName}/blob/${repo.defaultBranch || 'main'}/${file.path}`}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:underline flex items-center space-x-1"
            >
              <span>View full file on GitHub</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
