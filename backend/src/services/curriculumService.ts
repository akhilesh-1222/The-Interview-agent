/**
 * Curriculum Service
 * 
 * Loads and queries the 31-day AI Cohort curriculum.
 * Provides topic lookup, day details, module mapping, and curriculum context
 * for grounding interview questions.
 */

import * as fs from 'fs';
import * as path from 'path';

interface CurriculumDay {
  day: number;
  title: string;
  type: string;
  tools: string[];
  objectives: string[];
}

interface Module {
  n: number;
  title: string;
  days: number[];
}

interface Curriculum {
  cohort: string;
  modules: Module[];
  days: CurriculumDay[];
}

let curriculum: Curriculum | null = null;

function loadCurriculum(): Curriculum {
  if (curriculum) return curriculum;

  const dataPath = path.join(__dirname, '../../data/curriculum.json');
  const raw = fs.readFileSync(dataPath, 'utf-8');
  curriculum = JSON.parse(raw) as Curriculum;
  console.log(`[Curriculum] Loaded ${curriculum.days.length} days across ${curriculum.modules.length} modules`);
  return curriculum;
}

/**
 * Get all curriculum days.
 */
export function getAllDays(): CurriculumDay[] {
  return loadCurriculum().days;
}

/**
 * Get a specific curriculum day by number.
 */
export function getDay(dayNumber: number): CurriculumDay | undefined {
  return loadCurriculum().days.find(d => d.day === dayNumber);
}

/**
 * Get all modules.
 */
export function getModules(): Module[] {
  return loadCurriculum().modules;
}

/**
 * Get the module that a day belongs to.
 */
export function getModuleForDay(dayNumber: number): Module | undefined {
  const mods = loadCurriculum().modules;
  return mods.find(m => {
    const [start, end] = m.days;
    return dayNumber >= start && dayNumber <= end;
  });
}

/**
 * Build a compact curriculum context string for a specific day.
 * Used to ground LLM prompts without sending the entire curriculum.
 */
export function getDayContext(dayNumber: number): string {
  const day = getDay(dayNumber);
  if (!day) return `Day ${dayNumber}: Not found in curriculum.`;

  const mod = getModuleForDay(dayNumber);
  const moduleInfo = mod ? `Module ${mod.n}: ${mod.title}` : 'Unknown Module';

  return [
    `Day ${day.day}: ${day.title}`,
    `Module: ${moduleInfo}`,
    `Type: ${day.type}`,
    `Tools: ${day.tools.join(', ')}`,
    `Learning Objectives:`,
    ...day.objectives.map((obj, i) => `  ${i + 1}. ${obj}`),
  ].join('\n');
}

/**
 * Build context for multiple days at once.
 */
export function getMultipleDaysContext(dayNumbers: number[]): string {
  return dayNumbers.map(d => getDayContext(d)).join('\n\n---\n\n');
}

/**
 * Get all day numbers in the curriculum.
 */
export function getAllDayNumbers(): number[] {
  return loadCurriculum().days.map(d => d.day);
}

/**
 * Get a brief summary of the full curriculum (for initial topic selection).
 */
export function getCurriculumOverview(): string {
  const c = loadCurriculum();
  const lines = [
    `Cohort: ${c.cohort}`,
    '',
    'Modules:',
    ...c.modules.map(m => `  Module ${m.n}: ${m.title} (Days ${m.days[0]}–${m.days[1]})`),
    '',
    'All Days:',
    ...c.days.map(d => `  Day ${d.day}: ${d.title} [${d.type}]`),
  ];
  return lines.join('\n');
}
