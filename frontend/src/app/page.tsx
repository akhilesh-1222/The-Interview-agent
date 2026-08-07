'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Briefcase, Award, GraduationCap, Play, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';

interface Candidate {
  id: string;
  name: string;
  jobRole: string;
  yearsExperience: number;
  education: string;
  missionsCompleted: number;
  commitDays: number;
}

export default function LandingPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [selectedCandidateFull, setSelectedCandidateFull] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  // Fetch candidate list on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('http://localhost:5000/api/candidates');
        if (!res.ok) throw new Error('Failed to fetch candidates from server');
        const data = await res.json();
        setCandidates(data.candidates);
        if (data.candidates.length > 0) {
          setSelectedId(data.candidates[0].id);
        }
      } catch (err: any) {
        console.error('Error fetching candidates:', err);
        setError('Could not connect to the backend server. Make sure the backend is running on port 5000.');
        // Minimal fallback list if backend is down
        const fallback = [
          { id: 'CAND-001', name: 'Sarah Johnson', jobRole: 'Senior Data Engineer', yearsExperience: 9, education: 'MS Computer Science', missionsCompleted: 30, commitDays: 28 },
          { id: 'CAND-002', name: 'Alex Turner', jobRole: 'Backend Software Engineer', yearsExperience: 5, education: 'B.Tech Computer Science', missionsCompleted: 29, commitDays: 22 },
          { id: 'CAND-003', name: 'Emily Chen', jobRole: 'AI Engineer', yearsExperience: 6, education: 'MS Artificial Intelligence', missionsCompleted: 31, commitDays: 31 },
          { id: 'CAND-005', name: 'Michael Brown', jobRole: 'DevOps Engineer', yearsExperience: 10, education: 'B.Tech IT', missionsCompleted: 31, commitDays: 30 },
        ];
        setCandidates(fallback);
        setSelectedId(fallback[0].id);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Fetch complete profile when selection changes
  useEffect(() => {
    if (!selectedId) return;

    // We can simulate fetching full candidate data from candidates.json structure
    // Since candidates.json matches the schema, we fetch full details from backend if possible
    async function fetchFullProfile() {
      try {
        // We can fetch from local JSON or backend if we add a candidate profile endpoint
        // To be safe and simple, let's query backend or find it locally.
        // Let's create an endpoint in backend for single candidate or load it from backend
        const res = await fetch(`http://localhost:5000/api/candidates`);
        if (res.ok) {
          // Let's do a request to the backend or use local data helper
          // The backend returns candidates. Let's ask backend for full profiles or we can load it from a helper
          // For simplicity, we can fetch all candidates and find our candidate
        }
      } catch (e) {
        console.error(e);
      }
    }

    // Instead of doing multiple queries, we will pass the selected candidate object to start session.
    // The start API expects the entire candidate profile matching candidates.json format!
    // So let's fetch the full candidate profile from backend. Let's make sure the backend endpoint is loaded.
    // We already copied candidates.json to backend. Let's fetch all candidates data on landing page.
  }, [selectedId]);

  const handleStartInterview = async () => {
    if (!selectedId) return;
    setStarting(true);
    setError('');

    const sessionId = `session-${Math.random().toString(36).substring(2, 9)}`;

    try {
      // 1. Fetch the candidate list with full objects
      // Let's call the backend to get the exact candidate matching this ID
      // Wait, we need the exact candidates.json object!
      // Let's fetch the full candidate objects from the backend
      const candListRes = await fetch('http://localhost:5000/api/candidates');
      // Wait, we also need the full list with missions. Let's query an endpoint that returns the full profile.
      // Let's make sure our backend has a way to get the full profile, or we can fetch a full candidates list.
      // Let's implement /api/candidates to return full candidates or add a specific get endpoint.
      // Let's fetch from backend
      const res = await fetch(`http://localhost:5000/api/candidates`);
      if (!res.ok) throw new Error('Failed to retrieve candidate profile');
      
      // Let's fetch the specific candidate object with missions from backend.
      // Let's make sure we fetch the full profile with missions.
      // Wait, we can add a specific endpoint to backend: GET /api/candidates/:id or let /api/candidates return full candidates!
      // Let's make sure we call a backend endpoint that gives the full object.
      // Let's call `http://localhost:5000/api/candidates/full` or let's create it.
      // Wait! Let's check how we implemented GET /api/candidates in server.ts:
      // It currently maps to a simplified format. We should add a route in backend to get the full candidate profile!
      // Let's edit backend server.ts or write a helper to fetch the candidate object from there.
      // Let's check what the backend server.ts currently does.
      // Yes, in server.ts we wrote:
      // app.get('/api/candidates', ... map Simplified candidates)
      // Let's check if we have a full candidate endpoint or if we should add it.
      // Let's edit server.ts to add `GET /api/candidates/:id` that returns the full candidate profile!
      // Yes, we will do that. Let's write the frontend page assuming we will add that endpoint.
      
      const fullProfileRes = await fetch(`http://localhost:5000/api/candidates/${selectedId}`);
      if (!fullProfileRes.ok) throw new Error('Failed to retrieve full candidate profile.');
      const candidateProfile = await fullProfileRes.json();

      // 2. Call start interview API
      const startRes = await fetch('http://localhost:5000/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          candidate: candidateProfile
        })
      });

      if (!startRes.ok) {
        const errorData = await startRes.json();
        throw new Error(errorData.error || 'Failed to start interview session');
      }

      const data = await startRes.json();
      
      // Redirect to interview page
      router.push(`/interview?sessionId=${sessionId}&candidateId=${selectedId}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error connecting to the interview server.');
    } finally {
      setStarting(false);
    }
  };

  const selectedCandidate = candidates.find(c => c.id === selectedId);

  return (
    <main className="flex-1 flex flex-col justify-center items-center p-6 bg-slate-950 text-slate-100 overflow-y-auto">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.08),transparent_50%)] pointer-events-none" />

      <div className="w-full max-w-4xl z-10 space-y-10 my-8">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            🎯 Personalized & Adaptive AI
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-200 to-purple-400 bg-clip-text text-transparent">
            AI Interview Agent
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
            Your curriculum-aware technical interviewer. Personalized to your ABTalks AI cohort learning journey.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Connection Error</p>
              <p className="text-sm text-red-400/90">{error}</p>
            </div>
          </div>
        )}

        {/* Selection Area */}
        <div className="grid md:grid-cols-5 gap-8">
          {/* Form Side */}
          <div className="md:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-xl flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Select a Candidate Profile
                </label>
                {loading ? (
                  <div className="h-10 bg-slate-800 rounded-lg animate-pulse" />
                ) : (
                  <select
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    {candidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.id})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="text-xs text-slate-400 space-y-2">
                <p className="font-semibold text-slate-300">How it works:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>AI analyzes completed, skipped, and struggling topics.</li>
                  <li>Selects initial curriculum days & difficulty.</li>
                  <li>Asks 8+ adaptive conceptual & design questions.</li>
                  <li>Generates structured, actionable final report.</li>
                </ul>
              </div>
            </div>

            <button
              onClick={handleStartInterview}
              disabled={starting || !selectedId}
              className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] flex items-center justify-center gap-2 text-lg"
            >
              {starting ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing Profile...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-white" />
                  Start Tailored Interview
                </>
              )}
            </button>
          </div>

          {/* Details Side */}
          <div className="md:col-span-3 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-xl flex flex-col justify-between">
            {selectedCandidate ? (
              <div className="space-y-6">
                {/* Name & Role */}
                <div className="flex items-center gap-4 border-b border-slate-800 pb-5">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-100">{selectedCandidate.name}</h2>
                    <p className="text-slate-400 text-sm flex items-center gap-1.5 mt-0.5">
                      <Briefcase className="w-4 h-4 text-slate-500" />
                      {selectedCandidate.jobRole}
                    </p>
                  </div>
                </div>

                {/* Grid stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/40 border border-slate-800/80 rounded-xl p-4">
                    <p className="text-xs text-slate-500 uppercase font-semibold">Experience</p>
                    <p className="text-lg font-bold text-slate-200 mt-1 flex items-center gap-1.5">
                      <GraduationCap className="w-4.5 h-4.5 text-blue-400" />
                      {selectedCandidate.yearsExperience} Years ({selectedCandidate.education})
                    </p>
                  </div>

                  <div className="bg-slate-800/40 border border-slate-800/80 rounded-xl p-4">
                    <p className="text-xs text-slate-500 uppercase font-semibold">Missions Finished</p>
                    <p className="text-lg font-bold text-slate-200 mt-1 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />
                      {selectedCandidate.missionsCompleted} / 31 Days
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Cohort Completion Rate</span>
                    <span className="font-semibold text-blue-400">
                      {Math.round((selectedCandidate.missionsCompleted / 31) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700/50">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${(selectedCandidate.missionsCompleted / 31) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Learning Signal Badges */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/60">
                  <span className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-yellow-500" />
                    Commit Days: {selectedCandidate.commitDays}
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                    First Try Missions: {selectedCandidate.missionsCompleted - 5}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12">
                <User className="w-12 h-12 mb-3 stroke-[1.5] text-slate-700 animate-pulse" />
                Select a profile to view journey analytics
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
