/**
 * Gemini LLM Abstraction Layer
 * 
 * Centralized LLM provider with structured JSON output support,
 * retry logic, and safe fallback handling. All AI calls go through here.
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('[LLM] WARNING: GEMINI_API_KEY is not set. LLM calls will fail.');
}

const genAI = new GoogleGenerativeAI(API_KEY || '');

let model: GenerativeModel;

function getModel(): GenerativeModel {
  if (!model) {
    model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 4096,
      },
    });
  }
  return model;
}

/**
 * Generate a structured JSON response from Gemini.
 * Includes retry logic and safe fallback parsing.
 */
export async function generateJSON<T>(
  prompt: string,
  systemInstruction: string,
  fallback: T,
  maxRetries: number = 2
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const m = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        systemInstruction,
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      });

      const result = await m.generateContent(prompt);
      const text = result.response.text();

      // Try to parse JSON from the response
      const parsed = extractJSON<T>(text);
      if (parsed !== null) {
        return parsed;
      }

      console.warn(`[LLM] Attempt ${attempt + 1}: Failed to parse JSON, retrying...`);
    } catch (error: any) {
      console.error(`[LLM] Attempt ${attempt + 1} error:`, error.message || error);
      if (attempt === maxRetries) {
        console.error('[LLM] All retries exhausted, using fallback.');
        return fallback;
      }
    }
  }

  return fallback;
}

/**
 * Generate a plain text response from Gemini.
 */
export async function generateText(
  prompt: string,
  systemInstruction: string
): Promise<string> {
  try {
    const m = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction,
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 2048,
      },
    });

    const result = await m.generateContent(prompt);
    return result.response.text().trim();
  } catch (error: any) {
    console.error('[LLM] Text generation error:', error.message || error);
    return 'I apologize, but I encountered an issue generating a response. Let me continue with the next question.';
  }
}

/**
 * Extract JSON from LLM response text.
 * Handles cases where the LLM wraps JSON in markdown code blocks.
 */
function extractJSON<T>(text: string): T | null {
  try {
    // Direct parse
    return JSON.parse(text) as T;
  } catch {
    // Try extracting from markdown code block
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim()) as T;
      } catch {
        // Fall through
      }
    }

    // Try finding JSON object/array in text
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]) as T;
      } catch {
        // Fall through
      }
    }

    return null;
  }
}
