# Requirements Analysis — AI Interview Agent

## Executive Summary
The **AI Interview Agent** is an adaptive, curriculum-aware technical interviewer built for the 31-day ABTalks AI Engineering Cohort. It evaluates candidates through a multi-turn conversation, dynamically adapting question difficulty, probing weak/missing concepts, and generating structured post-interview feedback.

---

## 1. Hackathon Data Sources

### Curriculum (`curriculum.json`)
- **Structure**: 31 Days divided into 8 Modules.
- **Modules**:
  1. Environment & Tooling (Days 1–3)
  2. Data Foundations (Days 4–6)
  3. Embeddings & Vector Search (Days 7–10)
  4. LLM Core, Prompting & Fine-Tuning (Days 11–15)
  5. Chatbot Application Build (Days 16–20)
  6. Agentic AI & MCP (Days 21–24)
  7. Evaluation, Security & Deployment (Days 25–28)
  8. Production & Capstone (Days 29–31)
- **Day Schema**: `day`, `title`, `type` (`SETUP` | `BUILD` | `AI_CORE` | `SHIP_IT` | `LEARN` | `OPTIMIZE` | `CAPSTONE`), `tools` (array of strings), `objectives` (array of strings).

### Candidate Profiles (`candidates.json`)
- **Schema**: Array of candidate records (`CAND-001` through `CAND-020`).
- **Fields**:
  - `member`: `{ id, name, jobRole, yearsExperience, education, status }`
  - `missions`: Array of `{ day, title, passed, attempts, skipped }`
  - `signals`: `{ commitDays, missionsCompleted, missionsFirstTry }`

---

## 2. Technical Specification & API Contract (`technical-spec.md`)

The authoritative API contract requires **a single HTTP endpoint**:

```http
POST /api/interview
```

### Request Types:

#### A. Initial Request (Start Interview)
```json
{
  "sessionId": "abc-123",
  "candidate": { ... candidate object ... }
}
```
**Response**:
```json
{
  "reply": "Welcome. Let's begin your interview. [First Question]",
  "done": false
}
```

#### B. Subsequent Request (Conversation Turn)
```json
{
  "sessionId": "abc-123",
  "message": "Candidate's answer text"
}
```
**Response**:
```json
{
  "reply": "Follow-up question or new topic question",
  "done": false
}
```

#### C. Final Request (Interview Complete)
When interview conditions are satisfied (minimum 8 questions across at least 4 curriculum days):
```json
{
  "reply": "Interview completed. Thank you!",
  "done": true,
  "feedback": {
    "summary": "High-level summary of candidate performance...",
    "strengths": ["Strong understanding of RAG pipelines", "..."],
    "gaps": ["Lacks clarity on vector indexing trade-offs", "..."],
    "next": ["Revise Day 8 Vector Databases", "..."]
  }
}
```

---

## 3. Core Functional & Algorithmic Requirements

1. **Curriculum Grounding**: Questions must directly stem from curriculum days, objectives, and tools.
2. **Candidate Awareness**: Initial questions and difficulty adapt to candidate's missions (passed on 1st try = high difficulty; multiple attempts = foundational; skipped = gentle assessment).
3. **Adaptive State Machine**:
   - Minimum 8 questions asked.
   - Minimum 4 distinct curriculum days covered.
   - Decision engine evaluates each answer:
     - `FOLLOW_UP`: probe missing concepts.
     - `INCREASE_DIFFICULTY`: high score (>= 8).
     - `DECREASE_DIFFICULTY`: low score (< 5).
     - `CHANGE_TOPIC`: move to next curriculum day when topic is sufficiently assessed.
4. **Resilient LLM Output**: All evaluation and feedback generation use Zod structured schemas with safe fallbacks if LLM output fails validation.
5. **No Hallucinations**: Standardized candidate analysis without exposing raw prompts or chain-of-thought to the user.
