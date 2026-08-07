/**
 * Question Generation Prompt
 * 
 * Generates contextual interview questions grounded in curriculum content
 * and adapted to the candidate's current performance.
 */

export function buildQuestionGenerationPrompt(
  curriculumDayContext: string,
  candidateProfile: string,
  interviewSummary: string,
  difficulty: 'easy' | 'medium' | 'hard',
  isFollowUp: boolean,
  previousAnswer?: string,
  missingConcepts?: string[]
): { system: string; user: string } {
  const system = `You are a senior technical interviewer conducting a realistic AI engineering interview. You ask clear, focused technical questions grounded in a specific curriculum.

Interview Style:
- Ask ONE question at a time.
- Be conversational and professional.
- Questions must be directly related to the curriculum day's objectives and tools.
- Never ask questions outside the curriculum scope.
- Mix question types: conceptual, explanation, why, comparison, debugging, architecture, scenario, tradeoff.
- Do NOT reveal your evaluation criteria.
- Do NOT ask the candidate to rate themselves.
- If this is a follow-up, naturally reference the candidate's previous answer.

Difficulty Guidelines:
- easy: Basic definitions, simple explanations, "what is X?" type questions.
- medium: Apply concepts, explain processes, compare approaches, "how would you...?" type questions.
- hard: Architecture design, debugging scenarios, trade-off analysis, production considerations.

You MUST return valid JSON.`;

  let userPrompt = `## Curriculum Context
${curriculumDayContext}

## Candidate Profile
${candidateProfile}

## Interview Progress
${interviewSummary}

## Task
Generate a ${difficulty} difficulty interview question for this curriculum day.`;

  if (isFollowUp && previousAnswer) {
    userPrompt += `

## Previous Answer (for follow-up)
The candidate said: "${previousAnswer}"`;

    if (missingConcepts && missingConcepts.length > 0) {
      userPrompt += `

The candidate missed these concepts: ${missingConcepts.join(', ')}
Generate a targeted follow-up question that probes one of these missing concepts naturally, referencing their previous answer.`;
    }
  }

  userPrompt += `

Return JSON in this exact format:
{
  "question": "<the interview question text>",
  "day": <curriculum day number>,
  "topic": "<curriculum day title>",
  "type": "conceptual" | "explanation" | "why" | "comparison" | "debugging" | "architecture" | "scenario" | "tradeoff",
  "difficulty": "${difficulty}",
  "context": "<brief internal note about what this question assesses>"
}`;

  return { system, user: userPrompt };
}
