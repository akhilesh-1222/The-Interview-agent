/**
 * Candidate Service
 * 
 * Loads candidate profiles and analyzes their learning journey.
 * Identifies strong topics, weak topics, skipped topics, and learning signals
 * to inform interview personalization.
 */

import * as fs from 'fs';
import * as path from 'path';

// ── Types ─────────────────────────────────────────────────────────

export interface CandidateMember {
  id: string;
  name: string;
  jobRole: string;
  yearsExperience: number;
  education: string;
  status: string;
}

export interface Mission {
  day: number;
  title: string;
  passed?: boolean;
  attempts?: number;
  skipped?: boolean;
}

export interface Signals {
  commitDays: number;
  missionsCompleted: number;
  missionsFirstTry: number;
}

export interface CandidateProfile {
  member: CandidateMember;
  missions: Mission[];
  signals: Signals;
}

export interface CandidateAnalysis {
  candidate: CandidateProfile;
  strongTopics: { day: number; title: string; reason: string }[];
  weakTopics: { day: number; title: string; reason: string }[];
  skippedTopics: { day: number; title: string }[];
  failedTopics: { day: number; title: string }[];
  completedDays: number[];
  overallStrength: 'strong' | 'medium' | 'weak';
  suggestedInitialDifficulty: 'easy' | 'medium' | 'hard';
  profileSummary: string;
}

// ── Data Loading ──────────────────────────────────────────────────

let candidatesData: { candidates: CandidateProfile[] } | null = null;

function loadCandidates(): CandidateProfile[] {
  if (candidatesData) return candidatesData.candidates;

  const dataPath = path.join(__dirname, '../../data/candidates.json');
  const raw = fs.readFileSync(dataPath, 'utf-8');
  candidatesData = JSON.parse(raw);
  console.log(`[Candidate] Loaded ${candidatesData!.candidates.length} candidate profiles`);
  return candidatesData!.candidates;
}

/**
 * Get all candidate profiles.
 */
export function getAllCandidates(): CandidateProfile[] {
  return loadCandidates();
}

/**
 * Find a candidate by ID.
 */
export function getCandidateById(id: string): CandidateProfile | undefined {
  return loadCandidates().find(c => c.member.id === id);
}

/**
 * Analyze a candidate profile to determine strong, weak, and skipped topics.
 * This analysis drives the interview personalization.
 */
export function analyzeCandidate(candidate: CandidateProfile): CandidateAnalysis {
  const strongTopics: CandidateAnalysis['strongTopics'] = [];
  const weakTopics: CandidateAnalysis['weakTopics'] = [];
  const skippedTopics: CandidateAnalysis['skippedTopics'] = [];
  const failedTopics: CandidateAnalysis['failedTopics'] = [];
  const completedDays: number[] = [];

  for (const mission of candidate.missions) {
    if (mission.skipped) {
      skippedTopics.push({ day: mission.day, title: mission.title });
      continue;
    }

    if (mission.passed === false) {
      failedTopics.push({ day: mission.day, title: mission.title });
      continue;
    }

    if (mission.passed) {
      completedDays.push(mission.day);

      if (mission.attempts === 1) {
        strongTopics.push({
          day: mission.day,
          title: mission.title,
          reason: 'Passed on first attempt',
        });
      } else if (mission.attempts && mission.attempts <= 2) {
        strongTopics.push({
          day: mission.day,
          title: mission.title,
          reason: `Passed in ${mission.attempts} attempts`,
        });
      } else if (mission.attempts && mission.attempts >= 4) {
        weakTopics.push({
          day: mission.day,
          title: mission.title,
          reason: `Required ${mission.attempts} attempts — may indicate struggle`,
        });
      } else {
        // 3 attempts — moderate
        weakTopics.push({
          day: mission.day,
          title: mission.title,
          reason: `Required ${mission.attempts} attempts`,
        });
      }
    }
  }

  // Determine overall strength
  const { commitDays, missionsCompleted, missionsFirstTry } = candidate.signals;
  const firstTryRatio = missionsFirstTry / Math.max(missionsCompleted, 1);
  const commitRatio = commitDays / 31;

  let overallStrength: 'strong' | 'medium' | 'weak';
  let suggestedInitialDifficulty: 'easy' | 'medium' | 'hard';

  if (firstTryRatio >= 0.7 && commitRatio >= 0.8) {
    overallStrength = 'strong';
    suggestedInitialDifficulty = 'hard';
  } else if (firstTryRatio >= 0.3 && commitRatio >= 0.5) {
    overallStrength = 'medium';
    suggestedInitialDifficulty = 'medium';
  } else {
    overallStrength = 'weak';
    suggestedInitialDifficulty = 'easy';
  }

  // Build profile summary
  const profileSummary = buildProfileSummary(candidate, {
    strongTopics,
    weakTopics,
    skippedTopics,
    failedTopics,
    overallStrength,
  });

  return {
    candidate,
    strongTopics,
    weakTopics,
    skippedTopics,
    failedTopics,
    completedDays,
    overallStrength,
    suggestedInitialDifficulty,
    profileSummary,
  };
}

function buildProfileSummary(
  candidate: CandidateProfile,
  analysis: {
    strongTopics: CandidateAnalysis['strongTopics'];
    weakTopics: CandidateAnalysis['weakTopics'];
    skippedTopics: CandidateAnalysis['skippedTopics'];
    failedTopics: CandidateAnalysis['failedTopics'];
    overallStrength: string;
  }
): string {
  const { member, signals } = candidate;
  const lines = [
    `Candidate: ${member.name} (${member.id})`,
    `Role: ${member.jobRole} | Experience: ${member.yearsExperience} years | Education: ${member.education}`,
    `Cohort Stats: ${signals.commitDays}/31 commit days, ${signals.missionsCompleted} missions completed, ${signals.missionsFirstTry} on first try`,
    `Overall Strength: ${analysis.overallStrength.toUpperCase()}`,
    '',
  ];

  if (analysis.strongTopics.length > 0) {
    lines.push('Strong Topics:');
    analysis.strongTopics.forEach(t => lines.push(`  ✓ Day ${t.day}: ${t.title} (${t.reason})`));
    lines.push('');
  }

  if (analysis.weakTopics.length > 0) {
    lines.push('Weak Topics:');
    analysis.weakTopics.forEach(t => lines.push(`  ⚠ Day ${t.day}: ${t.title} (${t.reason})`));
    lines.push('');
  }

  if (analysis.failedTopics.length > 0) {
    lines.push('Failed Topics:');
    analysis.failedTopics.forEach(t => lines.push(`  ✗ Day ${t.day}: ${t.title}`));
    lines.push('');
  }

  if (analysis.skippedTopics.length > 0) {
    lines.push('Skipped Topics:');
    analysis.skippedTopics.forEach(t => lines.push(`  ○ Day ${t.day}: ${t.title}`));
    lines.push('');
  }

  return lines.join('\n');
}
