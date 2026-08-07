/**
 * Answer Evaluation Prompt
 * 
 * Evaluates candidate answers against curriculum objectives.
 * Returns structured scores, missing concepts, and recommended next action.
 */

export function buildAnswerEvaluationPrompt(
  curriculumDayContext: string,
  question: string,
  answer: string,
  difficulty: 'easy' | 'medium' | 'hard',
  interviewSummary: string
): { system: string; user: string } {
  const system = `You are an expert AI engineering evaluator. Your job is to assess a candidate's answer to a technical interview question.

Evaluation Criteria (each scored 0-10):
- technicalCorrectness: Is the answer factually correct?
- conceptualDepth: Does the answer show deep understanding beyond surface-level?
- practicalUnderstanding: Can the candidate apply the concept in real scenarios?
- communication: Is the explanation clear and well-structured?

Overall Score: Weighted average of the above.

Decision Logic:
- If the answer shows deep understanding (score >= 8), recommend INCREASE_DIFFICULTY.
- If the answer is partial (score 5-7), recommend FOLLOW_UP to probe missing concepts.
- If the answer shows significant gaps (score < 5), recommend DECREASE_DIFFICULTY.
- If the topic has been sufficiently assessed, recommend CHANGE_TOPIC.

Be strict but fair. A score of 7 means "good but missing some depth." A score of 10 means "expert-level complete answer."

You MUST return valid JSON.`;

  const user = `## Curriculum Context
${curriculumDayContext}

## Question Asked (${difficulty} difficulty)
${question}

## Candidate's Answer
${answer}

## Interview Progress
${interviewSummary}

Evaluate this answer and decide the next action.

Return JSON in this exact format:
{
  "technicalCorrectness": <0-10>,
  "conceptualDepth": <0-10>,
  "practicalUnderstanding": <0-10>,
  "communication": <0-10>,
  "overallScore": <0-10>,
  "strengths": ["<strength1>", "<strength2>"],
  "missingConcepts": ["<concept1>", "<concept2>"],
  "misconceptions": ["<misconception1>"],
  "reasoning": "<brief internal evaluation reasoning>",
  "recommendedAction": "FOLLOW_UP" | "INCREASE_DIFFICULTY" | "DECREASE_DIFFICULTY" | "CHANGE_TOPIC"
}`;

  return { system, user };
}
