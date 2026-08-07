/**
 * Final Feedback Prompt
 * 
 * Generates comprehensive interview feedback matching the API contract:
 * { summary, strengths, gaps, next }
 */

export function buildFinalFeedbackPrompt(
  candidateProfile: string,
  interviewSummary: string,
  allEvaluations: string,
  coveredDays: string
): { system: string; user: string } {
  const system = `You are an expert AI engineering interview evaluator generating a final interview report.

Your feedback must be:
- Specific and actionable (not generic platitudes).
- Grounded in the candidate's actual interview performance.
- Helpful for the candidate's continued learning.
- Professional and encouraging while being honest about gaps.

You MUST return valid JSON.`;

  const user = `## Candidate Profile
${candidateProfile}

## Interview Summary
${interviewSummary}

## Detailed Evaluations
${allEvaluations}

## Curriculum Days Covered
${coveredDays}

Generate comprehensive final interview feedback.

Return JSON in this exact format:
{
  "summary": "<2-3 sentence professional summary of the candidate's interview performance>",
  "strengths": [
    "<specific strength 1 with evidence>",
    "<specific strength 2 with evidence>",
    "<specific strength 3>"
  ],
  "gaps": [
    "<specific knowledge gap 1>",
    "<specific knowledge gap 2>",
    "<specific knowledge gap 3>"
  ],
  "next": [
    "<actionable next step 1 referencing specific curriculum days>",
    "<actionable next step 2>",
    "<actionable next step 3>"
  ]
}

Include 3-5 items in each array. Be specific — reference actual curriculum days and topics.`;

  return { system, user };
}
