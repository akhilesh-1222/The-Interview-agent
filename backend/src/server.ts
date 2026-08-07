/**
 * Express Server — AI Interview Agent Backend
 * 
 * Single entry point. Exposes POST /api/interview
 * as defined in the Technical Specification.
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { handleInterview } from './controllers/interviewController';
import { getAllCandidates, getCandidateById } from './services/candidateService';
import { getAllDays } from './services/curriculumService';
import { getSession } from './services/sessionService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ─────────────────────────────────────────────────────

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST'],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

// ── Request Logging ───────────────────────────────────────────────

app.use((req, res, next) => {
  if (req.method !== 'OPTIONS') {
    console.log(`[Server] ${req.method} ${req.path}`);
  }
  next();
});

// ── Routes ────────────────────────────────────────────────────────

// Primary interview endpoint (Technical Specification contract)
app.post('/api/interview', handleInterview);

// Get current interview state
app.get('/api/interview/:id', (req, res) => {
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: `Session ${req.params.id} not found` });
    return;
  }
  res.json(session);
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ai-interview-agent' });
});

// Candidates list (for frontend dropdown)
app.get('/api/candidates', (_req, res) => {
  try {
    const candidates = getAllCandidates();
    res.json({
      candidates: candidates.map(c => ({
        id: c.member.id,
        name: c.member.name,
        jobRole: c.member.jobRole,
        yearsExperience: c.member.yearsExperience,
        education: c.member.education,
        missionsCompleted: c.signals.missionsCompleted,
        commitDays: c.signals.commitDays,
      })),
    });
  } catch (error: any) {
    console.error('[Server] Error loading candidates:', error.message);
    res.status(500).json({ error: 'Failed to load candidates' });
  }
});

// Get a specific candidate full profile (for starting interview)
app.get('/api/candidates/:id', (req, res) => {
  try {
    const candidate = getCandidateById(req.params.id);
    if (!candidate) {
      res.status(404).json({ error: 'Candidate not found' });
      return;
    }
    res.json(candidate);
  } catch (error: any) {
    console.error('[Server] Error loading candidate:', error.message);
    res.status(500).json({ error: 'Failed to load candidate profile' });
  }
});

// Curriculum overview (for frontend reference)
app.get('/api/curriculum', (_req, res) => {
  try {
    const days = getAllDays();
    res.json({ days });
  } catch (error: any) {
    console.error('[Server] Error loading curriculum:', error.message);
    res.status(500).json({ error: 'Failed to load curriculum' });
  }
});

// ── Error Handling ────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ── Start Server ──────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║   AI Interview Agent — Backend Server        ║`);
  console.log(`║   Running on http://localhost:${PORT}            ║`);
  console.log(`║   POST /api/interview                        ║`);
  console.log(`╚══════════════════════════════════════════════╝\n`);

  // Validate data is loadable
  try {
    const candidates = getAllCandidates();
    const days = getAllDays();
    console.log(`[Server] Data loaded: ${candidates.length} candidates, ${days.length} curriculum days`);
  } catch (error: any) {
    console.error('[Server] WARNING: Failed to load data files:', error.message);
  }

  // Check API key
  if (!process.env.GEMINI_API_KEY) {
    console.warn('[Server] WARNING: GEMINI_API_KEY not set. LLM features will not work.');
  } else {
    console.log('[Server] Gemini API key configured ✓');
  }
});

export default app;
