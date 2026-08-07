'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Award, CheckCircle, ArrowRight, XCircle, RotateCcw, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';

interface FinalFeedback {
  summary: string;
  strengths: string[];
  gaps: string[];
  next: string[];
}

function FeedbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  const [feedback, setFeedback] = useState<FinalFeedback | null>(null);
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [candidateName, setCandidateName] = useState<string>('Candidate');
  const [candidateRole, setCandidateRole] = useState<string>('Software Engineer');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      router.push('/');
      return;
    }

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
          
          if (state.finalFeedback) {
            setFeedback(state.finalFeedback);
          } else if (storedFeedback) {
            setFeedback(JSON.parse(storedFeedback));
          }
        } else if (storedFeedback) {
          setFeedback(JSON.parse(storedFeedback));
          setOverallScore(80); // Fallback
        }
      } catch (err) {
        console.error('Error loading feedback:', err);
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

  const getScoreRating = (score: number) => {
    if (score >= 90) return { label: 'Excellent Candidate', color: 'text-emerald-400', border: 'border-emerald-500/30 bg-emerald-500/10' };
    if (score >= 75) return { label: 'Strong Fit', color: 'text-blue-400', border: 'border-blue-500/30 bg-blue-500/10' };
    if (score >= 60) return { label: 'Needs Improvement', color: 'text-yellow-400', border: 'border-yellow-500/30 bg-yellow-500/10' };
    return { label: 'Critical Revision Needed', color: 'text-red-400', border: 'border-red-500/30 bg-red-500/10' };
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 text-slate-100 p-6">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-slate-400">Generating Technical Evaluation Report...</p>
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 text-slate-100 p-6">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">No Report Found</h2>
        <p className="text-slate-400 mb-6">We could not load the evaluation report for this session.</p>
        <button onClick={handleRestart} className="px-5 py-2.5 bg-blue-600 rounded-xl font-semibold hover:bg-blue-500">
          Back to Home
        </button>
      </div>
    );
  }

  const rating = overallScore !== null ? getScoreRating(overallScore) : null;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100 p-6 md:p-12 relative">
      <div className="absolute top-0 inset-x-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.06),transparent_50%)] pointer-events-none h-full" />

      <div className="max-w-5xl mx-auto space-y-8 z-10 relative my-8">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">Interview Evaluation</h1>
            <p className="text-slate-400 mt-1.5">
              Candidate: <span className="font-semibold text-slate-200">{candidateName}</span> ({candidateRole})
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRestart}
              className="px-5 py-3 rounded-xl border border-slate-850 hover:bg-slate-900 transition-all text-sm font-semibold flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Restart Interview
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {overallScore !== null && (
            <div className="md:col-span-1 bg-slate-900 border border-slate-850 rounded-2xl p-6 flex flex-col items-center justify-center shadow-xl">
              <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">Overall Score</span>
              <span className="text-6xl font-extrabold text-blue-400 mt-3">{overallScore}</span>
              <span className="text-sm font-semibold text-slate-500 mt-1">/ 100</span>
              {rating && (
                <span className={`mt-4 px-3 py-1 rounded-full text-xs font-semibold border ${rating.border} ${rating.color}`}>
                  {rating.label}
                </span>
              )}
            </div>
          )}

          <div className={`bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-xl flex flex-col justify-center ${
            overallScore !== null ? 'md:col-span-3' : 'md:col-span-4'
          }`}>
            <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-3 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-400" /> Evaluation Summary
            </h3>
            <p className="text-slate-300 text-base leading-relaxed whitespace-pre-line">
              {feedback.summary}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 pt-4">
          
          <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
              <CheckCircle className="w-5 h-5 text-emerald-400" /> Demonstrated Strengths
            </h2>
            <ul className="space-y-3">
              {feedback.strengths.map((str, index) => (
                <li key={index} className="flex items-start gap-3 text-sm text-slate-350 leading-relaxed bg-slate-900/40 p-3 rounded-lg border border-slate-850/50">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  {str}
                </li>
              ))}
              {feedback.strengths.length === 0 && (
                <p className="text-slate-500 text-sm">No specific strengths recorded.</p>
              )}
            </ul>
          </div>

          <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
              <XCircle className="w-5 h-5 text-yellow-500" /> Identified Knowledge Gaps
            </h2>
            <ul className="space-y-3">
              {feedback.gaps.map((gap, index) => (
                <li key={index} className="flex items-start gap-3 text-sm text-slate-350 leading-relaxed bg-slate-900/40 p-3 rounded-lg border border-slate-850/50">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                  {gap}
                </li>
              ))}
              {feedback.gaps.length === 0 && (
                <p className="text-slate-500 text-sm">No critical gaps recorded. Great job!</p>
              )}
            </ul>
          </div>

        </div>

        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
            <Award className="w-5 h-5 text-indigo-400" /> Recommended Revision plan
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {feedback.next.map((step, index) => (
              <div key={index} className="p-4 rounded-xl border border-slate-850 bg-slate-950 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                    Step {index + 1}
                  </span>
                  <p className="text-sm text-slate-300 font-medium leading-relaxed pt-1.5">{step}</p>
                </div>
                <div className="flex items-center text-xs text-blue-400 font-semibold gap-1 group cursor-pointer" onClick={() => router.push('/')}>
                  Go to Home
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={
      <main className="flex-1 flex flex-col items-center justify-center bg-slate-950 text-slate-100 p-6">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-slate-400">Loading Technical Evaluation Report...</p>
      </main>
    }>
      <FeedbackContent />
    </Suspense>
  );
}
