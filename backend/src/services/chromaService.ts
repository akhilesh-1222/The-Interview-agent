/**
 * ChromaDB Vector Database Service
 * 
 * Manages two ChromaDB collections:
 *   1. curriculum_knowledge — Stores curriculum day objectives and topics as vectors
 *      for semantic retrieval during question generation.
 *   2. interview_transcripts — Stores candidate Q&A pairs as vectors for semantic
 *      history search and cross-session insight.
 * 
 * Falls back to an in-memory cosine similarity search if ChromaDB server
 * is unreachable, ensuring the application remains functional without
 * an external dependency.
 */

import { generateEmbedding, generateEmbeddings } from '../ai/embedding';
import { getAllDays } from './curriculumService';

// ── Types ─────────────────────────────────────────────────────────

interface VectorDocument {
  id: string;
  text: string;
  embedding: number[];
  metadata: Record<string, string | number>;
}

interface SearchResult {
  id: string;
  text: string;
  score: number;
  metadata: Record<string, string | number>;
}

// ── In-Memory Vector Store (Fallback) ─────────────────────────────

class InMemoryVectorStore {
  private collections: Map<string, VectorDocument[]> = new Map();

  getOrCreateCollection(name: string): VectorDocument[] {
    if (!this.collections.has(name)) {
      this.collections.set(name, []);
    }
    return this.collections.get(name)!;
  }

  add(collection: string, doc: VectorDocument): void {
    const col = this.getOrCreateCollection(collection);
    // Avoid duplicates
    const existing = col.findIndex(d => d.id === doc.id);
    if (existing !== -1) {
      col[existing] = doc;
    } else {
      col.push(doc);
    }
  }

  query(collection: string, queryEmbedding: number[], topK: number): SearchResult[] {
    const col = this.getOrCreateCollection(collection);
    if (col.length === 0) return [];

    const scored = col.map(doc => ({
      id: doc.id,
      text: doc.text,
      metadata: doc.metadata,
      score: cosineSimilarity(queryEmbedding, doc.embedding),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  count(collection: string): number {
    return this.getOrCreateCollection(collection).length;
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

// ── ChromaDB Client Wrapper ───────────────────────────────────────

let chromaClient: any = null;
let chromaConnected = false;

// Fallback in-memory store
const memoryStore = new InMemoryVectorStore();

// Collection names
const CURRICULUM_COLLECTION = 'curriculum_knowledge';
const TRANSCRIPT_COLLECTION = 'interview_transcripts';

let curriculumSeeded = false;

/**
 * Initialize ChromaDB connection.
 * Falls back to in-memory store if ChromaDB server is unreachable.
 */
export async function initChromaDB(): Promise<void> {
  const chromaUrl = process.env.CHROMA_URL || 'http://localhost:8000';

  try {
    const { ChromaClient } = await import('chromadb');
    
    // Parse URL to avoid ChromaDB 'path' deprecation warning
    let host = 'localhost';
    let port = 8000;
    let ssl = false;
    try {
      const parsed = new URL(chromaUrl);
      host = parsed.hostname || 'localhost';
      port = parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'https:' ? 443 : 8000);
      ssl = parsed.protocol === 'https:';
    } catch {
      // Use defaults if URL parsing fails
    }

    chromaClient = new ChromaClient({ host, port, ssl });

    // Test connection with heartbeat
    await chromaClient.heartbeat();
    chromaConnected = true;
    console.log(`[ChromaDB] Connected to ChromaDB at ${chromaUrl} ✓`);

    // Ensure collections exist
    await chromaClient.getOrCreateCollection({ name: CURRICULUM_COLLECTION });
    await chromaClient.getOrCreateCollection({ name: TRANSCRIPT_COLLECTION });
    console.log('[ChromaDB] Collections initialized ✓');
  } catch (error: any) {
    chromaConnected = false;
    console.warn(`[ChromaDB] Could not connect to ChromaDB at ${chromaUrl}: ${error.message}`);
    console.warn('[ChromaDB] Falling back to in-memory vector store. All features remain operational.');
  }
}

/**
 * Check whether ChromaDB is connected or using fallback.
 */
export function isChromaConnected(): boolean {
  return chromaConnected;
}

// ── Curriculum Knowledge Indexing ─────────────────────────────────

/**
 * Seed all curriculum days into the vector store.
 * Each day's title + objectives are combined into a single document.
 */
export async function seedCurriculumEmbeddings(): Promise<void> {
  if (curriculumSeeded) {
    console.log('[ChromaDB] Curriculum already seeded, skipping.');
    return;
  }

  console.log('[ChromaDB] Seeding curriculum knowledge base...');

  const days = getAllDays();
  const documents: { id: string; text: string; metadata: Record<string, string | number> }[] = [];

  for (const day of days) {
    const text = [
      `Day ${day.day}: ${day.title}`,
      `Type: ${day.type}`,
      `Tools: ${day.tools.join(', ')}`,
      `Objectives:`,
      ...day.objectives.map((obj, i) => `${i + 1}. ${obj}`),
    ].join('\n');

    documents.push({
      id: `day-${day.day}`,
      text,
      metadata: {
        day: day.day,
        title: day.title,
        type: day.type,
      },
    });
  }

  // Generate embeddings in batch
  const texts = documents.map(d => d.text);
  
  try {
    const embeddings = await generateEmbeddings(texts);

    if (chromaConnected) {
      // Store in ChromaDB
      const collection = await chromaClient.getCollection({ name: CURRICULUM_COLLECTION });
      await collection.add({
        ids: documents.map(d => d.id),
        documents: texts,
        embeddings: embeddings,
        metadatas: documents.map(d => d.metadata),
      });
    }

    // Always store in memory too (for fast local queries)
    for (let i = 0; i < documents.length; i++) {
      memoryStore.add(CURRICULUM_COLLECTION, {
        id: documents[i].id,
        text: documents[i].text,
        embedding: embeddings[i],
        metadata: documents[i].metadata,
      });
    }

    curriculumSeeded = true;
    console.log(`[ChromaDB] Seeded ${documents.length} curriculum days ✓`);
  } catch (error: any) {
    console.error('[ChromaDB] Error seeding curriculum:', error.message);
    console.warn('[ChromaDB] Curriculum seeding failed. Vector search will be unavailable, but the app will continue working.');
  }
}

/**
 * Query the curriculum knowledge base for relevant topics.
 * Used to enrich question generation prompts with semantically relevant curriculum context.
 */
export async function queryRelevantCurriculum(
  queryText: string,
  topK: number = 3
): Promise<SearchResult[]> {
  try {
    const queryEmbedding = await generateEmbedding(queryText);

    if (chromaConnected) {
      const collection = await chromaClient.getCollection({ name: CURRICULUM_COLLECTION });
      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: topK,
      });

      if (results.documents && results.documents[0]) {
        return results.documents[0].map((doc: string, i: number) => ({
          id: results.ids[0][i],
          text: doc,
          score: results.distances ? 1 - (results.distances[0][i] || 0) : 0,
          metadata: results.metadatas?.[0]?.[i] || {},
        }));
      }
    }

    // Fallback to in-memory
    return memoryStore.query(CURRICULUM_COLLECTION, queryEmbedding, topK);
  } catch (error: any) {
    console.error('[ChromaDB] Error querying curriculum:', error.message);
    return [];
  }
}

// ── Interview Transcript Indexing ─────────────────────────────────

/**
 * Index a candidate's answer in the vector store.
 * Enables semantic retrieval of past answers for evaluation context.
 */
export async function indexAnswerEmbedding(
  sessionId: string,
  candidateId: string,
  day: number,
  question: string,
  answer: string,
  score: number
): Promise<void> {
  const docId = `${sessionId}-q${Date.now()}`;
  const text = `Question: ${question}\nAnswer: ${answer}`;

  try {
    const embedding = await generateEmbedding(text);

    const metadata: Record<string, string | number> = {
      sessionId,
      candidateId,
      day,
      score,
      timestamp: new Date().toISOString(),
    };

    if (chromaConnected) {
      const collection = await chromaClient.getCollection({ name: TRANSCRIPT_COLLECTION });
      await collection.add({
        ids: [docId],
        documents: [text],
        embeddings: [embedding],
        metadatas: [metadata],
      });
    }

    // Always store in memory
    memoryStore.add(TRANSCRIPT_COLLECTION, {
      id: docId,
      text,
      embedding,
      metadata,
    });
  } catch (error: any) {
    // Non-critical — log but don't crash
    console.error('[ChromaDB] Error indexing answer:', error.message);
  }
}

/**
 * Query past candidate answers by semantic similarity.
 * Used to retrieve relevant historical context for evaluation.
 */
export async function queryCandidatePastAnswers(
  candidateId: string,
  queryText: string,
  topK: number = 3
): Promise<SearchResult[]> {
  try {
    const queryEmbedding = await generateEmbedding(queryText);

    if (chromaConnected) {
      const collection = await chromaClient.getCollection({ name: TRANSCRIPT_COLLECTION });
      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: topK * 2, // Fetch extra to filter by candidateId
        where: { candidateId },
      });

      if (results.documents && results.documents[0]) {
        return results.documents[0]
          .map((doc: string, i: number) => ({
            id: results.ids[0][i],
            text: doc,
            score: results.distances ? 1 - (results.distances[0][i] || 0) : 0,
            metadata: results.metadatas?.[0]?.[i] || {},
          }))
          .slice(0, topK);
      }
    }

    // Fallback: in-memory query + filter by candidateId
    const allResults = memoryStore.query(TRANSCRIPT_COLLECTION, queryEmbedding, topK * 2);
    return allResults
      .filter(r => r.metadata.candidateId === candidateId)
      .slice(0, topK);
  } catch (error: any) {
    console.error('[ChromaDB] Error querying candidate history:', error.message);
    return [];
  }
}

/**
 * Build a formatted context string from vector search results.
 * Used to inject into LLM prompts as supplementary context.
 */
export function formatVectorContext(results: SearchResult[], label: string): string {
  if (results.length === 0) return '';

  const lines = [`\n## ${label} (Vector Retrieved)`];
  results.forEach((r, i) => {
    lines.push(`--- Result ${i + 1} (similarity: ${r.score.toFixed(3)}) ---`);
    lines.push(r.text);
  });

  return lines.join('\n');
}
