import type { ActivityLevel, BodyGoal, MacroTargets, ProfileSettings, WorkoutSplitDay } from '../types';

const activityMultipliers: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725
};

const goalAdjustments: Record<BodyGoal, number> = {
  lose: -400,
  maintain: 0,
  gain: 300
};

export function calculateTargets(profile: ProfileSettings): MacroTargets {
  const sexOffset = profile.sex === 'female' ? -161 : profile.sex === 'male' ? 5 : -78;
  const bmr = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + sexOffset;
  const calories = Math.max(1200, Math.round(bmr * activityMultipliers[profile.activityLevel] + goalAdjustments[profile.bodyGoal]));
  const proteinPerKg = profile.bodyGoal === 'lose' ? 2 : profile.bodyGoal === 'gain' ? 1.8 : 1.6;
  const protein = Math.round(profile.weightKg * proteinPerKg);
  const fat = Math.round(profile.weightKg * 0.8);
  const remainingCalories = Math.max(0, calories - protein * 4 - fat * 9);
  const carbs = Math.round(remainingCalories / 4);

  return { calories, protein, carbs, fat };
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

