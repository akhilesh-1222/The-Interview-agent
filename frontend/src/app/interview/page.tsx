'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Send, User, Bot, AlertTriangle, BookOpen, Brain, Sparkles } from 'lucide-react';

interface Message {
  role: 'interviewer' | 'candidate';
  content: string;
  timestamp: string;
  topic?: string;
  day?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  isFollowUp?: boolean;
}

function InterviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const candidateId = searchParams.get('candidateId');

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [currentTopic, setCurrentTopic] = useState('Analyzing Cohort Profile...');
  const [currentDay, setCurrentDay] = useState<number | null>(null);
  const [currentDifficulty, setCurrentDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [questionCount, setQuestionCount] = useState(0);
  const [isFollowUp, setIsFollowUp] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (!sessionId) {
      router.push('/');
      return;
    }

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
          // Check if session already exists on backend
          const stateRes = await fetch(`http://localhost:5000/api/interview/${sessionId}`);
          if (stateRes.ok) {
            const state = await stateRes.json();
            const restoredMessages: Message[] = state.conversation.map((m: any) => ({
              role: m.role,
              content: m.content,
              timestamp: m.timestamp,
              topic: m.topic,
              day: m.day,
              difficulty: m.difficulty,
              isFollowUp: m.isFollowUp,
            }));
            setMessages(restoredMessages);
            setCurrentTopic(state.currentTopic || 'AI Interview');
            setCurrentDay(state.currentDay || null);
            setCurrentDifficulty(state.difficulty || 'medium');
            setQuestionCount(state.questionNumber || 1);
            setIsFollowUp(false);
            saveToLocal(restoredMessages, state.currentTopic || 'AI Interview', state.currentDay || null, state.difficulty || 'medium', state.questionNumber || 1, false);
          } else if (candidateId) {
            // New session initialization
            const candRes = await fetch(`http://localhost:5000/api/candidates/${candidateId}`);
            if (!candRes.ok) throw new Error('Failed to find candidate profile');
            const candidateObj = await candRes.json();

            const startRes = await fetch('http://localhost:5000/api/interview', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId, candidate: candidateObj })
            });

            if (!startRes.ok) {
              const errData = await startRes.json().catch(() => ({}));
              throw new Error(errData.error || 'Failed to initialize session');
            }

            const data = await startRes.json();
            
            const initMessage: Message = {
              role: 'interviewer',
              content: data.reply,
              timestamp: new Date().toISOString()
            };
            setMessages([initMessage]);
            setQuestionCount(1);
            saveToLocal([initMessage], 'AI Interview', null, 'medium', 1, false);
          } else {
            router.push('/');
          }
        }
      } catch (err: any) {
        console.error('Session load error:', err);
        setError(err.message || 'Error establishing interview session. Please try starting again from the home page.');
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [sessionId, candidateId]);

  const saveToLocal = (
    msgs: Message[],
    topic: string,
    day: number | null,
    diff: 'easy' | 'medium' | 'hard',
    qCount: number,
    fUp: boolean
  ) => {
    localStorage.setItem(
      `session_${sessionId}`,
      JSON.stringify({
        messages: msgs,
        currentTopic: topic,
        currentDay: day,
        currentDifficulty: diff,
        questionCount: qCount,
        isFollowUp: fUp
      })
    );
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !sessionId) return;

    const userMsg = input.trim();
    setInput('');
    setError('');
    setLoading(true);

    const newMessages: Message[] = [
      ...messages,
      { role: 'candidate', content: userMsg, timestamp: new Date().toISOString() }
    ];
    setMessages(newMessages);

    try {
      const res = await fetch('http://localhost:5000/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: userMsg })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to submit response');
      }

      const data = await res.json();

      if (data.done) {
        localStorage.removeItem(`session_${sessionId}`);
        localStorage.setItem(`feedback_${sessionId}`, JSON.stringify(data.feedback));
        
        const finalMessages: Message[] = [
          ...newMessages,
          { role: 'interviewer', content: data.reply, timestamp: new Date().toISOString() }
        ];
        setMessages(finalMessages);

        setTimeout(() => {
          router.push(`/feedback?sessionId=${sessionId}`);
        }, 1500);
        return;
      }

      const stateRes = await fetch(`http://localhost:5000/api/interview/${sessionId}`);
      let updatedQCount = questionCount + 1;
      let updatedTopic = currentTopic;
      let updatedDay = currentDay;
      let updatedDiff = currentDifficulty;
      let updatedFollowUp = isFollowUp;

      if (stateRes.ok) {
        const state = await stateRes.json();
        updatedQCount = state.questionNumber;
        updatedTopic = state.currentTopic || currentTopic;
        updatedDay = state.currentDay;
        updatedDiff = state.difficulty;
        
        const lastInterviewerMsg = state.conversation
          .filter((m: any) => m.role === 'interviewer')
          .pop();
        updatedFollowUp = lastInterviewerMsg?.isFollowUp || false;
      }

      const nextMessages: Message[] = [
        ...newMessages,
        {
          role: 'interviewer',
          content: data.reply,
          timestamp: new Date().toISOString(),
          topic: updatedTopic,
          day: updatedDay || undefined,
          difficulty: updatedDiff,
          isFollowUp: updatedFollowUp
        }
      ];

      setMessages(nextMessages);
      setQuestionCount(updatedQCount);
      setCurrentTopic(updatedTopic);
      if (updatedDay) setCurrentDay(updatedDay);
      setCurrentDifficulty(updatedDiff);
      setIsFollowUp(updatedFollowUp);

      saveToLocal(nextMessages, updatedTopic, updatedDay, updatedDiff, updatedQCount, updatedFollowUp);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Server connection error. Please try resubmitting.');
      setMessages(messages);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'easy': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'medium': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'hard': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <header className="shrink-0 bg-slate-900/80 border-b border-slate-800 backdrop-blur px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Brain className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-slate-100 flex items-center gap-2">
              AI Interviewer
              {isFollowUp && (
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-[10px] font-bold text-indigo-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Targeted Follow-up
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400">ABTalks AI Engineering Cohort Assessment</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {currentDay !== null && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-800 text-xs text-slate-300">
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              Day {currentDay}: {currentTopic.split(' — ')[0]}
            </div>
          )}
          <span className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase border ${getDifficultyColor(currentDifficulty)}`}>
            {currentDifficulty}
          </span>
          <div className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200">
            Question {questionCount} / 8+
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <div className="flex-1 flex flex-col overflow-y-auto px-4 md:px-8 py-6 space-y-6">
          {messages.map((msg, i) => {
            const isAI = msg.role === 'interviewer';
            return (
              <div
                key={i}
                className={`flex gap-4 max-w-3xl ${isAI ? 'self-start' : 'self-end flex-row-reverse'}`}
              >
                <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center border ${
                  isAI
                    ? 'bg-blue-600/10 border-blue-500/20 text-blue-400'
                    : 'bg-indigo-600/10 border-indigo-500/20 text-indigo-400'
                }`}>
                  {isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                <div className={`rounded-2xl px-5 py-4 shadow-md leading-relaxed ${
                  isAI
                    ? 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-none'
                    : 'bg-blue-600 text-white rounded-tr-none'
                }`}>
                  <p className="text-sm whitespace-pre-line">{msg.content}</p>
                  <span className={`text-[10px] block mt-2 text-right ${isAI ? 'text-slate-500' : 'text-blue-200'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-4 max-w-3xl self-start">
              <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center border bg-blue-600/10 border-blue-500/20 text-blue-400">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none px-5 py-4 shadow-md flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 flex items-center gap-3 max-w-2xl mx-auto">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="hidden lg:block w-72 shrink-0 border-l border-slate-800 bg-slate-900/30 p-6 space-y-6 overflow-y-auto">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Curriculum Progress
          </h2>
          
          <div className="space-y-3">
            {[7, 8, 10, 12, 22].map((dayNum) => {
              const isActive = currentDay === dayNum;
              const isCovered = messages.some(m => m.day === dayNum);
              return (
                <div
                  key={dayNum}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                    isActive
                      ? 'bg-blue-600/10 border-blue-500/40 text-blue-200'
                      : isCovered
                        ? 'bg-slate-800/40 border-slate-800/60 text-slate-400'
                        : 'bg-transparent border-transparent text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className={`w-2 h-2 rounded-full ${
                      isActive ? 'bg-blue-400' : isCovered ? 'bg-emerald-400' : 'bg-slate-800'
                    }`} />
                    <span className="text-xs truncate font-semibold">
                      Day {dayNum}: {
                        dayNum === 7 ? 'Embeddings' :
                        dayNum === 8 ? 'Vector Databases' :
                        dayNum === 10 ? 'Retrieval Engine' :
                        dayNum === 12 ? 'Prompt Engineering' :
                        'Multi-Agent systems'
                      }
                    </span>
                  </div>
                  {isCovered && !isActive && (
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                      Covered
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <footer className="shrink-0 bg-slate-900/80 border-t border-slate-800 p-4 z-10">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder={loading ? "AI is processing your answer..." : "Type your technical answer here..."}
            className="flex-1 bg-slate-800 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-xl px-5 py-4 text-sm text-slate-100 placeholder-slate-500 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl px-6 py-4 flex items-center justify-center transition-all shadow-md active:scale-95 shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </footer>
    </div>
  );
}

export default function InterviewPage() {
  return (
    <Suspense fallback={
      <main className="flex-1 flex flex-col items-center justify-center bg-slate-950 text-slate-100 p-6">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-slate-400">Establishing tailored interview session...</p>
      </main>
    }>
      <InterviewContent />
    </Suspense>
  );
}
