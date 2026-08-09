# 📄 Prompt History & Vibe-Coding Transcript (PROMPTS.md)

This file documents the interactive prompts, decisions, and development journey of the **AI Interview Agent** build during this pair-programming session.

---

## 🛠️ Phase 1: Diagnostics & API Debugging

### Prompt 1: Understanding Backend Output
> **User Request:**
> *[Logs from backend showing ChromaDB failing to connect, falling back to in-memory, and seeding curriculum]*
> `ye kya bata raha hai`

* **Action:** Decoded the backend logs. Confirmed the server was up on port 5000, candidates/curriculum were loaded into memory, and ChromaDB gracefully fell back to the local in-memory cosine similarity engine.

### Prompt 2: Database Stack Verification
> **User Request:**
> `kya isme mongodb database ka use kiya gaya hai`

* **Action:** Analyzed `package.json` dependencies and codebase. Confirmed MongoDB is not used. Instead, the project stores candidate profiles in static JSON files, and uses ChromaDB (or an In-Memory Array/Map fallback) for semantic search.

### Prompt 3: Explaining In-Memory Vector Store
> **User Request:**
> `ye in memory vector store kya hai`

* **Action:** Walked through `chromaService.ts` code, explaining how RAM-based arrays and mathematical Cosine Similarity equations perform vector searching without an external DB.

### Prompt 4: Explaining Vector Conversion
> **User Request:**
> `data ko vector me kaun convert kar raha hai`

* **Action:** Identified `src/ai/embedding.ts` using Google Gemini's `text-embedding-004` (Primary) and a local mathematical Sine-Trigonometry formula (Fallback) for generating dimensions.

### Prompt 5: Debugging Gemini Embedding Model 404 Error
> **User Request:**
> `dekho gemini ka embidding engine kyo nahi work kar raha hai`

* **Action:** 
  1. Ran a test script to query supported embedding models for the user's API Key.
  2. Identified that `text-embedding-004` returned a `404 Not Found` error.
  3. Switched the `EMBEDDING_MODEL` in `.env` to `gemini-embedding-001`.
  4. Verified that embedding generation scaled successfully to 3072 dimensions.

---

## 🎨 Phase 2: Hackathon-Winning UI Design Revamp

### Prompt 6: Revamping Frontend UI
> **User Request:**
> `mere project ka jo ui hai mujhe accha nahi lag raha hai ise hackathone winning ui bana do`

* **Action:**
  * Created layout updates, custom animations, and a rich dark cosmic aesthetic in `globals.css`.
  * Redesigned `page.tsx` (Landing page) with glowing gradient titles, custom floating ambient orbs, and interactive candidate profile cards.
  * Redesigned `interview/page.tsx` with a curriculum tracker sidebar, custom animated typing dots, and responsive chat bubbles.
  * Redesigned `feedback/page.tsx` with custom SVG-animated evaluation score rings and layout grids.

### Prompt 7: Resolving CSS Import Violations
> **User Request:**
> `[PostCSS compilation error: @import rules must precede all rules]`

* **Action:** Fixed the ordering in `globals.css` by shifting the Google Fonts `@import` declaration above the Tailwind CSS `@import` rule.

### Prompt 8: Removing Brand Mentions
> **User Request:**
> `ye jo landig page par powered by me gemini ai ka name hatao`

* **Action:** Updated `page.tsx` top badge to say `"ABTalks AI Cohort · Adaptive Interviewer"` and cleaned up the footer metadata.

---

## 🤖 Phase 3: AI Evaluator Calibration

### Prompt 9: Fixing "Generous" LLM Evaluations
> **User Request:**
> `jab mai chat kar raha hu to mere galat jawab par bhi ye chatbot kah raha hai excellent kya chatbot ko mere answer samajh nahi aur rah hai kya`

* **Action:**
  1. Added score-aware transitional rules in `interviewAgent.ts`. If score is `<= 2` (or irrelevant), the bot responds with direct critique ("That response wasn't relevant...") instead of saying "Great!".
  2. Tightened prompts in `answerEvaluation.ts` to strictly grade empty/non-answers (like *"i don't know"*, *"how are you"*) with `0` score.

---

## 📂 Phase 4: Production Dropdown Fixes & Deployment

### Prompt 10: Fixing Cut-off Candidate Dropdown
> **User Request:**
> `dropdown par click karne par sare student dika nahi raha hai fix this`

* **Action:** Modified candidate menu classes in `page.tsx` to add `max-h-64` and `overflow-y-auto` allowing users to scroll through all 20 loaded profiles.

### Prompt 11: Deployment Architecture Questions
> **User Request:**
> `is this project ready for deployment if yes then where can i deploy this`

* **Action:** Provided step-by-step guidance for deploying the decoupled stack: Next.js frontend to **Vercel** and Node.js backend to **Render/Railway** using the local In-Memory DB.

### Prompt 12: Backend Deployment Troubleshooting
> **User Request:**
> `[Render log showing Error: Cannot find module '/opt/render/project/src/backend/dist/server.js']`

* **Action:** Identified that TypeScript compilation was skipped on Render. Configured Render Build Command to run `npm install && npm run build` to output JS files.

### Prompt 13: Configuring Environment variables
> **User Request:**
> `frontend ki .env file kaha hai`

* **Action:** Replaced all hardcoded backend APIs with `process.env.NEXT_PUBLIC_API_URL` and created `.env.local` to enable Vercel to dynamically bind backend requests.

### Prompt 14: Vercel Directory Setup Help
> **User Request:**
> `frontend deploy ke baad ye error aa raha hai [404: NOT_FOUND]`
> `general setting me root directory hai hi nahi`

* **Action:** Identified that Vercel was misconfigured to route inside `/frontend/frontend`. Guided the user to configure the Vercel workspace imports to use the base directory correctly.
