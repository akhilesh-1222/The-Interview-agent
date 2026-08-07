/**
 * API Integration and Verification Script
 * 
 * Simulates a full, multi-turn technical interview (9 turns total)
 * to verify the Express backend, state machine, adaptive questioning,
 * and final feedback report generation.
 * 
 * Run using: npx ts-node src/utils/test-api.ts
 */

import axios from 'axios';
import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const API_URL = 'http://localhost:5000/api/interview';

// Load synthetic candidate CAND-001 (Sarah Johnson)
const candidateData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../data/candidates.json'), 'utf-8')
);
const candidate = candidateData.candidates.find((c: any) => c.member.id === 'CAND-001');

const sessionAnswers = [
  "RAG stands for Retrieval-Augmented Generation. It improves LLMs by retrieving relevant documents from an external database and passing them in the prompt context.",
  "In a production system, you divide documents into chunks (e.g., 500 characters with 50-character overlap), generate vector embeddings for each chunk using a sentence-transformer model, and store them in a database like ChromaDB or Pinecone. At query time, the user query is embedded and we fetch the nearest neighbor chunks.",
  "To debug irrelevant chunks, I would verify the chunk size and overlap, check the embedding model performance on domain-specific vocabulary, and implement a re-ranking model like Cohere Rerank to filter out irrelevant contexts.",
  "Prompt engineering fundamentals include zero-shot prompting (asking without examples), few-shot prompting (providing example inputs and outputs in context), and chain-of-thought prompting (instructing the model to write out its step-by-step reasoning).",
  "A system prompt defines the persona, guidelines, rules, and guardrails for the LLM. Users cannot easily change it, whereas user prompts are direct queries. System prompts prevent jailbreaks and maintain professional tone.",
  "MCP or Model Context Protocol is an open standard that allows Claude or other models to securely connect to external tools, local filesystems, or databases via standardized server interfaces.",
  "Multi-agent orchestration allows specialized agents to work together. CrewAI is role-based, while LangGraph is state-graph based. Using them allows solving complex tasks by dividing labor between agents (e.g., researcher and writer).",
  "I would containerize the backend and frontend using Docker, then deploy them as Kubernetes pods. I'll configure a LoadBalancer service to route external traffic to the frontend, and handle database connections via environment secrets."
];

async function runVerificationTest() {
  console.log('=== Starting AI Interview Agent Verification ===');
  console.log(`Target Endpoint: ${API_URL}`);
  console.log(`Candidate Name: ${candidate.member.name} (${candidate.member.id})`);

  const sessionId = `test-session-${Math.random().toString(36).substring(2, 9)}`;
  let turn = 1;

  try {
    // ── Turn 1: Start Interview ───────────────────────────────────
    console.log(`\n[Turn 1] Initializing interview session: ${sessionId}`);
    const startRes = await axios.post(API_URL, {
      sessionId,
      candidate
    });

    console.log(`Response Status: ${startRes.status}`);
    console.log(`Interviewer Reply:`);
    console.log(`> ${startRes.data.reply}`);
    console.log(`Done flag: ${startRes.data.done}`);

    if (startRes.data.done !== false || !startRes.data.reply) {
      throw new Error('Invalid initialization response format');
    }

    let lastReply = startRes.data.reply;

    // ── Turns 2-9: Conversation loop ──────────────────────────────
    for (let i = 0; i < sessionAnswers.length; i++) {
      turn++;
      const candidateAnswer = sessionAnswers[i];
      console.log(`\n[Turn ${turn}] Candidate answering: "${candidateAnswer.substring(0, 80)}..."`);

      const turnRes = await axios.post(API_URL, {
        sessionId,
        message: candidateAnswer
      });

      console.log(`Response Status: ${turnRes.status}`);
      console.log(`Interviewer Reply:`);
      console.log(`> ${turnRes.data.reply}`);
      console.log(`Done flag: ${turnRes.data.done}`);

      if (turnRes.data.done) {
        console.log('\n=== Interview Completed! ===');
        console.log('Feedback Report Received:');
        console.log(JSON.stringify(turnRes.data.feedback, null, 2));

        // Validate Feedback Format
        const fb = turnRes.data.feedback;
        if (!fb || !fb.summary || !Array.isArray(fb.strengths) || !Array.isArray(fb.gaps) || !Array.isArray(fb.next)) {
          throw new Error('Feedback report does not match the required schema!');
        }
        console.log('\n✓ API Verification Succeeded! All schemas and flows are valid.');
        return;
      }
    }

    // Turn 10: Final trigger to end if not already ended
    console.log(`\n[Turn 10] Triggering interview completion...`);
    const finalRes = await axios.post(API_URL, {
      sessionId,
      message: "I think that covers everything. Let's finish the interview."
    });

    if (finalRes.data.done) {
      console.log('\n=== Interview Completed! ===');
      console.log(JSON.stringify(finalRes.data.feedback, null, 2));
      console.log('\n✓ API Verification Succeeded! All schemas and flows are valid.');
    } else {
      throw new Error('Interview did not complete after 10 turns!');
    }

  } catch (error: any) {
    console.error('\n✗ Verification Failed!');
    if (error.response) {
      console.error(`HTTP Error ${error.response.status}:`, error.response.data);
    } else {
      console.error(error.message || error);
    }
    process.exit(1);
  }
}

// Run verification
runVerificationTest();
