import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, AlertTriangle, ExternalLink, RotateCcw, BookOpen, ShieldCheck, FileCode, Check, ListChecks } from 'lucide-react';

export default function QuizResults({
  evaluation,
  issue,
  repository,
  relevantFiles = [],
  onRetake,
  onReviewPrep
}) {
  if (!evaluation) return null;

  const {
    score,
    scorePercentage,
    isPrepared,
    headline,
    verdict,
    disclaimer,
    breakdown = [],
    reviewTopics = [],
    nextSteps = []
  } = evaluation;

  useEffect(() => {
    if (isPrepared) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // Safe fallback if canvas not available
      }
    }
  }, [isPrepared]);

  const primaryStartFile = relevantFiles[0]?.path || 'Source files identified in dashboard';
  const testFile = relevantFiles.find(f => f.path.includes('test') || f.path.includes('spec'))?.path || 'Repository test suite';

  return (
    <div id="quiz-results-section" className="space-y-8 animate-fadeIn">
      {/* Main Verdict Card */}
      <div className={`p-6 sm:p-8 rounded-2xl border shadow-2xl relative overflow-hidden ${
        isPrepared
          ? 'bg-gradient-to-b from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/40'
          : 'bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-900 border-amber-500/40'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-800 gap-4">
          <div className="flex items-center space-x-3.5">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              isPrepared ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              {isPrepared ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                isPrepared
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              }`}>
                Readiness Evaluation
              </span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                {headline}
              </h3>
            </div>
          </div>

          {/* Score Badge */}
          <div className="text-right sm:text-center px-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 shrink-0">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Score</span>
            <span className="text-xl font-mono font-extrabold text-emerald-400">{score}</span>
            <span className="text-[11px] text-slate-500 ml-1">({scorePercentage}%)</span>
          </div>
        </div>

        {/* Verdict text */}
        <p className="text-sm sm:text-base text-slate-200 leading-relaxed mb-4">
          {verdict}
        </p>

        {/* Important Disclaimer */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{disclaimer}</span>
        </div>
      </div>

      {/* Contribution Launchpad (Section 19) */}
      {isPrepared && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center space-x-2 mb-6">
            <ListChecks className="w-5 h-5 text-emerald-400" />
            <h4 className="text-lg font-bold text-white">Your Contribution Roadmap</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Start Here */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block mb-1">
                01. Start Here
              </span>
              <p className="font-mono text-xs text-white bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 truncate mb-2">
                {primaryStartFile}
              </p>
              <p className="text-xs text-slate-400">
                Contains the primary implementation logic. Inspect where parameters are received and errors are intercepted.
              </p>
            </div>

            {/* Then Inspect */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold block mb-1">
                02. Then Inspect
              </span>
              <p className="font-mono text-xs text-white bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 truncate mb-2">
                {testFile}
              </p>
              <p className="text-xs text-slate-400">
                Study existing test conventions and write a failing reproduction test before implementing your solution.
              </p>
            </div>
          </div>

          {/* Remember Checklist */}
          <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 mb-6">
            <span className="text-xs font-semibold text-slate-300 block mb-2.5">
              Remember maintainer expectations:
            </span>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400">
              <li className="flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Preserve existing backwards compatibility</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Write automated unit/integration tests</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Follow repository linter and formatting rules</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Keep pull request focused on this issue alone</span>
              </li>
            </ul>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {issue?.htmlUrl && (
              <a
                href={issue.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2"
              >
                <span>Open Issue on GitHub</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <button
              onClick={onReviewPrep}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center space-x-2 cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-slate-400" />
              <span>Review Preparation</span>
            </button>

            <button
              onClick={onRetake}
              className="w-full sm:w-auto px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer ml-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake Quiz</span>
            </button>
          </div>
        </div>
      )}

      {/* Review Topics If Gaps Found */}
      {reviewTopics.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          <h4 className="text-base font-bold text-amber-400 mb-4 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Recommended Concepts to Review First</span>
          </h4>
          <div className="space-y-3">
            {reviewTopics.map((topic, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1.5">
                <p className="font-semibold text-slate-200">{topic.question}</p>
                <p className="text-emerald-400">
                  <span className="font-bold">Correct approach:</span> {topic.correctAnswer}
                </p>
                <p className="text-slate-400">{topic.explanation}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={onReviewPrep}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              Review Preparation Steps
            </button>
            <button
              onClick={onRetake}
              className="px-5 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 text-xs font-semibold transition-colors cursor-pointer"
            >
              Retake Readiness Check
            </button>
          </div>
        </div>
      )}

      {/* Detailed Question Breakdown */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
        <h4 className="text-sm font-bold text-slate-300 mb-4">
          Detailed Question Breakdown
        </h4>
        <div className="space-y-3">
          {breakdown.map((item, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border text-xs ${
                item.isCorrect
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-300'
                  : 'bg-red-950/20 border-red-500/30 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[10px] text-slate-500">Question {idx + 1}</span>
                <span className={`text-[10px] font-bold uppercase ${
                  item.isCorrect ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {item.isCorrect ? '✓ Correct' : '✕ Missed'}
                </span>
              </div>
              <p className="font-semibold text-slate-100 mb-2">{item.question}</p>
              <div className="text-[11px] space-y-1 mb-2">
                <p className="text-slate-400">
                  Your answer: <span className={item.isCorrect ? 'text-emerald-300' : 'text-red-300'}>{item.userAnswer || 'None selected'}</span>
                </p>
                {!item.isCorrect && (
                  <p className="text-emerald-400">
                    Correct answer: {item.correctAnswer}
                  </p>
                )}
              </div>
              <p className="text-slate-400 text-[11px] bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
                {item.explanation}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
