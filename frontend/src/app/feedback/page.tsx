'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Award, CheckCircle, ArrowRight, XCircle, RotateCcw,
  AlertTriangle, FileText, CheckCircle2, Sparkles, TrendingUp, Brain
} from 'lucide-react';

interface FinalFeedback {
  summary: string;
  strengths: string[];
  gaps: string[];
  next: string[];
}

function ScoreRing({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color = score >= 90 ? '#10b981' : score >= 75 ? '#6366f1' : score >= 60 ? '#f59e0b' : '#f43f5e';

  return (
    <div className="relative flex items-center justify-center w-40 h-40">
      <svg className="absolute rotate-[-90deg]" width="160" height="160">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="rgba(148,163,184,0.08)" strokeWidth="10" />
        <circle
          cx="80" cy="80" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.2s ease-out', filter: `drop-shadow(0 0 8px ${color}80)` }}
        />
      </svg>
      <div className="text-center z-10">
        <p className="text-4xl font-black" style={{ color }}>{score}</p>
        <p className="text-xs text-slate-500 font-semibold">/ 100</p>
      </div>
    </div>
  );
}

function FeedbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  const [feedback,       setFeedback]       = useState<FinalFeedback | null>(null);
  const [overallScore,   setOverallScore]   = useState<number | null>(null);
  const [candidateName,  setCandidateName]  = useState<string>('Candidate');
  const [candidateRole,  setCandidateRole]  = useState<string>('Software Engineer');
  const [loading,        setLoading]        = useState(true);
  const [mounted,        setMounted]        = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!sessionId) { router.push('/'); return; }

    async function loadFeedback() {
      try {
        setLoading(true);
        const storedFeedback = localStorage.getItem(`feedback_${sessionId}`);
        const res = await fetch(`http://localhost:5000/api/interview/${sessionId}`);
        if (res.ok) {
          const state = await res.json();
          setOverallScore(state.overallScore || 75);
          setCandidateName(state.candidateName || 'Candidate');
          setCandidateRole(state.candidateRole || 'Software Engineer');
          if (state.finalFeedback) setFeedback(state.finalFeedback);
          else if (storedFeedback) setFeedback(JSON.parse(storedFeedback));
        } else if (storedFeedback) {
          setFeedback(JSON.parse(storedFeedback));
          setOverallScore(80);
        }
      } catch {
        console.error('Error loading feedback');
      } finally {
        setLoading(false);
      }
    }
    loadFeedback();
  }, [sessionId]);

  const handleRestart = () => {
    if (sessionId) {
      localStorage.removeItem(`session_${sessionId}`);
      localStorage.removeItem(`feedback_${sessionId}`);
    }
    router.push('/');
  };

  const getScoreConfig = (score: number) => {
    if (score >= 90) return { label: 'Excellent Candidate', color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' };
    if (score >= 75) return { label: 'Strong Fit',          color: 'text-indigo-400',  border: 'border-indigo-500/30',  bg: 'bg-indigo-500/10'  };
    if (score >= 60) return { label: 'Needs Improvement',   color: 'text-amber-400',   border: 'border-amber-500/30',   bg: 'bg-amber-500/10'   };
    return             { label: 'Critical Revision',       color: 'text-rose-400',    border: 'border-rose-500/30',    bg: 'bg-rose-500/10'    };
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#020408] text-slate-100 p-6 min-h-screen">
        <div className="relative mb-6">
          <div className="w-16 h-16 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <Brain className="w-6 h-6 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
        </div>
        <p className="text-slate-400 text-sm font-medium">Generating your technical evaluation report...</p>
        <p className="text-slate-600 text-xs mt-1">Analyzing your responses with AI</p>
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#020408] text-slate-100 p-6 min-h-screen">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-amber-400" />
        </div>
        <h2 className="text-xl font-bold mb-2">No Report Found</h2>
        <p className="text-slate-500 text-sm mb-6 text-center max-w-sm">We could not load the evaluation report for this session.</p>
        <button onClick={handleRestart} className="px-6 py-3 rounded-2xl font-semibold text-sm text-white transition-all" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          Back to Home
        </button>
      </div>
    );
  }

  const scoreConfig = overallScore !== null ? getScoreConfig(overallScore) : null;

  return (
    <div className={`relative min-h-screen bg-[#020408] text-slate-100 overflow-hidden ${mounted ? 'animate-fade-in' : 'opacity-0'}`}>
      {/* Ambient */}
      <div className="absolute top-[-200px] left-[-200px] w-[500px] h-[500px] rounded-full bg-indigo-700 blur-3xl opacity-10 pointer-events-none animate-glow-pulse" />
      <div className="absolute bottom-[-200px] right-[-200px] w-[400px] h-[400px] rounded-full bg-violet-700 blur-3xl opacity-10 pointer-events-none animate-glow-pulse" style={{ animationDelay: '1.5s' }} />

      {/* Grid */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: `linear-gradient(rgba(148,163,184,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.5) 1px, transparent 1px)`, backgroundSize: '60px 60px' }} />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-12 space-y-8">

        {/* ── HEADER ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-slate-800/60 animate-slide-up">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-widest mb-3">
              <Sparkles className="w-3 h-3" /> Evaluation Complete
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Interview Report
            </h1>
            <p className="text-slate-400 mt-2 text-sm">
              Candidate: <span className="font-bold text-slate-200">{candidateName}</span>
              <span className="text-slate-600 mx-2">·</span>
              <span className="text-slate-500">{candidateRole}</span>
            </p>
          </div>
          <button
            id="restart-btn"
            onClick={handleRestart}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl glass border border-slate-700/60 text-sm font-semibold text-slate-300 hover:border-indigo-500/40 hover:text-indigo-300 transition-all duration-200 shrink-0"
          >
            <RotateCcw className="w-4 h-4" /> New Interview
          </button>
        </div>

        {/* ── SCORE + SUMMARY ── */}
        <div className="grid md:grid-cols-4 gap-6 animate-slide-up delay-100">
          {overallScore !== null && scoreConfig && (
            <div className="md:col-span-1 glass rounded-3xl gradient-border p-6 flex flex-col items-center justify-center gap-4">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-600">Overall Score</p>
              <ScoreRing score={overallScore} />
              <span className={`px-4 py-1.5 rounded-full text-xs font-bold border ${scoreConfig.border} ${scoreConfig.bg} ${scoreConfig.color}`}>
                {scoreConfig.label}
              </span>
            </div>
          )}

          <div className={`glass rounded-3xl gradient-border p-6 ${overallScore !== null ? 'md:col-span-3' : 'md:col-span-4'}`}>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" /> Evaluation Summary
            </h3>
            <p className="text-slate-300 text-base leading-8 whitespace-pre-line">{feedback.summary}</p>
          </div>
        </div>

        {/* ── STRENGTHS + GAPS ── */}
        <div className="grid md:grid-cols-2 gap-6 animate-slide-up delay-200">
          {/* Strengths */}
          <div className="glass rounded-3xl p-6 space-y-4 border border-emerald-500/10">
            <h2 className="text-base font-bold flex items-center gap-2 pb-3 border-b border-slate-800/60">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              </div>
              Demonstrated Strengths
            </h2>
            <ul className="space-y-3">
              {feedback.strengths.length > 0 ? feedback.strengths.map((str, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-300 leading-relaxed p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 hover:border-emerald-500/20 transition-all">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  {str}
                </li>
              )) : (
                <p className="text-slate-600 text-sm">No specific strengths recorded.</p>
              )}
            </ul>
          </div>

          {/* Gaps */}
          <div className="glass rounded-3xl p-6 space-y-4 border border-amber-500/10">
            <h2 className="text-base font-bold flex items-center gap-2 pb-3 border-b border-slate-800/60">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <XCircle className="w-4 h-4 text-amber-400" />
              </div>
              Knowledge Gaps
            </h2>
            <ul className="space-y-3">
              {feedback.gaps.length > 0 ? feedback.gaps.map((gap, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-300 leading-relaxed p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 hover:border-amber-500/20 transition-all">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  {gap}
                </li>
              )) : (
                <p className="text-slate-600 text-sm">No critical gaps — great performance!</p>
              )}
            </ul>
          </div>
        </div>

        {/* ── REVISION PLAN ── */}
        <div className="glass rounded-3xl p-6 space-y-5 animate-slide-up delay-300">
          <h2 className="text-base font-bold flex items-center gap-2 pb-3 border-b border-slate-800/60">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
            </div>
            Recommended Revision Plan
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {feedback.next.map((step, i) => (
              <div key={i} className="relative overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/60 p-5 flex flex-col justify-between gap-4 hover:border-indigo-500/30 transition-all duration-200 group">
                {/* Step number */}
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                    Step {String(i + 1).padStart(2, '0')}
                  </span>
                  <Award className="w-4 h-4 text-slate-700 group-hover:text-indigo-500 transition-colors" />
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{step}</p>
                <button
                  onClick={handleRestart}
                  className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors group/btn"
                >
                  Start New Session
                  <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-700 animate-slide-up delay-400">
          AI Interview Agent · ABTalks AI Engineering Cohort · Powered by Google Gemini
        </p>
      </div>
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex flex-col items-center justify-center bg-[#020408] text-slate-100 p-6 min-h-screen">
        <div className="w-12 h-12 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Loading Technical Evaluation Report...</p>
      </div>
    }>
      <FeedbackContent />
    </Suspense>
  );
}
