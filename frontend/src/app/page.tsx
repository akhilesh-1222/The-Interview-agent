'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  User, Briefcase, Award, GraduationCap, Play, CheckCircle2,
  AlertCircle, Sparkles, Zap, Brain, ChevronDown, Shield, Clock
} from 'lucide-react';

interface Candidate {
  id: string;
  name: string;
  jobRole: string;
  yearsExperience: number;
  education: string;
  missionsCompleted: number;
  commitDays: number;
}

const FEATURES = [
  { icon: Brain,   label: 'Adaptive AI',       desc: 'Analyzes your exact learning profile' },
  { icon: Zap,     label: 'Instant Insights',   desc: 'Real-time difficulty calibration' },
  { icon: Shield,  label: 'Structured Report',  desc: 'Actionable feedback on every topic' },
  { icon: Clock,   label: '30-min Session',     desc: '8+ conceptual & design questions' },
];

function ParticleOrb({ className }: { className?: string }) {
  return (
    <div className={`absolute rounded-full blur-3xl opacity-20 animate-glow-pulse pointer-events-none ${className}`} />
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    async function fetchData() {
      try {
        const res = await fetch('http://localhost:5000/api/candidates');
        if (!res.ok) throw new Error('Failed to fetch candidates from server');
        const data = await res.json();
        setCandidates(data.candidates);
        if (data.candidates.length > 0) setSelectedId(data.candidates[0].id);
      } catch {
        const fallback = [
          { id: 'CAND-001', name: 'Sarah Johnson',  jobRole: 'Senior Data Engineer',     yearsExperience: 9,  education: 'MS Computer Science',    missionsCompleted: 30, commitDays: 28 },
          { id: 'CAND-002', name: 'Alex Turner',    jobRole: 'Backend Software Engineer', yearsExperience: 5,  education: 'B.Tech Computer Science', missionsCompleted: 29, commitDays: 22 },
          { id: 'CAND-003', name: 'Emily Chen',     jobRole: 'AI Engineer',               yearsExperience: 6,  education: 'MS Artificial Intelligence', missionsCompleted: 31, commitDays: 31 },
          { id: 'CAND-005', name: 'Michael Brown',  jobRole: 'DevOps Engineer',           yearsExperience: 10, education: 'B.Tech IT',               missionsCompleted: 31, commitDays: 30 },
        ];
        setCandidates(fallback);
        setSelectedId(fallback[0].id);
        setError('Backend offline — showing demo profiles.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleStartInterview = async () => {
    if (!selectedId) return;
    setStarting(true);
    setError('');
    const sessionId = `session-${Math.random().toString(36).substring(2, 9)}`;
    try {
      const fullProfileRes = await fetch(`http://localhost:5000/api/candidates/${selectedId}`);
      if (!fullProfileRes.ok) throw new Error('Failed to retrieve full candidate profile.');
      const candidateProfile = await fullProfileRes.json();

      const startRes = await fetch('http://localhost:5000/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, candidate: candidateProfile }),
      });
      if (!startRes.ok) {
        const errorData = await startRes.json();
        throw new Error(errorData.error || 'Failed to start interview session');
      }
      const data = await startRes.json();
      localStorage.setItem(`session_${sessionId}`, JSON.stringify({
        messages: [{ role: 'interviewer', content: data.reply, timestamp: new Date().toISOString() }],
        currentTopic: 'AI Interview', currentDay: null, currentDifficulty: 'medium', questionCount: 1, isFollowUp: false,
      }));
      router.push(`/interview?sessionId=${sessionId}&candidateId=${selectedId}`);
    } catch (err: any) {
      setError(err.message || 'Error connecting to the interview server.');
    } finally {
      setStarting(false);
    }
  };

  const selected = candidates.find(c => c.id === selectedId);
  const completionPct = selected ? Math.round((selected.missionsCompleted / 31) * 100) : 0;

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();

  const avatarColors: Record<string, string> = {
    'CAND-001': 'from-violet-500 to-purple-700',
    'CAND-002': 'from-cyan-500 to-blue-700',
    'CAND-003': 'from-emerald-500 to-teal-700',
    'CAND-004': 'from-rose-500 to-pink-700',
    'CAND-005': 'from-orange-500 to-amber-700',
  };
  const avatarGradient = selected ? (avatarColors[selected.id] || 'from-indigo-500 to-violet-700') : 'from-slate-700 to-slate-900';

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#020408] text-slate-100">

      {/* ── Ambient Orbs ─── */}
      <ParticleOrb className="w-[600px] h-[600px] bg-indigo-600 top-[-200px] left-[-200px]" />
      <ParticleOrb className="w-[500px] h-[500px] bg-violet-700 bottom-[-150px] right-[-150px]" />
      <ParticleOrb className="w-[300px] h-[300px] bg-cyan-600 top-[30%] right-[10%]" />

      {/* ── Grid Overlay ─── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(rgba(148,163,184,0.5) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(148,163,184,0.5) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* ── Noise Texture ─── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}
      />

      <div className={`relative z-10 w-full max-w-5xl px-4 py-16 space-y-12 ${mounted ? 'animate-fade-in' : 'opacity-0'}`}>

        {/* ── HEADER ──────────────────────────────── */}
        <div className="text-center space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-widest animate-slide-up">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            ABTalks AI Cohort · Adaptive Interviewer
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          </div>

          {/* Title */}
          <div className="animate-slide-up delay-100 space-y-2">
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-none">
              <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                AI Interview
              </span>
              <br />
              <span
                className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent animate-aurora"
                style={{ backgroundSize: '300% 300%' }}
              >
                Agent
              </span>
            </h1>
          </div>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed animate-slide-up delay-200">
            Your curriculum-aware technical interviewer. Personalized to your{' '}
            <span className="text-indigo-300 font-semibold">ABTalks AI cohort</span>{' '}
            learning journey.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 animate-slide-up delay-300">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 px-3 py-1 rounded-full glass border border-slate-700/60 text-slate-400 text-xs font-medium hover:border-indigo-500/40 hover:text-indigo-300 transition-all duration-200">
                <Icon className="w-3.5 h-3.5" />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* ── ERROR BANNER ─── */}
        {error && (
          <div className="animate-slide-up mx-auto max-w-xl p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-amber-300 flex items-start gap-3 glass">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* ── MAIN CARD GRID ─── */}
        <div className="grid lg:grid-cols-5 gap-6 animate-slide-up delay-400">

          {/* ── LEFT: Selector Card ─── */}
          <div className="lg:col-span-2 glass rounded-3xl p-6 flex flex-col gap-6 gradient-border shadow-2xl">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Select Candidate</p>

              {/* Custom Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  id="candidate-select-btn"
                  onClick={() => setDropdownOpen(o => !o)}
                  disabled={loading}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl bg-slate-900/80 border border-slate-700/60 text-slate-100 text-sm font-medium hover:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all duration-200 disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    {loading ? (
                      <div className="w-7 h-7 rounded-full bg-slate-800 animate-pulse" />
                    ) : selected ? (
                      <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-[10px] font-black text-white shrink-0`}>
                        {getInitials(selected.name)}
                      </div>
                    ) : null}
                    <span>{loading ? 'Loading profiles...' : (selected?.name || 'Select a profile')}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 z-50 glass-strong rounded-2xl border border-slate-700/60 shadow-2xl max-h-64 overflow-y-auto">
                    {candidates.map(c => {
                      const grad = avatarColors[c.id] || 'from-indigo-500 to-violet-700';
                      return (
                        <button
                          key={c.id}
                          id={`candidate-option-${c.id}`}
                          onClick={() => { setSelectedId(c.id); setDropdownOpen(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-all duration-150 hover:bg-indigo-500/10 ${c.id === selectedId ? 'bg-indigo-500/15 text-indigo-200' : 'text-slate-300'}`}
                        >
                          <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-[10px] font-black text-white shrink-0`}>
                            {getInitials(c.name)}
                          </div>
                          <div className="overflow-hidden">
                            <p className="font-semibold truncate">{c.name}</p>
                            <p className="text-xs text-slate-500 truncate">{c.id}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* How it works */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">How It Works</p>
              {[
                { step: '01', text: 'AI analyzes completed, skipped & struggling topics' },
                { step: '02', text: 'Selects curriculum days & adjusts difficulty' },
                { step: '03', text: 'Asks 8+ adaptive conceptual & design questions' },
                { step: '04', text: 'Generates structured, actionable final report' },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-start gap-3 group">
                  <span className="text-xs font-black text-indigo-500/60 font-mono mt-0.5 group-hover:text-indigo-400 transition-colors">{step}</span>
                  <p className="text-xs text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">{text}</p>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <button
              id="start-interview-btn"
              onClick={handleStartInterview}
              disabled={starting || !selectedId || loading}
              className="relative w-full overflow-hidden rounded-2xl py-4 px-6 font-bold text-white text-base transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed group"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)',
                backgroundSize: '200% 200%',
              }}
            >
              {/* Shimmer */}
              <div className="absolute inset-0 animate-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              {/* Glow */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: '0 0 40px rgba(99,102,241,0.6), 0 0 80px rgba(99,102,241,0.2)' }} />

              <span className="relative z-10 flex items-center justify-center gap-2.5">
                {starting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Analyzing Profile...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-white" />
                    <span>Start Tailored Interview</span>
                  </>
                )}
              </span>
            </button>
          </div>

          {/* ── RIGHT: Profile Card ─── */}
          <div className="lg:col-span-3 glass rounded-3xl p-6 flex flex-col gap-6 gradient-border shadow-2xl">
            {selected ? (
              <>
                {/* Profile Header */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-xl font-black text-white shadow-lg`}>
                      {getInitials(selected.name)}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#020408] flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-extrabold text-white truncate">{selected.name}</h2>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Briefcase className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <p className="text-sm text-slate-400 truncate">{selected.jobRole}</p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs font-mono text-slate-600">{selected.id}</span>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Experience */}
                  <div className="rounded-2xl bg-slate-900/60 border border-slate-800/60 p-4 hover:border-indigo-500/30 transition-all duration-200 group">
                    <div className="flex items-center gap-2 mb-2">
                      <GraduationCap className="w-4 h-4 text-indigo-400" />
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Experience</p>
                    </div>
                    <p className="text-2xl font-extrabold text-white">{selected.yearsExperience}<span className="text-slate-500 text-sm font-normal ml-1">yrs</span></p>
                    <p className="text-xs text-slate-500 mt-1 truncate">{selected.education}</p>
                  </div>

                  {/* Missions */}
                  <div className="rounded-2xl bg-slate-900/60 border border-slate-800/60 p-4 hover:border-emerald-500/30 transition-all duration-200 group">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Missions</p>
                    </div>
                    <p className="text-2xl font-extrabold text-white">
                      {selected.missionsCompleted}
                      <span className="text-slate-500 text-sm font-normal ml-1">/ 31</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Days completed</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-300">Cohort Completion Rate</span>
                    <span className={`text-sm font-black ${completionPct >= 90 ? 'text-emerald-400' : completionPct >= 70 ? 'text-indigo-400' : 'text-amber-400'}`}>
                      {completionPct}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800/60">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${completionPct}%`,
                        background: completionPct >= 90
                          ? 'linear-gradient(90deg, #10b981, #34d399)'
                          : completionPct >= 70
                          ? 'linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)'
                          : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                      }}
                    />
                  </div>
                </div>

                {/* Badge row */}
                <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-800/40">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700/50 text-slate-300 text-xs font-medium hover:border-yellow-500/30 hover:text-yellow-300 transition-all">
                    <Award className="w-3.5 h-3.5 text-yellow-400" />
                    {selected.commitDays} Commit Days
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700/50 text-slate-300 text-xs font-medium hover:border-emerald-500/30 hover:text-emerald-300 transition-all">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    {Math.max(0, selected.missionsCompleted - 5)} First-Try Missions
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700/50 text-slate-300 text-xs font-medium hover:border-indigo-500/30 hover:text-indigo-300 transition-all">
                    <User className="w-3.5 h-3.5 text-indigo-400" />
                    {selected.id}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-600 py-16 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-center animate-pulse">
                  <User className="w-8 h-8 stroke-[1.5]" />
                </div>
                <p className="text-sm">Select a profile to view analytics</p>
              </div>
            )}
          </div>
        </div>

        {/* ── FOOTER ─── */}
        <p className="text-center text-xs text-slate-700 animate-slide-up delay-500">
          AI Interview Agent · Built for ABTalks AI Engineering Cohort
        </p>
      </div>
    </main>
  );
}
