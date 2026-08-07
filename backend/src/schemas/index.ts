/**
 * Zod Schemas for LLM Output Validation
 * 
 * All structured outputs from Gemini are validated against these schemas
 * before being used by the application. Provides type safety and fallback handling.
 */

import { z } from 'zod';

// ── Answer Evaluation Schema ──────────────────────────────────────

export const AnswerEvaluationSchema = z.object({
  technicalCorrectness: z.number().min(0).max(10),
  conceptualDepth: z.number().min(0).max(10),
  practicalUnderstanding: z.number().min(0).max(10),
  communication: z.number().min(0).max(10),
  overallScore: z.number().min(0).max(10),
  strengths: z.array(z.string()),
  missingConcepts: z.array(z.string()),
  misconceptions: z.array(z.string()),
  reasoning: z.string(),
  recommendedAction: z.enum([
    'FOLLOW_UP',
    'INCREASE_DIFFICULTY',
    'DECREASE_DIFFICULTY',
    'CHANGE_TOPIC',
  ]),
});

export type AnswerEvaluation = z.infer<typeof AnswerEvaluationSchema>;

export const DEFAULT_EVALUATION: AnswerEvaluation = {
  technicalCorrectness: 5,
  conceptualDepth: 5,
  practicalUnderstanding: 5,
  communication: 5,
  overallScore: 5,
  strengths: [],
  missingConcepts: [],
  misconceptions: [],
  reasoning: 'Unable to evaluate — using default scores.',
  recommendedAction: 'FOLLOW_UP',
};

// ── Question Generation Schema ────────────────────────────────────

export const GeneratedQuestionSchema = z.object({
  question: z.string(),
  day: z.number(),
  topic: z.string(),
  type: z.enum([
    'conceptual',
    'explanation',
    'why',
    'comparison',
    'debugging',
    'architecture',
    'scenario',
    'tradeoff',
  ]),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  context: z.string().optional(),
});

export type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema>;

// ── Topic Selection Schema ────────────────────────────────────────

export const TopicSelectionSchema = z.object({
  selectedDays: z.array(
    z.object({
      day: z.number(),
      title: z.string(),
      reason: z.string(),
      suggestedDifficulty: z.enum(['easy', 'medium', 'hard']),
    })
  ),
});

export type TopicSelection = z.infer<typeof TopicSelectionSchema>;

// ── Final Feedback Schema ─────────────────────────────────────────

export const FinalFeedbackSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  next: z.array(z.string()),
});

export type FinalFeedback = z.infer<typeof FinalFeedbackSchema>;

// ── Safe Validators ───────────────────────────────────────────────

export function validateEvaluation(data: unknown): AnswerEvaluation {
  const result = AnswerEvaluationSchema.safeParse(data);
  if (result.success) return result.data;
  console.warn('[Schema] Evaluation validation failed:', result.error.issues);
  return DEFAULT_EVALUATION;
}

export function validateQuestion(data: unknown): GeneratedQuestion | null {
  const result = GeneratedQuestionSchema.safeParse(data);
  if (result.success) return result.data;
  console.warn('[Schema] Question validation failed:', result.error.issues);
  return null;
}

export function validateTopicSelection(data: unknown): TopicSelection | null {
  const result = TopicSelectionSchema.safeParse(data);
  if (result.success) return result.data;
  console.warn('[Schema] Topic selection validation failed:', result.error.issues);
  return null;
}

export function validateFeedback(data: unknown): FinalFeedback | null {
  const result = FinalFeedbackSchema.safeParse(data);
  if (result.success) return result.data;
  console.warn('[Schema] Feedback validation failed:', result.error.issues);
  return null;
}
