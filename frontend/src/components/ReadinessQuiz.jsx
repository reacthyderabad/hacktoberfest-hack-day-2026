import React, { useState } from 'react';
import { HelpCircle, CheckCircle, ArrowRight, ArrowLeft, Send, Sparkles, AlertCircle } from 'lucide-react';

export default function ReadinessQuiz({ quiz = [], onEvaluate, isEvaluating }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});

  if (!quiz || quiz.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 bg-slate-900 rounded-2xl border border-slate-800">
        <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
        <p>No readiness quiz generated for this issue.</p>
      </div>
    );
  }

  const currentQ = quiz[currentIndex];
  const totalQuestions = quiz.length;
  const answeredCount = Object.keys(selectedAnswers).length;
  const isComplete = answeredCount === totalQuestions;

  const handleSelectOption = (optionText) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [currentIndex]: optionText
    }));
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = () => {
    const formattedAnswers = quiz.map((_, idx) => selectedAnswers[idx] || null);
    onEvaluate(formattedAnswers);
  };

  return (
    <div id="readiness-quiz-container" className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
      {/* Quiz Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Interactive Ready Check
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Repository-Specific Evaluation
            </span>
          </div>
          <h3 className="text-xl font-bold text-white mt-1">
            Test Your Contribution Readiness
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            These questions validate that you understand the relevant files, architecture, and issue requirements.
          </p>
        </div>

        {/* Progress Tracker */}
        <div className="flex items-center space-x-2">
          <div className="text-right">
            <p className="text-xs font-mono text-slate-400">
              Question <span className="text-emerald-400 font-bold">{currentIndex + 1}</span> of {totalQuestions}
            </p>
            <p className="text-[10px] text-slate-500">
              {answeredCount} answered
            </p>
          </div>
          <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stepper Pills */}
      <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-2">
        {quiz.map((_, idx) => {
          const isCurrent = idx === currentIndex;
          const hasAnswer = selectedAnswers[idx] !== undefined;

          return (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                isCurrent
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                  : hasAnswer
                  ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Q{idx + 1}
            </button>
          );
        })}
      </div>

      {/* Question Card */}
      <div className="mb-8">
        <h4 className="text-base sm:text-lg font-semibold text-slate-100 mb-6 leading-relaxed flex items-start space-x-3">
          <span className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs font-mono shrink-0 mt-0.5">
            {currentIndex + 1}
          </span>
          <span>{currentQ.question}</span>
        </h4>

        {/* Options */}
        <div className="space-y-3">
          {currentQ.options.map((option, optIdx) => {
            const isSelected = selectedAnswers[currentIndex] === option;
            const optionLetter = String.fromCharCode(65 + optIdx);

            return (
              <div
                key={optIdx}
                onClick={() => handleSelectOption(option)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center space-x-3.5 group ${
                  isSelected
                    ? 'bg-emerald-950/30 border-emerald-500/60 shadow-lg shadow-emerald-950/20 text-emerald-100'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-slate-100'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono transition-colors shrink-0 ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-200'
                }`}>
                  {optionLetter}
                </div>
                <span className="text-sm font-medium leading-normal flex-1">
                  {option}
                </span>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  isSelected ? 'border-emerald-400 bg-emerald-500' : 'border-slate-700'
                }`}>
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation & Submit Bar */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-800">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>

        <div className="flex items-center space-x-3">
          {currentIndex < totalQuestions - 1 ? (
            <button
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <span>Next Question</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isEvaluating}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-2 cursor-pointer ${
                isComplete
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25 animate-pulse'
                  : 'bg-emerald-600/70 hover:bg-emerald-600 text-slate-950'
              }`}
            >
              {isEvaluating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Evaluating with AI...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit & Check Readiness</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
