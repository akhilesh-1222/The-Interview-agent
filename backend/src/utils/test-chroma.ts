/**
 * ChromaDB Integration Test Script
 * 
 * Tests:
 *   1. Gemini embedding generation (text-embedding-004)
 *   2. ChromaDB initialization (with fallback to in-memory)
 *   3. Curriculum seeding into vector store
 *   4. Semantic similarity search on curriculum
 *   5. Answer indexing and candidate history retrieval
 * 
 * Usage: npx ts-node-dev src/utils/test-chroma.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { generateEmbedding, generateEmbeddings } from '../ai/embedding';
import {
  initChromaDB,
  seedCurriculumEmbeddings,
  isChromaConnected,
  queryRelevantCurriculum,
  indexAnswerEmbedding,
  queryCandidatePastAnswers,
  formatVectorContext,
} from '../services/chromaService';

async function runTests() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   ChromaDB Integration Test Suite            ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // ── Test 1: Embedding Generation ────────────────────────────────
  console.log('━━━ Test 1: Embedding Generation ━━━');
  try {
    const text = 'Vector databases store embeddings for semantic search.';
    const embedding = await generateEmbedding(text);
    console.log(`✓ Generated embedding for single text`);
    console.log(`  Dimensions: ${embedding.length}`);
    console.log(`  First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
  } catch (error: any) {
    console.error(`✗ Embedding generation failed: ${error.message}`);
    console.error('  Make sure GEMINI_API_KEY is set in .env');
    return;
  }

  // ── Test 2: Batch Embeddings ────────────────────────────────────
  console.log('\n━━━ Test 2: Batch Embeddings ━━━');
  try {
    const texts = [
      'What are vector embeddings?',
      'How does cosine similarity work?',
      'Explain RAG architecture.',
    ];
    const embeddings = await generateEmbeddings(texts);
    console.log(`✓ Generated ${embeddings.length} embeddings`);
    embeddings.forEach((e, i) => {
      console.log(`  Text ${i + 1}: ${texts[i].substring(0, 40)}... → ${e.length} dimensions`);
    });
  } catch (error: any) {
    console.error(`✗ Batch embedding failed: ${error.message}`);
  }

  // ── Test 3: ChromaDB Initialization ─────────────────────────────
  console.log('\n━━━ Test 3: ChromaDB Initialization ━━━');
  await initChromaDB();
  console.log(`  Mode: ${isChromaConnected() ? 'ChromaDB Server' : 'In-Memory Fallback'}`);

  // ── Test 4: Curriculum Seeding ──────────────────────────────────
  console.log('\n━━━ Test 4: Curriculum Seeding ━━━');
  try {
    await seedCurriculumEmbeddings();
    console.log('✓ Curriculum seeded successfully');
  } catch (error: any) {
    console.error(`✗ Curriculum seeding failed: ${error.message}`);
    return;
  }

  // ── Test 5: Semantic Curriculum Search ──────────────────────────
  console.log('\n━━━ Test 5: Semantic Curriculum Search ━━━');
  const queries = [
    'How do vector embeddings and similarity search work?',
    'What is prompt engineering and how to design effective prompts?',
    'How to build AI agents with tool calling?',
  ];

  for (const query of queries) {
    try {
      const results = await queryRelevantCurriculum(query, 3);
      console.log(`\n  Query: "${query}"`);
      if (results.length === 0) {
        console.log('  → No results found');
      } else {
        results.forEach((r, i) => {
          const title = r.text.split('\n')[0];
          console.log(`  → ${i + 1}. ${title} (score: ${r.score.toFixed(3)})`);
        });
      }
    } catch (error: any) {
      console.error(`  ✗ Query failed: ${error.message}`);
    }
  }

  // ── Test 6: Answer Indexing & Retrieval ─────────────────────────
  console.log('\n━━━ Test 6: Answer Indexing & Retrieval ━━━');
  const testSessionId = 'test-session-001';
  const testCandidateId = 'test-candidate-001';

  // Index some test answers
  const testQAs = [
    {
      day: 7,
      question: 'What is a vector embedding?',
      answer: 'A vector embedding is a numerical representation of text in a high-dimensional space, where semantically similar texts are close together.',
      score: 8,
    },
    {
      day: 12,
      question: 'What is prompt engineering?',
      answer: 'Prompt engineering is designing effective prompts for LLMs using techniques like few-shot examples, chain-of-thought, and system instructions.',
      score: 9,
    },
  ];

  for (const qa of testQAs) {
    try {
      await indexAnswerEmbedding(testSessionId, testCandidateId, qa.day, qa.question, qa.answer, qa.score);
      console.log(`✓ Indexed: "${qa.question.substring(0, 40)}..."`);
    } catch (error: any) {
      console.error(`✗ Index failed: ${error.message}`);
    }
  }

  // Query past answers
  try {
    const pastAnswers = await queryCandidatePastAnswers(
      testCandidateId,
      'vector embeddings and similarity',
      2
    );
    console.log(`\n  Past answer search for: "vector embeddings and similarity"`);
    if (pastAnswers.length === 0) {
      console.log('  → No past answers found');
    } else {
      pastAnswers.forEach((r, i) => {
        console.log(`  → ${i + 1}. Score: ${r.score.toFixed(3)}`);
        console.log(`     ${r.text.substring(0, 100)}...`);
      });
    }

    // Test formatVectorContext
    const formatted = formatVectorContext(pastAnswers, 'Test Context');
    console.log(`\n  Formatted context preview (${formatted.length} chars):`);
    console.log(`  ${formatted.substring(0, 150)}...`);
  } catch (error: any) {
    console.error(`✗ Past answer query failed: ${error.message}`);
  }

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   All Tests Completed                        ║');
  console.log('╚══════════════════════════════════════════════╝');
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
