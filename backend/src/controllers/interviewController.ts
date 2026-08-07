/**
 * Interview Controller
 * 
 * Handles the single POST /api/interview endpoint as defined
 * in the Technical Specification. Routes between:
 *   - Start interview (when `candidate` field is present)
 *   - Conversation turn (when `message` field is present)
 */

import { Request, Response } from 'express';
import { startInterview, processAnswer } from '../agents/interviewAgent';
import { getSession } from '../services/sessionService';

export async function handleInterview(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId, candidate, message } = req.body;

    // ── Validation ────────────────────────────────────────────

    if (!sessionId || typeof sessionId !== 'string') {
      res.status(400).json({
        error: 'Missing or invalid sessionId. Must be a non-empty string.',
      });
      return;
    }

    // ── Route: Start Interview ────────────────────────────────
    // If `candidate` object is present, start a new interview session.

    if (candidate) {
      // Validate candidate object
      if (!candidate.member || !candidate.member.id || !candidate.member.name) {
        res.status(400).json({
          error: 'Invalid candidate object. Must include member.id and member.name.',
        });
        return;
      }

      // Check if session already exists
      const existingSession = getSession(sessionId);
      if (existingSession) {
        res.status(400).json({
          error: `Session ${sessionId} already exists. Use a new sessionId.`,
        });
        return;
      }

      console.log(`[Controller] Starting interview: sessionId=${sessionId}, candidate=${candidate.member.name}`);

      const result = await startInterview(sessionId, candidate);
      res.json(result);
      return;
    }

    // ── Route: Conversation Turn ──────────────────────────────
    // If `message` is present, process the candidate's answer.

    if (message !== undefined) {
      if (typeof message !== 'string' || message.trim().length === 0) {
        res.status(400).json({
          error: 'Message must be a non-empty string.',
        });
        return;
      }

      // Verify session exists
      const session = getSession(sessionId);
      if (!session) {
        res.status(404).json({
          error: `Session ${sessionId} not found. Start an interview first.`,
        });
        return;
      }

      console.log(`[Controller] Processing answer: sessionId=${sessionId}`);

      const result = await processAnswer(sessionId, message.trim());
      res.json(result);
      return;
    }

    // ── Invalid Request ───────────────────────────────────────

    res.status(400).json({
      error: 'Request must include either a "candidate" object (to start) or a "message" string (to continue).',
    });
  } catch (error: any) {
    console.error('[Controller] Error:', error.message || error);
    res.status(500).json({
      error: 'Internal server error. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
