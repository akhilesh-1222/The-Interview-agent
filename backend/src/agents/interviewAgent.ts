/**
 * Interview Agent — Core State Machine
 * 
 * This is the central intelligence of the AI Interview Agent.
 * It orchestrates:
 *   1. Initial topic selection based on candidate profile
 *   2. Question generation grounded in curriculum
 *   3. Answer evaluation with structured scoring
 *   4. Adaptive decision engine (follow-up, difficulty, topic changes)
 *   5. Final feedback report generation
 * 
 * The state machine enforces:
 *   - Minimum 8 questions
 *   - Minimum 4 different curriculum days
 *   - Natural interview flow with follow-ups
 */

import { generateJSON } from '../ai/llm';
import {
  validateEvaluation,
  validateQuestion,
  validateTopicSelection,
  validateFeedback,
  DEFAULT_EVALUATION,
  AnswerEvaluation,
  GeneratedQuestion,
  TopicSelection,
  FinalFeedback,
} from '../schemas';
import { analyzeCandidate, CandidateProfile } from '../services/candidateService';
import { getDayContext, getMultipleDaysContext, getCurriculumOverview, getDay } from '../services/curriculumService';
import {
  InterviewState,
  createSession,
  getSession,
  addQuestion,
  addAnswer,
  addEvaluation,
  canEndInterview,
  buildInterviewSummary,
  completeSession,
} from '../services/sessionService';
import { buildTopicSelectionPrompt } from '../prompts/topicSelection';
import { buildQuestionGenerationPrompt } from '../prompts/questionGeneration';
import { buildAnswerEvaluationPrompt } from '../prompts/answerEvaluation';
import { buildFinalFeedbackPrompt } from '../prompts/finalFeedback';
import {
  queryRelevantCurriculum,
  queryCandidatePastAnswers,
  indexAnswerEmbedding,
  formatVectorContext,
} from '../services/chromaService';

// ── Start Interview ───────────────────────────────────────────────

/**
 * Initialize a new interview session.
 * Analyzes the candidate, selects topics, and generates the first question.
 */
export async function startInterview(
  sessionId: string,
  candidate: CandidateProfile
): Promise<{ reply: string; done: boolean }> {
  console.log(`[Interview] Starting interview for ${candidate.member.name} (${candidate.member.id})`);

  // 1. Analyze candidate profile
  const analysis = analyzeCandidate(candidate);
  console.log(`[Interview] Candidate analysis: ${analysis.overallStrength} overall, ${analysis.strongTopics.length} strong, ${analysis.weakTopics.length} weak, ${analysis.skippedTopics.length} skipped`);

  // 2. Select interview topics using LLM
  const topicSelection = await selectTopics(analysis.profileSummary);
  console.log(`[Interview] Selected ${topicSelection.length} curriculum days for interview`);

  // 3. Create session
  const state = createSession(
    sessionId,
    candidate.member.id,
    candidate.member.name,
    candidate.member.jobRole,
    analysis.suggestedInitialDifficulty,
    analysis.profileSummary,
    topicSelection.map(t => ({
      day: t.day,
      title: t.title,
      suggestedDifficulty: t.suggestedDifficulty,
    }))
  );

  // 4. Generate first question
  const firstTopic = topicSelection[0];
  const firstQuestion = await generateQuestion(
    state,
    firstTopic.day,
    firstTopic.suggestedDifficulty,
    false
  );

  // 5. Build welcome message with first question
  const welcomeMessage = buildWelcomeMessage(candidate.member.name, firstQuestion.question);

  // Record the question in state
  addQuestion(
    state,
    firstQuestion.question,
    firstQuestion.day,
    firstQuestion.topic,
    firstQuestion.difficulty,
    firstQuestion.type,
    false
  );

  return {
    reply: welcomeMessage,
    done: false,
  };
}

// ── Process Answer ────────────────────────────────────────────────

/**
 * Process a candidate's answer and generate the next question or end the interview.
 */
export async function processAnswer(
  sessionId: string,
  message: string
): Promise<{ reply: string; done: boolean; feedback?: FinalFeedback }> {
  const state = getSession(sessionId);
  if (!state) {
    throw new Error(`Session ${sessionId} not found`);
  }

  if (state.status === 'completed') {
    return {
      reply: 'This interview has already been completed. Thank you for your participation!',
      done: true,
      feedback: state.finalFeedback as FinalFeedback | undefined,
    };
  }

  // 1. Record the candidate's answer
  addAnswer(state, message);
  console.log(`[Interview] Answer received for Q${state.questionNumber}`);

  // 2. Evaluate the answer
  const evaluation = await evaluateAnswer(state, message);
  addEvaluation(state, evaluation);
  console.log(`[Interview] Evaluation: ${evaluation.overallScore}/10, action: ${evaluation.recommendedAction}`);

  // 3. Decide next action
  const decision = makeDecision(state, evaluation);
  console.log(`[Interview] Decision: ${decision.action}`);

  // 4. Check if interview should end
  if (decision.action === 'END_INTERVIEW') {
    return await endInterview(state);
  }

  // 5. Generate next question based on decision
  const nextQuestion = await generateNextQuestion(state, evaluation, decision);

  // 6. Build response — pass evaluation score so transitions are honest
  const isFollowUp = decision.action === 'FOLLOW_UP';
  const reply = buildInterviewerResponse(nextQuestion.question, isFollowUp, state, evaluation.overallScore);

  // Record the question
  addQuestion(
    state,
    nextQuestion.question,
    nextQuestion.day,
    nextQuestion.topic,
    nextQuestion.difficulty,
    nextQuestion.type,
    isFollowUp
  );

  return { reply, done: false };
}

// ── Topic Selection ───────────────────────────────────────────────

async function selectTopics(
  candidateProfile: string
): Promise<TopicSelection['selectedDays']> {
  const prompt = buildTopicSelectionPrompt(candidateProfile, getCurriculumOverview());

  const result = await generateJSON<TopicSelection>(
    prompt.user,
    prompt.system,
    {
      selectedDays: [
        { day: 7, title: 'Embeddings Explained', reason: 'Core AI topic', suggestedDifficulty: 'medium' as const },
        { day: 8, title: 'Vector Databases Overview', reason: 'Fundamental for RAG', suggestedDifficulty: 'medium' as const },
        { day: 12, title: 'Prompt Engineering Fundamentals', reason: 'Essential skill', suggestedDifficulty: 'medium' as const },
        { day: 22, title: 'Multi-Agent Orchestration', reason: 'Advanced topic', suggestedDifficulty: 'medium' as const },
        { day: 10, title: 'Retrieval & Matching Engine', reason: 'Core RAG component', suggestedDifficulty: 'medium' as const },
      ],
    }
  );

  const validated = validateTopicSelection(result);
  if (validated && validated.selectedDays.length >= 4) {
    return validated.selectedDays;
  }

  // Fallback topic selection
  return [
    { day: 7, title: 'Embeddings Explained', reason: 'Core AI topic', suggestedDifficulty: 'medium' as const },
    { day: 8, title: 'Vector Databases Overview', reason: 'Fundamental for RAG', suggestedDifficulty: 'medium' as const },
    { day: 12, title: 'Prompt Engineering Fundamentals', reason: 'Essential skill', suggestedDifficulty: 'medium' as const },
    { day: 22, title: 'Multi-Agent Orchestration', reason: 'Advanced topic', suggestedDifficulty: 'medium' as const },
    { day: 10, title: 'Retrieval & Matching Engine', reason: 'Core RAG component', suggestedDifficulty: 'medium' as const },
  ];
}

// ── Question Generation ───────────────────────────────────────────

async function generateQuestion(
  state: InterviewState,
  day: number,
  difficulty: 'easy' | 'medium' | 'hard',
  isFollowUp: boolean,
  previousAnswer?: string,
  missingConcepts?: string[]
): Promise<GeneratedQuestion> {
  const dayContext = getDayContext(day);
  const summary = buildInterviewSummary(state);

  // Retrieve semantically relevant curriculum context from vector store
  const dayInfo = getDay(day);
  const vectorQuery = `${dayInfo?.title || ''} ${dayInfo?.objectives?.join(' ') || ''}`;
  let vectorContext = '';
  try {
    const relevantCurriculum = await queryRelevantCurriculum(vectorQuery, 2);
    vectorContext = formatVectorContext(relevantCurriculum, 'Related Curriculum Topics');
  } catch (error: any) {
    console.warn('[Interview] Vector curriculum query failed, continuing without:', error.message);
  }

  const prompt = buildQuestionGenerationPrompt(
    dayContext + vectorContext,
    state.candidateProfileSummary,
    summary,
    difficulty,
    isFollowUp,
    previousAnswer,
    missingConcepts
  );

  const fallback: GeneratedQuestion = {
    question: `Let's discuss ${dayInfo?.title || 'this topic'}. Can you explain the key concepts and how you applied them during the cohort?`,
    day,
    topic: dayInfo?.title || 'General',
    type: 'explanation',
    difficulty,
  };

  const result = await generateJSON<GeneratedQuestion>(
    prompt.user,
    prompt.system,
    fallback
  );

  return validateQuestion(result) || fallback;
}

// ── Answer Evaluation ─────────────────────────────────────────────

async function evaluateAnswer(
  state: InterviewState,
  answer: string
): Promise<AnswerEvaluation> {
  const dayContext = state.currentDay ? getDayContext(state.currentDay) : '';
  const lastQuestion = state.questionHistory[state.questionHistory.length - 1];
  const summary = buildInterviewSummary(state);

  // Retrieve semantically relevant past answers from vector store
  let pastAnswerContext = '';
  try {
    const pastAnswers = await queryCandidatePastAnswers(
      state.candidateId,
      `${lastQuestion?.topic || ''} ${answer}`,
      2
    );
    pastAnswerContext = formatVectorContext(pastAnswers, 'Candidate Past Answers on Similar Topics');
  } catch (error: any) {
    console.warn('[Interview] Vector history query failed, continuing without:', error.message);
  }

  const prompt = buildAnswerEvaluationPrompt(
    dayContext + pastAnswerContext,
    lastQuestion?.question || '',
    answer,
    state.difficulty,
    summary
  );

  const result = await generateJSON<AnswerEvaluation>(
    prompt.user,
    prompt.system,
    DEFAULT_EVALUATION
  );

  const evaluation = validateEvaluation(result);

  // Index this answer in vector store for future semantic retrieval
  try {
    await indexAnswerEmbedding(
      state.sessionId,
      state.candidateId,
      state.currentDay || 0,
      lastQuestion?.question || '',
      answer,
      evaluation.overallScore
    );
  } catch (error: any) {
    console.warn('[Interview] Failed to index answer in vector store:', error.message);
  }

  return evaluation;
}

// ── Decision Engine ───────────────────────────────────────────────

interface Decision {
  action: 'FOLLOW_UP' | 'INCREASE_DIFFICULTY' | 'DECREASE_DIFFICULTY' | 'CHANGE_TOPIC' | 'END_INTERVIEW';
  nextDay?: number;
  nextDifficulty: 'easy' | 'medium' | 'hard';
  reason: string;
}

function makeDecision(state: InterviewState, evaluation: AnswerEvaluation): Decision {
  const currentDifficulty = state.difficulty;

  // Check if we should end the interview
  if (canEndInterview(state) && state.questionNumber >= state.maximumQuestions) {
    return {
      action: 'END_INTERVIEW',
      nextDifficulty: currentDifficulty,
      reason: 'Maximum questions reached with sufficient coverage.',
    };
  }

  // If there are critical missing concepts, follow up (max 2 follow-ups per topic)
  if (
    evaluation.recommendedAction === 'FOLLOW_UP' &&
    evaluation.missingConcepts.length > 0 &&
    state.currentTopicQuestionCount < 3
  ) {
    return {
      action: 'FOLLOW_UP',
      nextDifficulty: currentDifficulty,
      reason: `Missing concepts: ${evaluation.missingConcepts.join(', ')}`,
    };
  }

  // Score-based decision
  if (evaluation.overallScore >= 8) {
    // Strong answer — increase difficulty or move on
    if (currentDifficulty !== 'hard' && state.currentTopicQuestionCount < 2) {
      const nextDiff = currentDifficulty === 'easy' ? 'medium' : 'hard';
      return {
        action: 'INCREASE_DIFFICULTY',
        nextDifficulty: nextDiff as 'easy' | 'medium' | 'hard',
        reason: 'Strong answer — increasing difficulty.',
      };
    }
    // Already hard or enough questions on this topic — change topic
    return selectNextTopic(state, currentDifficulty);
  }

  if (evaluation.overallScore < 5) {
    // Weak answer — decrease difficulty or follow up
    if (state.currentTopicQuestionCount < 3) {
      const nextDiff = currentDifficulty === 'hard' ? 'medium' : 'easy';
      return {
        action: 'DECREASE_DIFFICULTY',
        nextDifficulty: nextDiff as 'easy' | 'medium' | 'hard',
        reason: 'Weak answer — decreasing difficulty.',
      };
    }
    return selectNextTopic(state, 'medium');
  }

  // Medium score (5-7) — follow up once, then move on
  if (state.currentTopicQuestionCount < 2 && evaluation.missingConcepts.length > 0) {
    return {
      action: 'FOLLOW_UP',
      nextDifficulty: currentDifficulty,
      reason: 'Partial answer — following up on missing concepts.',
    };
  }

  return selectNextTopic(state, currentDifficulty);
}

function selectNextTopic(state: InterviewState, fallbackDifficulty: 'easy' | 'medium' | 'hard'): Decision {
  // Check if we can end
  if (canEndInterview(state)) {
    // We've met the minimums — end after a few more if we've covered enough
    if (state.questionNumber >= state.minimumQuestions + 2) {
      return {
        action: 'END_INTERVIEW',
        nextDifficulty: fallbackDifficulty,
        reason: 'Sufficient questions and day coverage.',
      };
    }
  }

  // Find next uncovered topic from queue
  const nextTopicIndex = state.topicQueue.findIndex(
    (t, i) => i > state.topicQueueIndex || !state.coveredDays.includes(t.day)
  );

  if (nextTopicIndex !== -1) {
    const nextTopic = state.topicQueue[nextTopicIndex];
    state.topicQueueIndex = nextTopicIndex;
    return {
      action: 'CHANGE_TOPIC',
      nextDay: nextTopic.day,
      nextDifficulty: nextTopic.suggestedDifficulty,
      reason: `Moving to Day ${nextTopic.day}: ${nextTopic.title}`,
    };
  }

  // All queued topics covered — cycle back or end
  if (canEndInterview(state)) {
    return {
      action: 'END_INTERVIEW',
      nextDifficulty: fallbackDifficulty,
      reason: 'All planned topics covered.',
    };
  }

  // Need more days — pick from queue items already covered but with different difficulty
  const reuseTopic = state.topicQueue[state.topicQueueIndex % state.topicQueue.length];
  state.topicQueueIndex++;
  return {
    action: 'CHANGE_TOPIC',
    nextDay: reuseTopic.day,
    nextDifficulty: fallbackDifficulty,
    reason: `Revisiting Day ${reuseTopic.day} for more coverage.`,
  };
}

// ── Generate Next Question Based on Decision ──────────────────────

async function generateNextQuestion(
  state: InterviewState,
  evaluation: AnswerEvaluation,
  decision: Decision
): Promise<GeneratedQuestion> {
  const day = decision.nextDay || state.currentDay || state.topicQueue[0]?.day || 7;
  const difficulty = decision.nextDifficulty;
  const isFollowUp = decision.action === 'FOLLOW_UP';

  const lastAnswer = state.conversation
    .filter(m => m.role === 'candidate')
    .pop()?.content;

  return generateQuestion(
    state,
    day,
    difficulty,
    isFollowUp,
    isFollowUp ? lastAnswer : undefined,
    isFollowUp ? evaluation.missingConcepts : undefined
  );
}

// ── End Interview ─────────────────────────────────────────────────

async function endInterview(
  state: InterviewState
): Promise<{ reply: string; done: true; feedback: FinalFeedback }> {
  console.log(`[Interview] Ending interview for ${state.candidateName}`);

  // Build evaluation summary for feedback generation
  const evalSummary = state.answerEvaluations.map((e, i) => {
    const q = state.questionHistory[i];
    return `Q${i + 1} (Day ${q?.day}, ${q?.topic}): Score ${e.overallScore}/10. Strengths: ${e.strengths.join(', ') || 'None noted'}. Gaps: ${e.missingConcepts.join(', ') || 'None'}.`;
  }).join('\n');

  const coveredDaysStr = state.coveredDays
    .map(d => {
      const dayInfo = getDay(d);
      return dayInfo ? `Day ${d}: ${dayInfo.title}` : `Day ${d}`;
    })
    .join('\n');

  const prompt = buildFinalFeedbackPrompt(
    state.candidateProfileSummary,
    buildInterviewSummary(state),
    evalSummary,
    coveredDaysStr
  );

  const fallbackFeedback: FinalFeedback = {
    summary: `${state.candidateName} completed the technical interview covering ${state.coveredDays.length} curriculum days across ${state.questionNumber} questions. The interview assessed understanding of AI engineering concepts from the cohort curriculum.`,
    strengths: state.strengths.slice(0, 5),
    gaps: [...state.gaps, ...state.missingConcepts].slice(0, 5),
    next: state.coveredDays.map(d => {
      const dayInfo = getDay(d);
      return `Review Day ${d}: ${dayInfo?.title || 'Curriculum topic'}`;
    }).slice(0, 5),
  };

  const feedback = await generateJSON<FinalFeedback>(
    prompt.user,
    prompt.system,
    fallbackFeedback
  );

  const validatedFeedback = validateFeedback(feedback) || fallbackFeedback;

  // Complete session
  completeSession(state, validatedFeedback);

  const closingMessage = `Thank you for completing this interview, ${state.candidateName}. I've assessed your understanding across ${state.coveredDays.length} curriculum areas over ${state.questionNumber} questions. Here is your detailed feedback.`;

  return {
    reply: closingMessage,
    done: true,
    feedback: validatedFeedback,
  };
}

// ── Helpers ───────────────────────────────────────────────────────

function buildWelcomeMessage(candidateName: string, firstQuestion: string): string {
  return `Welcome, ${candidateName}. I'm your AI technical interviewer, and I'll be assessing your understanding of the concepts covered in the AI Engineering Cohort. I've reviewed your learning journey and I'll be asking questions tailored to your experience. Let's begin.\n\n${firstQuestion}`;
}

function buildInterviewerResponse(
  question: string,
  isFollowUp: boolean,
  state: InterviewState,
  score?: number
): string {
  if (isFollowUp) {
    // For follow-ups, use score-aware language
    if (score !== undefined && score < 4) {
      const transitions = [
        "That answer didn't quite address the technical aspects I was looking for. Let me ask a more specific question. ",
        "I see you're struggling with this area. Let me try a more focused question. ",
        "Let me rephrase and ask something more direct. ",
      ];
      return transitions[state.questionNumber % transitions.length] + question;
    }
    const transitions = [
      "That's a start. Let me dig a bit deeper. ",
      "Interesting. I'd like to explore that further. ",
      "I appreciate your answer. Let me follow up on that. ",
      "Thank you. Building on what you said, ",
      "Good. Let me probe a bit more on this. ",
    ];
    const transition = transitions[state.questionNumber % transitions.length];
    return transition + question;
  }

  // Topic change — be honest based on the score
  if (state.questionNumber > 1) {
    if (score !== undefined && score <= 2) {
      // Very poor / irrelevant answer
      const transitions = [
        "That response wasn't relevant to the question. Let's move on to a different topic. ",
        "I was looking for a technical answer, but let's shift to another area and see how you do. ",
        "Let's set that aside and try a different topic. ",
      ];
      return transitions[state.questionNumber % transitions.length] + question;
    }

    if (score !== undefined && score < 5) {
      // Weak answer
      const transitions = [
        "There were some gaps in that answer. Let's move on to a new topic. ",
        "I'd like to see stronger technical depth. Let's try a different area. ",
        "Noted. Let's shift focus and try something else. ",
        "Let's move on. ",
      ];
      return transitions[state.questionNumber % transitions.length] + question;
    }

    // Decent or strong answer
    const transitions = [
      "Good. Now I'd like to shift focus. ",
      "Thank you. Let's explore another topic from the curriculum. ",
      "Let's move on to a different area. ",
      "Let me now ask about something different. ",
    ];
    const transition = transitions[state.questionNumber % transitions.length];
    return transition + question;
  }

  return question;
}
