import type { PlannedExercise, WorkoutSplitDay } from '../types';
import { defaultWorkoutSplit, generateId } from './defaults';

interface DayCandidate {
  dayIndex: number;
  rawTitle: string;
  detail: string;
  content: string[];
  exercises: PlannedExercise[];
  notes: string;
  isRest: boolean;
}

export interface WorkoutSplitParseResult {
  days: WorkoutSplitDay[];
  exerciseCount: number;
  restDayCount: number;
  warnings: string[];
}

const dayHeaderPattern = /^\s*day\s*([1-7])\s*[-:]\s*(.+?)\s*$/i;
const stopHeaderPattern = /^\s*(notes?|summary|progression|warm[- ]?up)\s*$/i;
const dividerPattern = /^[-=_\s]{5,}$/;
const categoryPattern = /^[A-Z][A-Z0-9 /+&()'-]{1,32}$/;

const titleCase = (value: string) =>
  value
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
    .replace(/\bSa\b/g, 'SA')
    .replace(/\bIso\b/g, 'ISO');

const clean = (value: string) => value.replace(/\s+/g, ' ').trim();

const splitHeaderTitle = (rawTitle: string) => {
  const [titlePart, detailPart = ''] = rawTitle.split('|');
  const title = clean(titlePart.replace(/\([^)]*\)/g, ''));
  const parenDetails = [...titlePart.matchAll(/\(([^)]+)\)/g)].map((match) => match[1]).join(' ');
  const detail = clean([detailPart, parenDetails].filter(Boolean).join(' '));

  return {
    title: title || 'Workout',
    detail
  };
};

const parseWeight = (value: string) => {
  const match = value.match(/(\d+(?:\.\d+)?)\s*kg\b/i);
  return match ? Number.parseFloat(match[1]) : 0;
};

const parseExerciseLine = (line: string): PlannedExercise | null => {
  const setMatch = line.match(/^(.+?)\s+(\d+)\s*x\s*([0-9]+(?:\s*-\s*[0-9]+)?(?:\s*(?:per|each)\s+side)?)\b(.*)$/i);

  if (setMatch) {
    return {
      id: generateId('exercise'),
      name: clean(setMatch[1]),
      targetSets: Number.parseInt(setMatch[2], 10),
      targetReps: clean(setMatch[3].replace(/\s*-\s*/g, '-')),
      targetWeightKg: parseWeight(setMatch[4])
    };
  }

  const cardioMatch = line.match(/^(.+?)\s*,?\s*(\d+(?:\.\d+)?)\s*(?:mins?|minutes)\b.*$/i);
  if (cardioMatch) {
    return {
      id: generateId('exercise'),
      name: clean(cardioMatch[1].replace(/\s*,?\s*$/, '')),
      targetSets: 1,
      targetReps: `${cardioMatch[2]} mins`,
      targetWeightKg: 0
    };
  }

  return null;
};

const parseCandidate = (dayIndex: number, rawTitle: string, content: string[]): DayCandidate => {
  const { title, detail } = splitHeaderTitle(rawTitle);
  const exercises: PlannedExercise[] = [];
  const noteLines: string[] = [];
  const isRest = /\brest\b/i.test(title);

  for (const rawLine of content) {
    const line = clean(rawLine);
    if (!line || dividerPattern.test(line) || dayHeaderPattern.test(line) || stopHeaderPattern.test(line)) continue;
    if (categoryPattern.test(line) && !/\d/.test(line)) continue;

    const exercise = isRest ? null : parseExerciseLine(line);
    if (exercise) {
      exercises.push(exercise);
    } else if (!/^weekly schedule$/i.test(line)) {
      noteLines.push(line);
    }
  }

  const notes = clean(detail || noteLines.join(' '));

  return {
    dayIndex,
    rawTitle,
    detail,
    content,
    exercises,
    notes,
    isRest: isRest || (exercises.length === 0 && /\brest\b/i.test(noteLines.join(' ')))
  };
};

const candidateScore = (candidate: DayCandidate) => {
  const contentScore = candidate.content.filter((line) => clean(line) && !dividerPattern.test(clean(line))).length;
  return candidate.exercises.length * 100 + contentScore;
};

export const parseWorkoutSplitText = (value: string): WorkoutSplitParseResult => {
  const lines = value.replace(/\r\n?/g, '\n').split('\n');
  const headers: Array<{ lineIndex: number; dayIndex: number; rawTitle: string }> = [];

  lines.forEach((line, lineIndex) => {
    const match = line.match(dayHeaderPattern);
    if (!match) return;
    headers.push({
      lineIndex,
      dayIndex: Number.parseInt(match[1], 10),
      rawTitle: match[2]
    });
  });

  if (headers.length === 0) {
    throw new Error('Paste a split that includes Day 1 to Day 7 headings.');
  }

  const candidatesByDay = new Map<number, DayCandidate[]>();

  headers.forEach((header, index) => {
    const nextHeader = headers[index + 1]?.lineIndex ?? lines.length;
    const content: string[] = [];

    for (let lineIndex = header.lineIndex + 1; lineIndex < nextHeader; lineIndex += 1) {
      const line = lines[lineIndex];
      if (stopHeaderPattern.test(clean(line))) break;
      content.push(line);
    }

    const candidate = parseCandidate(header.dayIndex, header.rawTitle, content);
    const existing = candidatesByDay.get(header.dayIndex) ?? [];
    existing.push(candidate);
    candidatesByDay.set(header.dayIndex, existing);
  });

  const fallback = defaultWorkoutSplit();
  const warnings: string[] = [];
  const days: WorkoutSplitDay[] = Array.from({ length: 7 }, (_, index) => {
    const dayIndex = index + 1;
    const candidates = candidatesByDay.get(dayIndex) ?? [];
    const bestCandidate = candidates.sort((a, b) => candidateScore(b) - candidateScore(a))[0];

    if (!bestCandidate) {
      warnings.push(`Day ${dayIndex} was missing, so the previous/default day was kept.`);
      return fallback[index];
    }

    const { title } = splitHeaderTitle(bestCandidate.rawTitle);
    const isRest = bestCandidate.isRest;
    const category = isRest ? 'Rest' : titleCase(title);

    return {
      dayIndex,
      label: `Day ${dayIndex}`,
      category,
      isRest,
      exercises: isRest ? [] : bestCandidate.exercises,
      notes: bestCandidate.notes || (isRest ? 'Full rest.' : '')
    };
  });

  return {
    days,
    exerciseCount: days.reduce((total, day) => total + day.exercises.length, 0),
    restDayCount: days.filter((day) => day.isRest).length,
    warnings
  };
};
