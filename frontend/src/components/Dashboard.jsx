import React, { useState } from 'react';
import {
  ExternalLink,
  FileCode,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  MessageSquare,
  ArrowRight,
  GitPullRequest,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  Code2,
  Terminal,
  Clock,
  Compass,
  ListTodo
} from 'lucide-react';
import ReadinessQuiz from './ReadinessQuiz.jsx';
import QuizResults from './QuizResults.jsx';
import FileViewerModal from './FileViewerModal.jsx';
import ConceptModal from './ConceptModal.jsx';
import AIChatDrawer from './AIChatDrawer.jsx';

export default function Dashboard({
  data,
  isDemo,
  onRetakeQuiz,
  onEvaluateQuiz,
  evaluation,
  isEvaluating
}) {
  const { issue, repository, contextFiles = [], analysis = {} } = data;
  const {
    issue_summary,
    problem_explanation,
    expected_change,
    relevant_files = [],
    required_concepts = [],
    knowledge_gaps = [],
    preparation_steps = [],
    practice_task,
    quiz = [],
    _meta
  } = analysis;

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'files' | 'concepts' | 'prep' | 'quiz'
  const [selectedFileForModal, setSelectedFileForModal] = useState(null);
  const [selectedConceptForModal, setSelectedConceptForModal] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState({});
  const [expandedSteps, setExpandedSteps] = useState({});
  const [knownConcepts, setKnownConcepts] = useState({});

  const toggleFileExpand = (path) => {
    setExpandedFiles(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const toggleStepExpand = (idx) => {
    setExpandedSteps(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const toggleConceptKnown = (conceptName) => {
    setKnownConcepts(prev => ({ ...prev, [conceptName]: !prev[conceptName] }));
  };

  const handleOpenCodeModal = (fileObj) => {
    // Find matching context file if available
    const matched = contextFiles.find(cf => cf.path.toLowerCase() === fileObj.path.toLowerCase());
    setSelectedFileForModal({
      ...fileObj,
      content: matched ? matched.content : `// Path: ${fileObj.path}\n// Identified by context engine: ${fileObj.reason}`
    });
  };

  const scrollToQuiz = () => {
    setActiveTab('quiz');
    const el = document.getElementById('ready-check-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
      {/* Demo Notice Banner */}
      {isDemo && (
        <div className="mb-6 p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-2.5">
            <Compass className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              <strong className="font-semibold">Sample Demonstration Mode:</strong> Using verified repository benchmark dataset for live hackathon demo reliability.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] uppercase font-bold">
            Verified Dataset
          </span>
        </div>
      )}

      {/* Main Issue Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl mb-8 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Issue #{issue?.number || '000'}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 font-mono">
                {repository?.fullName}
              </span>
              {repository?.language && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800/80 text-cyan-300 border border-slate-700">
                  {repository.language}
                </span>
              )}
              {issue?.state && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase text-[10px] font-bold">
                  {issue.state}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
              {issue?.title}
            </h1>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={scrollToQuiz}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center space-x-2 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Test Readiness</span>
            </button>

            <button
              onClick={() => setIsChatOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors flex items-center space-x-2 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>Ask AI About Issue</span>
            </button>

            {issue?.htmlUrl && (
              <a
                href={issue.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
                title="View original issue on GitHub"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Sub-header meta bar */}
        <div className="pt-4 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-3">
          <div className="flex items-center space-x-4">
            <span>Author: <strong className="text-slate-300 font-mono">{issue?.author}</strong></span>
            <span>•</span>
            <span>Relevant files identified: <strong className="text-emerald-400 font-mono">{relevant_files.length}</strong></span>
            <span>•</span>
            <span>Tracked repo files: <strong className="text-slate-300 font-mono">{repository?.totalTrackedFiles || 40}</strong></span>
          </div>

          <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Analysis by: <strong className="text-emerald-400">{_meta?.model || 'Open-Weight AI'}</strong></span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-1 border-b border-slate-800 mb-8 overflow-x-auto pb-1">
        {[
          { id: 'overview', label: '1. Issue Overview' },
          { id: 'files', label: `2. Relevant Files (${relevant_files.length})` },
          { id: 'concepts', label: `3. Required Concepts (${required_concepts.length})` },
          { id: 'prep', label: '4. Preparation Path' },
          { id: 'quiz', label: '5. Ready Check (Quiz)' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-400 border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}

      {/* TAB 1: OVERVIEW */}
      {(activeTab === 'overview' || activeTab === 'all') && (
        <div className="space-y-8 mb-12">
          {/* Section 1: What does this issue mean? */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8">
            <div className="flex items-center space-x-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-white">1. What does this issue mean?</h3>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              {issue_summary}
            </p>
            {problem_explanation && (
              <p className="text-sm text-slate-400 leading-relaxed mt-4">
                {problem_explanation}
              </p>
            )}
          </div>

          {/* Section 2: What needs to change? */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8">
            <div className="flex items-center space-x-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                <Code2 className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-white">2. What needs to change?</h3>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              {expected_change}
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: RELEVANT FILES */}
      {(activeTab === 'files' || activeTab === 'overview') && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 mb-8">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <FileCode className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">3. Relevant Codebase Files</h3>
                <p className="text-xs text-slate-400">Scored and selected by the repository context engine</p>
              </div>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {relevant_files.length} primary targets
            </span>
          </div>

          <div className="space-y-3">
            {relevant_files.map((file, idx) => {
              const isExpanded = expandedFiles[file.path];
              const importanceColor = 
                file.importance === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                file.importance === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                'bg-slate-800 text-slate-400 border-slate-700';

              return (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden transition-all hover:border-slate-700"
                >
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <FileCode className="w-4 h-4 text-emerald-400 shrink-0 mt-1" />
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-semibold text-white truncate">
                            {file.path}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${importanceColor}`}>
                            {file.importance || 'medium'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {file.reason}
                        </p>
                        {file.target_symbols && file.target_symbols.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="text-[10px] font-mono text-slate-500">Key targets:</span>
                            {file.target_symbols.map((sym, sIdx) => (
                              <span key={sIdx} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-cyan-300">
                                {sym}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => handleOpenCodeModal(file)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition-all flex items-center space-x-1 cursor-pointer"
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        <span>Inspect Snippet</span>
                      </button>

                      <button
                        onClick={() => toggleFileExpand(file.path)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 bg-slate-900/50 border-t border-slate-800/80 text-xs text-slate-300">
                      <p className="font-medium text-slate-200 mb-1">Why this file matters:</p>
                      <p className="text-slate-400">{file.reason}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: REQUIRED CONCEPTS & KNOWLEDGE GAPS */}
      {(activeTab === 'concepts' || activeTab === 'overview') && (
        <div className="space-y-8 mb-8">
          {/* Required Concepts */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">4. Required Technical Concepts</h3>
                  <p className="text-xs text-slate-400">Click any concept card for Mini Learning Mode</p>
                </div>
              </div>
              <span className="text-[11px] font-mono text-cyan-400 hidden sm:inline">
                Interactive Self-Assessment
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {required_concepts.map((concept, idx) => {
                const isKnown = knownConcepts[concept.name];

                return (
                  <div
                    key={idx}
                    className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm text-white">{concept.name}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          concept.importance === 'high' ? 'bg-red-500/10 text-red-400 border border-red-500/30' :
                          'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}>
                          {concept.importance || 'high'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                        {concept.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <button
                        onClick={() => setSelectedConceptForModal(concept)}
                        className="text-cyan-400 hover:underline flex items-center space-x-1 cursor-pointer text-xs"
                      >
                        <span>Mini Lesson</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>

                      <button
                        onClick={() => toggleConceptKnown(concept.name)}
                        className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                          isKnown
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                        }`}
                      >
                        {isKnown ? '✓ I know this' : '⚠ Need to learn'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 14: Knowledge Gaps */}
          {knowledge_gaps.length > 0 && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8">
              <div className="flex items-center space-x-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">What You Should Know First</h3>
                  <p className="text-xs text-slate-400">Common prerequisite gaps for this specific task</p>
                </div>
              </div>

              <div className="space-y-3">
                {knowledge_gaps.map((gap, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs flex items-start space-x-3">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                    <div>
                      <p className="font-semibold text-slate-200">{gap.concept}</p>
                      <p className="text-slate-400 mt-0.5">{gap.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PREPARATION PATH */}
      {(activeTab === 'prep' || activeTab === 'overview') && (
        <div className="space-y-8 mb-8">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
                  <ListTodo className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">5. Step-by-Step Preparation Path</h3>
                  <p className="text-xs text-slate-400">Follow this roadmap before opening a PR</p>
                </div>
              </div>
              <span className="text-xs font-mono text-emerald-400">
                {preparation_steps.length} sequential steps
              </span>
            </div>

            {/* Timeline */}
            <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
              {preparation_steps.map((step, idx) => {
                const isExpanded = expandedSteps[idx] ?? true;

                return (
                  <div key={idx} className="relative group">
                    {/* Circle marker */}
                    <div className="absolute -left-6 sm:-left-8 top-1 w-6 h-6 rounded-full bg-slate-900 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center text-[10px] font-mono font-bold shadow-md">
                      {idx + 1}
                    </div>

                    <div className="p-4 sm:p-5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-bold text-white">{step.title}</h4>
                        <button
                          onClick={() => toggleStepExpand(idx)}
                          className="text-slate-500 hover:text-slate-300"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>

                      {isExpanded && (
                        <>
                          <p className="text-xs text-slate-300 leading-relaxed mb-3">
                            {step.description}
                          </p>
                          {step.related_files && step.related_files.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80">
                              <span className="text-[10px] font-mono text-slate-400">Target files:</span>
                              {step.related_files.map((rf, rIdx) => (
                                <span
                                  key={rIdx}
                                  className="px-2 py-0.5 rounded bg-slate-900 text-emerald-300 font-mono text-[10px] border border-slate-800"
                                >
                                  {rf}
                                </span>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Practice Task */}
            {practice_task && (
              <div className="mt-8 p-5 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-2">
                  <Terminal className="w-4 h-4" />
                  <span>Recommended Practice Task Before Coding</span>
                </div>
                <h5 className="text-sm font-semibold text-white mb-1">{practice_task.title}</h5>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">{practice_task.description}</p>
                {practice_task.related_files && practice_task.related_files.length > 0 && (
                  <div className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-300">
                    <span>Target:</span>
                    <span>{practice_task.related_files.join(', ')}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: READY CHECK (QUIZ) & RESULTS */}
      {(activeTab === 'quiz' || activeTab === 'overview') && (
        <div id="ready-check-section" className="space-y-8 mb-12">
          {evaluation ? (
            <QuizResults
              evaluation={evaluation}
              issue={issue}
              repository={repository}
              relevantFiles={relevant_files}
              onRetake={onRetakeQuiz}
              onReviewPrep={() => setActiveTab('prep')}
            />
          ) : (
            <ReadinessQuiz
              quiz={quiz}
              onEvaluate={onEvaluateQuiz}
              isEvaluating={isEvaluating}
            />
          )}
        </div>
      )}

      {/* Modals & Drawers */}
      {selectedFileForModal && (
        <FileViewerModal
          file={selectedFileForModal}
          repo={repository}
          onClose={() => setSelectedFileForModal(null)}
        />
      )}

      {selectedConceptForModal && (
        <ConceptModal
          concept={selectedConceptForModal}
          isKnown={knownConcepts[selectedConceptForModal.name]}
          onToggleKnown={toggleConceptKnown}
          onClose={() => setSelectedConceptForModal(null)}
        />
      )}

      <AIChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        issue={issue}
        repository={repository}
        contextFiles={contextFiles}
      />
    </div>
  );
}
