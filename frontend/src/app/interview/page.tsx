'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Send, User, Bot, AlertTriangle, BookOpen, Brain, Sparkles, ChevronLeft, Zap, Target } from 'lucide-react';

interface Message {
  role: 'interviewer' | 'candidate';
  content: string;
  timestamp: string;
  topic?: string;
  day?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  isFollowUp?: boolean;
}

const CURRICULUM_DAYS: Record<number, string> = {
  7: 'Embeddings Explained',
  8: 'Vector Databases',
  9: 'Building Vector DB',
  10: 'Retrieval Engine',
  12: 'Prompt Engineering',
  13: 'Advanced Prompting',
  14: 'Fine-Tuning Concepts',
  21: 'Agentic Frameworks',
  22: 'Multi-Agent Systems',
  24: 'Agentic Chatbot',
};

const DIFFICULTY_CONFIG = {
  easy:   { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', dot: 'bg-emerald-400' },
  medium: { color: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/25',  dot: 'bg-violet-400'  },
  hard:   { color: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/25',    dot: 'bg-rose-400'    },
};

function InterviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId   = searchParams.get('sessionId');
  const candidateId = searchParams.get('candidateId');

  const [messages,          setMessages]          = useState<Message[]>([]);
  const [input,             setInput]             = useState('');
  const [loading,           setLoading]           = useState(false);
  const [error,             setError]             = useState('');
  const [currentTopic,      setCurrentTopic]      = useState('Analyzing Cohort Profile...');
  const [currentDay,        setCurrentDay]        = useState<number | null>(null);
  const [currentDifficulty, setCurrentDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [questionCount,     setQuestionCount]     = useState(0);
  const [isFollowUp,        setIsFollowUp]        = useState(false);
  const [coveredDays,       setCoveredDays]       = useState<Set<number>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => { scrollToBottom(); }, [messages, loading]);

  useEffect(() => {
    const covered = new Set<number>();
    messages.forEach(m => { if (m.day) covered.add(m.day); });
    setCoveredDays(covered);
  }, [messages]);

  useEffect(() => {
    if (!sessionId) { router.push('/'); return; }

    async function loadSession() {
      try {
        setLoading(true);
        const stored = localStorage.getItem(`session_${sessionId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          setMessages(parsed.messages);
          setCurrentTopic(parsed.currentTopic || 'AI Interview');
          setCurrentDay(parsed.currentDay);
          setCurrentDifficulty(parsed.currentDifficulty || 'medium');
          setQuestionCount(parsed.questionCount || 1);
          setIsFollowUp(parsed.isFollowUp || false);
          setLoading(false);
        } else {
          const stateRes = await fetch(`http://localhost:5000/api/interview/${sessionId}`);
          if (stateRes.ok) {
            const state = await stateRes.json();
            const restored: Message[] = state.conversation.map((m: any) => ({
              role: m.role, content: m.content, timestamp: m.timestamp,
              topic: m.topic, day: m.day, difficulty: m.difficulty, isFollowUp: m.isFollowUp,
            }));
            setMessages(restored);
            setCurrentTopic(state.currentTopic || 'AI Interview');
            setCurrentDay(state.currentDay || null);
            setCurrentDifficulty(state.difficulty || 'medium');
            setQuestionCount(state.questionNumber || 1);
            saveToLocal(restored, state.currentTopic || 'AI Interview', state.currentDay || null, state.difficulty || 'medium', state.questionNumber || 1, false);
          } else if (candidateId) {
            const candRes = await fetch(`http://localhost:5000/api/candidates/${candidateId}`);
            if (!candRes.ok) throw new Error('Failed to find candidate profile');
            const candidateObj = await candRes.json();
            const startRes = await fetch('http://localhost:5000/api/interview', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId, candidate: candidateObj }),
            });
            if (!startRes.ok) throw new Error('Failed to initialize session');
            const data = await startRes.json();
            const initMsg: Message = { role: 'interviewer', content: data.reply, timestamp: new Date().toISOString() };
            setMessages([initMsg]);
            setQuestionCount(1);
            saveToLocal([initMsg], 'AI Interview', null, 'medium', 1, false);
          } else { router.push('/'); }
        }
      } catch (err: any) {
        setError(err.message || 'Error establishing session.');
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, [sessionId, candidateId]);

  const saveToLocal = (msgs: Message[], topic: string, day: number | null, diff: 'easy'|'medium'|'hard', qCount: number, fUp: boolean) => {
    localStorage.setItem(`session_${sessionId}`, JSON.stringify({ messages: msgs, currentTopic: topic, currentDay: day, currentDifficulty: diff, questionCount: qCount, isFollowUp: fUp }));
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !sessionId) return;

    const userMsg = input.trim();
    setInput('');
    setError('');
    setLoading(true);

    const newMessages: Message[] = [...messages, { role: 'candidate', content: userMsg, timestamp: new Date().toISOString() }];
    setMessages(newMessages);

    try {
      const res = await fetch('http://localhost:5000/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: userMsg }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to submit response');
      }
      const data = await res.json();

      if (data.done) {
        localStorage.removeItem(`session_${sessionId}`);
        localStorage.setItem(`feedback_${sessionId}`, JSON.stringify(data.feedback));
        const finalMessages: Message[] = [...newMessages, { role: 'interviewer', content: data.reply, timestamp: new Date().toISOString() }];
        setMessages(finalMessages);
        setTimeout(() => router.push(`/feedback?sessionId=${sessionId}`), 1500);
        return;
      }

      const stateRes = await fetch(`http://localhost:5000/api/interview/${sessionId}`);
      let updatedQCount = questionCount + 1, updatedTopic = currentTopic, updatedDay = currentDay, updatedDiff = currentDifficulty, updatedFollowUp = isFollowUp;

      if (stateRes.ok) {
        const state = await stateRes.json();
        updatedQCount = state.questionNumber;
        updatedTopic  = state.currentTopic || currentTopic;
        updatedDay    = state.currentDay;
        updatedDiff   = state.difficulty;
        const lastAI  = state.conversation.filter((m: any) => m.role === 'interviewer').pop();
        updatedFollowUp = lastAI?.isFollowUp || false;
      }

      const nextMessages: Message[] = [...newMessages, {
        role: 'interviewer', content: data.reply, timestamp: new Date().toISOString(),
        topic: updatedTopic, day: updatedDay || undefined, difficulty: updatedDiff, isFollowUp: updatedFollowUp,
      }];
      setMessages(nextMessages);
      setQuestionCount(updatedQCount);
      setCurrentTopic(updatedTopic);
      if (updatedDay) setCurrentDay(updatedDay);
      setCurrentDifficulty(updatedDiff);
      setIsFollowUp(updatedFollowUp);
      saveToLocal(nextMessages, updatedTopic, updatedDay, updatedDiff, updatedQCount, updatedFollowUp);
    } catch (err: any) {
      setError(err.message || 'Server error. Please resubmit.');
      setMessages(messages);
    } finally {
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e as any); }
  };

  const diff = DIFFICULTY_CONFIG[currentDifficulty] || DIFFICULTY_CONFIG.medium;

  return (
    <div className="flex h-screen bg-[#020408] text-slate-100 overflow-hidden">
      {/* ── SIDEBAR ──────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-72 shrink-0 border-r border-slate-800/60 glass-strong">
        {/* Logo area */}
        <div className="p-5 border-b border-slate-800/60">
          <button onClick={() => router.push('/')} className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors group mb-4">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-xs font-medium">Back to Home</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center shadow-lg">
              <Brain className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-100">AI Interviewer</p>
              <p className="text-xs text-slate-500">ABTalks Cohort</p>
            </div>
          </div>
        </div>

        {/* Session Stats */}
        <div className="p-5 border-b border-slate-800/60 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-600">Session Stats</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-slate-900/60 border border-slate-800/60 p-3 text-center">
              <p className="text-xl font-black text-indigo-400">{questionCount}</p>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">Questions</p>
            </div>
            <div className={`rounded-xl border p-3 text-center ${diff.bg} ${diff.border}`}>
              <div className="flex items-center justify-center gap-1.5 mb-0.5">
                <div className={`w-1.5 h-1.5 rounded-full ${diff.dot}`} />
                <p className={`text-xs font-black uppercase ${diff.color}`}>{currentDifficulty}</p>
              </div>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Difficulty</p>
            </div>
          </div>

          {currentDay !== null && (
            <div className="rounded-xl bg-slate-900/60 border border-slate-800/60 p-3 flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <p className="text-xs text-slate-300 font-medium truncate">Day {currentDay}: {CURRICULUM_DAYS[currentDay] || currentTopic.split(' — ')[0]}</p>
            </div>
          )}

          {isFollowUp && (
            <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 px-3 py-2 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
              <p className="text-xs text-violet-300 font-semibold">Targeted Follow-up</p>
            </div>
          )}
        </div>

        {/* Curriculum Tracker */}
        <div className="flex-1 p-5 overflow-y-auto space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-600 flex items-center gap-2">
            <Target className="w-3.5 h-3.5" /> Curriculum Tracker
          </p>
          <div className="space-y-2">
            {Object.entries(CURRICULUM_DAYS).map(([dayNum, title]) => {
              const day = parseInt(dayNum);
              const isActive  = currentDay === day;
              const isCovered = coveredDays.has(day);
              return (
                <div key={day} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-200 ${
                  isActive  ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-200' :
                  isCovered ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300' :
                              'border-transparent text-slate-700'
                }`}>
                  <div className={`w-2 h-2 rounded-full shrink-0 transition-colors ${isActive ? 'bg-indigo-400' : isCovered ? 'bg-emerald-400' : 'bg-slate-800'}`} />
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Day {day}</p>
                    <p className="text-xs font-semibold truncate">{title}</p>
                  </div>
                  {isCovered && !isActive && (
                    <span className="text-[9px] font-bold text-emerald-400/70 uppercase tracking-wider">✓</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* ── MAIN CHAT AREA ───────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="shrink-0 glass-strong border-b border-slate-800/60 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center shadow-lg">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#020408] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-slate-100">AI Interviewer</h1>
                {isFollowUp && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-[10px] font-bold text-violet-300">
                    <Sparkles className="w-2.5 h-2.5" /> Follow-up
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">ABTalks AI Engineering Cohort Assessment</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentDay !== null && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass border border-slate-700/60 text-xs text-slate-300">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                Day {currentDay}
              </div>
            )}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold uppercase ${diff.bg} ${diff.border} ${diff.color}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${diff.dot}`} />
              {currentDifficulty}
            </div>
            <div className="px-3 py-1.5 rounded-xl glass border border-slate-700/60 text-xs font-black text-slate-300">
              {questionCount}<span className="text-slate-600 font-normal"> / 8+</span>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8 space-y-6">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full space-y-4 text-slate-600">
              <div className="w-16 h-16 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-center animate-pulse">
                <Zap className="w-8 h-8" />
              </div>
              <p className="text-sm">Initializing your personalized interview session...</p>
            </div>
          )}

          {messages.map((msg, i) => {
            const isAI = msg.role === 'interviewer';
            return (
              <div
                key={i}
                className={`flex gap-3 max-w-3xl animate-slide-up ${isAI ? 'self-start' : 'self-end flex-row-reverse ml-auto'}`}
                style={{ animationDelay: `${i * 20}ms` }}
              >
                {/* Avatar */}
                <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center border shadow-lg ${
                  isAI
                    ? 'bg-gradient-to-br from-indigo-600/30 to-violet-700/30 border-indigo-500/30 text-indigo-400'
                    : 'bg-gradient-to-br from-slate-700/60 to-slate-800/60 border-slate-600/30 text-slate-400'
                }`}>
                  {isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                {/* Bubble */}
                <div className={`relative group rounded-2xl px-5 py-4 shadow-lg leading-relaxed max-w-2xl ${
                  isAI
                    ? 'glass border border-slate-700/60 text-slate-100 rounded-tl-none'
                    : 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-tr-none glow-purple'
                }`}>
                  {isAI && msg.isFollowUp && (
                    <div className="flex items-center gap-1 mb-2">
                      <Sparkles className="w-3 h-3 text-violet-400" />
                      <span className="text-[10px] text-violet-400 font-bold uppercase tracking-wider">Follow-up</span>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap leading-7">{msg.content}</p>
                  <span className={`text-[10px] block mt-2 text-right ${isAI ? 'text-slate-600' : 'text-violet-200/60'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {loading && (
            <div className="flex gap-3 max-w-3xl self-start animate-fade-in">
              <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center border bg-gradient-to-br from-indigo-600/30 to-violet-700/30 border-indigo-500/30 text-indigo-400">
                <Bot className="w-4 h-4" />
              </div>
              <div className="glass border border-slate-700/60 rounded-2xl rounded-tl-none px-5 py-4 shadow-lg flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-typing-1" />
                <div className="w-2 h-2 rounded-full bg-violet-400 animate-typing-2" />
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-typing-3" />
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 text-rose-300 flex items-center gap-3 max-w-2xl mx-auto glass">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <footer className="shrink-0 glass-strong border-t border-slate-800/60 p-4 z-10">
          <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                id="interview-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                rows={1}
                placeholder={loading ? 'AI is thinking...' : 'Type your answer... (Enter to send, Shift+Enter for new line)'}
                className="w-full bg-slate-900/80 border border-slate-700/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 rounded-2xl px-5 py-4 text-sm text-slate-100 placeholder-slate-600 transition-all duration-200 disabled:opacity-50 resize-none leading-relaxed"
                style={{ minHeight: '56px', maxHeight: '160px' }}
                onInput={e => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = 'auto';
                  t.style.height = Math.min(t.scrollHeight, 160) + 'px';
                }}
              />
            </div>
            <button
              id="send-btn"
              type="submit"
              disabled={loading || !input.trim()}
              className="relative overflow-hidden w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-lg disabled:opacity-30 disabled:cursor-not-allowed group shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-2xl" style={{ boxShadow: '0 0 30px rgba(99,102,241,0.5)' }} />
              <Send className="w-5 h-5 text-white relative z-10 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-150" />
            </button>
          </form>
          <p className="text-center text-[10px] text-slate-700 mt-2">Shift+Enter for new line · Enter to send</p>
        </footer>
      </div>
    </div>
  );
}

export default function InterviewPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex flex-col items-center justify-center bg-[#020408] text-slate-100 p-6 min-h-screen">
        <div className="w-12 h-12 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <p className="text-slate-500 text-sm">Establishing tailored interview session...</p>
      </div>
    }>
      <InterviewContent />
    </Suspense>
  );
}
