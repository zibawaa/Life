import type { MacroTargets, ProfileSettings, WorkoutSplitDay } from '../types';
import { calculateFoodTargets } from './foodEngine';

export function calculateTargets(profile: ProfileSettings): MacroTargets {
  return calculateFoodTargets(profile);
}

export function getSelectedSplitDay(split: WorkoutSplitDay[], activeSplitDayIndex = 1): WorkoutSplitDay {
  if (split.length === 0) {
    throw new Error('Workout split must include at least one day');
  }

  return split.find((day) => day.dayIndex === activeSplitDayIndex) ?? split[0];
}

export function getActiveSplitDay(split: WorkoutSplitDay[], splitStartDate: string, date = new Date()): WorkoutSplitDay {
  if (split.length === 0) {
    throw new Error('Workout split must include at least one day');
  }

  const start = new Date(`${splitStartDate}T00:00:00`);
  const current = new Date(`${date.toISOString().slice(0, 10)}T00:00:00`);
  const diffDays = Math.floor((current.getTime() - start.getTime()) / 86_400_000);
  const index = ((diffDays % split.length) + split.length) % split.length;
  return split[index];
}
