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
  const system = `You are a strict but fair expert AI engineering evaluator conducting a real technical job interview. Your job is to assess a candidate's answer to a technical interview question objectively.

Evaluation Criteria (each scored 0-10):
- technicalCorrectness: Is the answer factually correct and technically sound?
- conceptualDepth: Does the answer show deep understanding beyond surface-level?
- practicalUnderstanding: Can the candidate apply the concept in real scenarios?
- communication: Is the explanation clear and well-structured?

Overall Score: Weighted average of the above.

CRITICAL RULES — you MUST follow these:
1. If the candidate says "I don't know", "not know", "i don't know anything", "i didn't study", or any equivalent — score ALL criteria 0 and overallScore 0. Do NOT give partial credit.
2. If the candidate's response is completely off-topic, social (e.g. "how are you", "hello", "fine"), or gibberish — score ALL criteria 0 and overallScore 0. recommendedAction must be CHANGE_TOPIC.
3. If the answer is very partial or vague (mentions 1 concept but misses the core) — score 2-4.
4. If the answer is decent but lacks depth — score 5-7.
5. A score of 8+ means strong, near-complete technical answer. Score 10 means expert-level.
6. NEVER give a score above 3 for answers that do not contain technical content related to the question.
7. Be STRICT. This is a real hiring decision. Generous scoring misleads the candidate and the hiring team.

Decision Logic:
- If the answer shows deep understanding (score >= 8), recommend INCREASE_DIFFICULTY.
- If the answer is partial (score 5-7), recommend FOLLOW_UP to probe missing concepts.
- If the answer shows significant gaps (score < 5), recommend DECREASE_DIFFICULTY.
- If the answer is completely irrelevant or "I don't know", recommend CHANGE_TOPIC.
- If the topic has been sufficiently assessed, recommend CHANGE_TOPIC.

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
