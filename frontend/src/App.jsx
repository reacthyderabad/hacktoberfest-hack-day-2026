import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar.jsx';
import Hero from './components/Hero.jsx';
import IssueInput from './components/IssueInput.jsx';
import AnalysisProgress from './components/AnalysisProgress.jsx';
import Dashboard from './components/Dashboard.jsx';
import Footer from './components/Footer.jsx';

export default function App() {
  const [currentView, setCurrentView] = useState('landing'); // 'landing' | 'analyzing' | 'dashboard'
  const [systemHealth, setSystemHealth] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState(null);

  // Fetch health and configured AI info on mount
  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(d => setSystemHealth(d))
      .catch(err => console.warn('Could not fetch engine health:', err.message));
  }, []);

  const handleAnalyze = async (issueUrl) => {
    setIsLoading(true);
    setError(null);
    setEvaluation(null);
    setCurrentView('analyzing');

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueUrl })
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to analyze repository issue.');
      }

      setAnalysisData(data);
      setCurrentView('dashboard');
    } catch (err) {
      console.error('Analyze error:', err);
      setError(err.message);
      setCurrentView('landing');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDemo = async (demoId) => {
    setIsLoading(true);
    setError(null);
    setEvaluation(null);
    setCurrentView('analyzing');

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demoId })
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load demo issue.');
      }

      setAnalysisData(data);
      setCurrentView('dashboard');
    } catch (err) {
      console.error('Demo load error:', err);
      setError(err.message);
      setCurrentView('landing');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEvaluateQuiz = async (answers) => {
    if (!analysisData?.analysis?.quiz) return;
    setIsEvaluating(true);

    try {
      const res = await fetch('/api/quiz/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quiz: analysisData.analysis.quiz,
          answers
        })
      });

      const data = await res.json();
      if (data.success && data.evaluation) {
        setEvaluation(data.evaluation);
      } else {
        throw new Error(data.error || 'Evaluation failed.');
      }
    } catch (err) {
      console.error('Evaluation error:', err);
      alert(`Quiz evaluation failed: ${err.message}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleRetakeQuiz = () => {
    setEvaluation(null);
  };

  const handleReset = () => {
    setCurrentView('landing');
    setAnalysisData(null);
    setEvaluation(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToInput = () => {
    if (currentView !== 'landing') {
      setCurrentView('landing');
    }
    setTimeout(() => {
      const el = document.getElementById('issue-input-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const modelDisplay = systemHealth?.ai?.model || 'Open-Weight AI';

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Top Navbar */}
      <Navbar
        onSelectDemo={handleSelectDemo}
        systemHealth={systemHealth}
        onReset={handleReset}
      />

      <main className="flex-1">
        {/* LANDING VIEW */}
        {currentView === 'landing' && (
          <>
            <Hero
              onScrollToInput={scrollToInput}
              onSelectDemo={handleSelectDemo}
            />

            <IssueInput
              onAnalyze={handleAnalyze}
              onSelectDemo={handleSelectDemo}
              isLoading={isLoading}
              error={error}
            />
          </>
        )}

        {/* ANALYZING LOADING VIEW */}
        {currentView === 'analyzing' && (
          <AnalysisProgress
            modelName={modelDisplay}
          />
        )}

        {/* DASHBOARD VIEW */}
        {currentView === 'dashboard' && analysisData && (
          <div className="pt-8">
            <Dashboard
              data={analysisData}
              isDemo={analysisData.isDemo}
              onRetakeQuiz={handleRetakeQuiz}
              onEvaluateQuiz={handleEvaluateQuiz}
              evaluation={evaluation}
              isEvaluating={isEvaluating}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer onReset={handleReset} />
    </div>
  );
}
