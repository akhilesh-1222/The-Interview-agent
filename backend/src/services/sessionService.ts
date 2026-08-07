/**
 * Session Service
 * 
 * In-memory interview session manager. Stores InterviewState keyed by sessionId.
 * Tracks conversation, question history, evaluations, and interview progress.
 */

import { v4 as uuidv4 } from 'uuid';
import { AnswerEvaluation } from '../schemas';

// ── Types ─────────────────────────────────────────────────────────

export interface ConversationMessage {
  role: 'interviewer' | 'candidate';
  content: string;
  timestamp: string;
  topic?: string;
  day?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  isFollowUp?: boolean;
}

export interface QuestionRecord {
  questionId: string;
  day: number;
  topic: string;
  question: string;
  difficulty: 'easy' | 'medium' | 'hard';
  type: string;
}

export interface InterviewState {
  sessionId: string;
  candidateId: string;
  candidateName: string;
  candidateRole: string;

  status: 'not_started' | 'in_progress' | 'completed';

  questionNumber: number;
  minimumQuestions: number;
  maximumQuestions: number;

  coveredDays: number[];
  coveredTopics: string[];

  currentDay?: number;
  currentTopic?: string;

  difficulty: 'easy' | 'medium' | 'hard';

  conversation: ConversationMessage[];
  questionHistory: QuestionRecord[];
  answerEvaluations: AnswerEvaluation[];

  strengths: string[];
  gaps: string[];
  missingConcepts: string[];

  overallScore?: number;

  finalFeedback?: {
    summary: string;
    strengths: string[];
    gaps: string[];
    next: string[];
  };

  // Planned topic queue from initial analysis
  topicQueue: { day: number; title: string; suggestedDifficulty: 'easy' | 'medium' | 'hard' }[];
  topicQueueIndex: number;

  // Track consecutive questions on same topic
  currentTopicQuestionCount: number;

  // Candidate analysis summary (compact)
  candidateProfileSummary: string;
}

// ── Session Store ─────────────────────────────────────────────────

const sessions: Map<string, InterviewState> = new Map();

/**
 * Create a new interview session.
 */
export function createSession(
  sessionId: string,
  candidateId: string,
  candidateName: string,
  candidateRole: string,
  initialDifficulty: 'easy' | 'medium' | 'hard',
  candidateProfileSummary: string,
  topicQueue: InterviewState['topicQueue']
): InterviewState {
  const state: InterviewState = {
    sessionId,
    candidateId,
    candidateName,
    candidateRole,
    status: 'in_progress',
    questionNumber: 0,
    minimumQuestions: 8,
    maximumQuestions: 12,
    coveredDays: [],
    coveredTopics: [],
    currentDay: undefined,
    currentTopic: undefined,
    difficulty: initialDifficulty,
    conversation: [],
    questionHistory: [],
    answerEvaluations: [],
    strengths: [],
    gaps: [],
    missingConcepts: [],
    overallScore: undefined,
    finalFeedback: undefined,
    topicQueue,
    topicQueueIndex: 0,
    currentTopicQuestionCount: 0,
    candidateProfileSummary,
  };

  sessions.set(sessionId, state);
  console.log(`[Session] Created session ${sessionId} for ${candidateName}`);
  return state;
}

/**
 * Get an existing session.
 */
export function getSession(sessionId: string): InterviewState | undefined {
  return sessions.get(sessionId);
}

/**
 * Add an interviewer question to the session.
 */
export function addQuestion(
  state: InterviewState,
  question: string,
  day: number,
  topic: string,
  difficulty: 'easy' | 'medium' | 'hard',
  type: string,
  isFollowUp: boolean = false
): void {
  state.questionNumber++;

  // Track covered days and topics
  if (!state.coveredDays.includes(day)) {
    state.coveredDays.push(day);
  }
  if (!state.coveredTopics.includes(topic)) {
    state.coveredTopics.push(topic);
  }

  // Update current topic tracking
  if (state.currentDay === day) {
    state.currentTopicQuestionCount++;
  } else {
    state.currentDay = day;
    state.currentTopic = topic;
    state.currentTopicQuestionCount = 1;
  }

  state.difficulty = difficulty;

  // Add to conversation
  state.conversation.push({
    role: 'interviewer',
    content: question,
    timestamp: new Date().toISOString(),
    topic,
    day,
    difficulty,
    isFollowUp,
  });

  // Add to question history
  state.questionHistory.push({
    questionId: uuidv4(),
    day,
    topic,
    question,
    difficulty,
    type,
  });

  console.log(`[Session] Q${state.questionNumber} | Day ${day}: ${topic} [${difficulty}] ${isFollowUp ? '(follow-up)' : ''}`);
}

/**
 * Add a candidate answer to the session.
 */
export function addAnswer(state: InterviewState, answer: string): void {
  state.conversation.push({
    role: 'candidate',
    content: answer,
    timestamp: new Date().toISOString(),
    topic: state.currentTopic,
    day: state.currentDay,
  });
}

/**
 * Add an evaluation result to the session.
 */
export function addEvaluation(state: InterviewState, evaluation: AnswerEvaluation): void {
  state.answerEvaluations.push(evaluation);

  // Accumulate strengths and gaps
  evaluation.strengths.forEach(s => {
    if (!state.strengths.includes(s)) state.strengths.push(s);
  });
  evaluation.missingConcepts.forEach(mc => {
    if (!state.missingConcepts.includes(mc)) state.missingConcepts.push(mc);
  });
  evaluation.misconceptions.forEach(m => {
    if (!state.gaps.includes(m)) state.gaps.push(m);
  });
}

/**
 * Check if minimum interview requirements are met.
 */
export function canEndInterview(state: InterviewState): boolean {
  return (
    state.questionNumber >= state.minimumQuestions &&
    state.coveredDays.length >= 4
  );
}

/**
 * Build a compact interview summary for LLM context.
 * Prevents sending entire conversation history.
 */
export function buildInterviewSummary(state: InterviewState): string {
  const lines = [
    `Interview Progress: Question ${state.questionNumber}/${state.maximumQuestions}`,
    `Days Covered: ${state.coveredDays.join(', ')} (${state.coveredDays.length} unique)`,
    `Current Topic: Day ${state.currentDay} — ${state.currentTopic} [${state.difficulty}]`,
    `Questions on Current Topic: ${state.currentTopicQuestionCount}`,
    '',
  ];

  if (state.strengths.length > 0) {
    lines.push(`Identified Strengths: ${state.strengths.slice(-5).join('; ')}`);
  }
  if (state.gaps.length > 0) {
    lines.push(`Identified Gaps: ${state.gaps.slice(-5).join('; ')}`);
  }
  if (state.missingConcepts.length > 0) {
    lines.push(`Missing Concepts: ${state.missingConcepts.slice(-5).join('; ')}`);
  }

  // Include last 2 Q&A pairs for context
  const recentConversation = state.conversation.slice(-4);
  if (recentConversation.length > 0) {
    lines.push('');
    lines.push('Recent Conversation:');
    recentConversation.forEach(msg => {
      const role = msg.role === 'interviewer' ? 'Interviewer' : 'Candidate';
      lines.push(`  ${role}: ${msg.content.substring(0, 200)}${msg.content.length > 200 ? '...' : ''}`);
    });
  }

  return lines.join('\n');
}

/**
 * Mark session as completed.
 */
export function completeSession(
  state: InterviewState,
  feedback: InterviewState['finalFeedback']
): void {
  state.status = 'completed';
  state.finalFeedback = feedback;

  // Calculate overall score from evaluations
  if (state.answerEvaluations.length > 0) {
    const avgScore =
      state.answerEvaluations.reduce((sum, e) => sum + e.overallScore, 0) /
      state.answerEvaluations.length;
    state.overallScore = Math.round(avgScore * 10); // Scale 0-10 to 0-100
  }

  console.log(`[Session] Interview completed for ${state.candidateName}. Score: ${state.overallScore}/100`);
}
