# AI Interview Agent

An adaptive, curriculum-aware technical interview simulator built for the **ABTalks AI Engineering Cohort**. This system reasons about a candidate's learning journey and dynamically adapts its questions, difficulty, and follow-ups to conduct a realistic technical interview.

---

## 🚀 Key Features

* **Tailored Personalization**: Analyzes candidate profiles (completed/skipped missions, attempts, and overall performance signals) to customize the interview topic sequence.
* **Dynamic State Machine**: Tracks interview progression to ensure at least **8 questions** are asked covering at least **4 distinct curriculum areas**.
* **Adaptive Follow-Up System**: Evaluates every candidate response in real-time, deciding whether to drill deeper (targeted follow-up), adjust difficulty, or change topics.
* **Structured Evaluation Dashboard**: Generates comprehensive post-interview feedback highlighting strengths, knowledge gaps, and an actionable revision plan.
* **Resilient Architecture**: Centralized LLM interface using Gemini with Zod schema validation and safe fallback responses.

---

## 🛠️ Technology Stack

* **Frontend**: Next.js 15+, React, Tailwind CSS v4, Lucide Icons, TypeScript
* **Backend**: Node.js, Express, TypeScript, Zod, Axios
* **AI Provider**: Google Gemini API (`gemini-2.0-flash`)

---

## 📂 Project Structure

```text
ai-interview-agent/
├── backend/
│   ├── data/                 # Hackathon JSON dataset (curriculum, candidates)
│   ├── src/
│   │   ├── ai/               # LLM provider interface
│   │   ├── agents/           # Topic selector, state machine, evaluator
│   │   ├── services/         # Candidate, Curriculum, and Session services
│   │   ├── prompts/          # Grounded prompt templates
│   │   ├── schemas/          # Zod output validation schemas
│   │   ├── controllers/      # API controller mapping
│   │   ├── utils/            # Verification/Testing scripts
│   │   └── server.ts         # Express server entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js App Router (Landing, Interview, Feedback)
│   │   └── ...
│   ├── package.json
│   └── next.config.ts
├── docs/
│   ├── REQUIREMENTS_ANALYSIS.md
│   └── ARCHITECTURE.md
└── README.md
```

---

## 🔧 Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Google Gemini API Key

### 1. Clone & Configure Environment
Create a `.env` file in the `backend/` directory:
```env
GEMINI_API_KEY=your_gemini_api_key
PORT=5000
FRONTEND_URL=http://localhost:3000
```

### 2. Start Backend Server
```bash
cd backend
npm install
npm run build
npm run dev
```
The backend server will run on `http://localhost:5000`.

### 3. Start Frontend Dev Server
```bash
cd ../frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser to start the app.

---

## 🧪 Testing & Verification

### Automated Integration Script
You can simulate a full 9-turn adaptive interview end-to-end to verify Zod schemas and API contracts:

1. Ensure the backend server is running:
   ```bash
   cd backend
   npm run dev
   ```
2. In another terminal, run the test script:
   ```bash
   cd backend
   npx ts-node src/utils/test-api.ts
   ```

---

## 📊 API Reference

### `POST /api/interview`
Exposes the single required endpoint defined in the technical specification.

#### Start Interview
- **Request Body**:
  ```json
  {
    "sessionId": "session-unique-id",
    "candidate": { ... candidate profile from candidates.json ... }
  }
  ```
- **Response**:
  ```json
  {
    "reply": "Welcome message and first technical question...",
    "done": false
  }
  ```

#### Conversation Turn
- **Request Body**:
  ```json
  {
    "sessionId": "session-unique-id",
    "message": "Candidate's response text"
  }
  ```
- **Response**:
  ```json
  {
    "reply": "Next adaptive question or follow-up...",
    "done": false
  }
  ```

#### End Interview
- **Response**:
  ```json
  {
    "reply": "Thank you for completing the interview.",
    "done": true,
    "feedback": {
      "summary": "High-level summary of candidate's technical skills...",
      "strengths": ["Strong understanding of RAG", "..."],
      "gaps": ["Lacks clarity on vector embedding choices", "..."],
      "next": ["Review Day 8: Vector Databases", "..."]
    }
  }
  ```