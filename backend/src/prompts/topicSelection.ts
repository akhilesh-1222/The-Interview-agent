/**
 * Topic Selection Prompt
 * 
 * Generates the prompt for selecting which curriculum days to cover
 * during the interview, based on the candidate's profile.
 */

export function buildTopicSelectionPrompt(
  candidateProfile: string,
  curriculumOverview: string
): { system: string; user: string } {
  const system = `You are an intelligent interview topic selector for an AI engineering cohort. Your job is to analyze a candidate's learning profile and select the most impactful curriculum days to assess during a technical interview.

Selection Principles:
- Select 5-7 curriculum days to assess.
- Prioritize weak topics where the candidate struggled (high attempts, failures).
- Include strong topics to assess depth with harder questions.
- Include at least one skipped topic (basic question only).
- Ensure coverage across different modules (at least 4 modules).
- Consider the candidate's job role and experience level.
- Avoid selecting purely setup days (Day 1, 2) unless they struggled with them.

You MUST return valid JSON.`;

  const user = `## Candidate Profile
${candidateProfile}

## Curriculum Overview
${curriculumOverview}

Based on this candidate's learning journey, select 5-7 curriculum days for a technical interview. For each day, explain why you chose it and suggest an initial difficulty level.

Return JSON in this exact format:
{
  "selectedDays": [
    {
      "day": <number>,
      "title": "<day title>",
      "reason": "<why this day was selected>",
      "suggestedDifficulty": "easy" | "medium" | "hard"
    }
  ]
}`;

  return { system, user };
}
