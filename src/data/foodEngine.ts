import type { FoodEntry, LocalFood, MacroTargets, MealSlot, ProfileSettings, ServingUnit } from '../types';

export const mealSlots: Array<{ key: MealSlot; label: string }> = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snacks', label: 'Snacks' }
];

export const seedFoods: LocalFood[] = [
  {
    id: 'seed-chicken-breast',
    name: 'Chicken breast',
    source: 'seed',
    baseGrams: 100,
    calories: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
    servingOptions: [{ label: '1 fillet', grams: 170 }],
    servingSize: '100g',
    savedAt: '2026-05-11T00:00:00.000Z'
  },
  {
    id: 'seed-banana',
    name: 'Banana',
    source: 'seed',
    baseGrams: 100,
    calories: 89,
    protein: 1.1,
    carbs: 23,
    fat: 0.3,
    servingOptions: [{ label: '1 medium banana', grams: 118 }],
    servingSize: '100g',
    savedAt: '2026-05-11T00:00:00.000Z'
  },
  {
    id: 'seed-cooked-rice',
    name: 'Cooked white rice',
    source: 'seed',
    baseGrams: 100,
    calories: 130,
    protein: 2.7,
    carbs: 28,
    fat: 0.3,
    servingOptions: [{ label: '1 cup cooked', grams: 158 }],
    servingSize: '100g',
    savedAt: '2026-05-11T00:00:00.000Z'
  },
  {
    id: 'seed-oats',
    name: 'Rolled oats',
    source: 'seed',
    baseGrams: 100,
    calories: 389,
    protein: 16.9,
    carbs: 66.3,
    fat: 6.9,
    servingOptions: [{ label: '1/2 cup dry', grams: 40 }],
    servingSize: '100g',
    savedAt: '2026-05-11T00:00:00.000Z'
  },
  {
    id: 'seed-egg',
    name: 'Egg',
    source: 'seed',
    baseGrams: 100,
    calories: 143,
    protein: 12.6,
    carbs: 0.7,
    fat: 9.5,
    servingOptions: [{ label: '1 large egg', grams: 50 }],
    servingSize: '100g',
    savedAt: '2026-05-11T00:00:00.000Z'
  },
  {
    id: 'seed-bread',
    name: 'Wholemeal bread',
    source: 'seed',
    baseGrams: 100,
    calories: 247,
    protein: 13,
    carbs: 41,
    fat: 4.2,
    servingOptions: [{ label: '1 slice', grams: 38 }],
    servingSize: '100g',
    savedAt: '2026-05-11T00:00:00.000Z'
  }
];

const activityMultipliers: Record<ProfileSettings['activityLevel'], number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725
};

const goalAdjustments: Record<ProfileSettings['bodyGoal'], number> = {
  lose: -400,
  maintain: 0,
  gain: 300
};

const roundMacro = (value: number) => Math.round(Number.isFinite(value) ? value : 0);

export function calculateFoodTargets(profile: ProfileSettings): MacroTargets {
  const sexOffset = profile.sex === 'female' ? -161 : profile.sex === 'male' ? 5 : -78;
  const bmr = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + sexOffset;
  const calories = Math.max(1200, Math.round(bmr * activityMultipliers[profile.activityLevel] + goalAdjustments[profile.bodyGoal]));
  const proteinPercent = profile.macroProteinPercent || 30;
  const carbsPercent = profile.macroCarbsPercent || 40;
  const fatPercent = profile.macroFatPercent || 30;

  return {
    calories,
    protein: roundMacro((calories * (proteinPercent / 100)) / 4),
    carbs: roundMacro((calories * (carbsPercent / 100)) / 4),
    fat: roundMacro((calories * (fatPercent / 100)) / 9)
  };
}

export interface ServingSelection {
  unit: ServingUnit;
  amount: number;
  servingLabel?: string;
}

export function applyServingToFood(food: LocalFood, selection: ServingSelection) {
  const baseGrams = food.baseGrams || 100;
  const servingOption = selection.servingLabel
    ? food.servingOptions?.find((option) => option.label === selection.servingLabel)
    : undefined;
  const servingGrams =
    selection.unit === 'g'
      ? selection.amount
      : selection.unit === 'oz'
        ? selection.amount * 28.3495
        : (servingOption?.grams ?? baseGrams) * selection.amount;
  const ratio = servingGrams / baseGrams;
  const label =
    selection.unit === 'serving'
      ? `${selection.amount} x ${servingOption?.label ?? 'serving'}`
      : `${selection.amount}${selection.unit}`;

  return {
    servingLabel: label,
    servingGrams: Math.round(servingGrams),
    calories: roundMacro(food.calories * ratio),
    protein: roundMacro(food.protein * ratio),
    carbs: roundMacro(food.carbs * ratio),
    fat: roundMacro(food.fat * ratio)
  };
}

export function sumFoodEntries(entries: Array<Pick<FoodEntry, 'calories' | 'protein' | 'carbs' | 'fat'>>) {
  return entries.reduce(
    (totals, entry) => ({
      calories: totals.calories + roundMacro(entry.calories),
      protein: totals.protein + roundMacro(entry.protein),
      carbs: totals.carbs + roundMacro(entry.carbs),
      fat: totals.fat + roundMacro(entry.fat)
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export function groupFoodEntriesByMeal<T extends Pick<FoodEntry, 'mealSlot' | 'calories' | 'protein' | 'carbs' | 'fat'>>(entries: T[]) {
  return Object.fromEntries(
    mealSlots.map(({ key, label }) => {
      const items = entries.filter((entry) => (entry.mealSlot ?? 'snacks') === key);
      return [key, { label, items, totals: sumFoodEntries(items) }];
    })
  ) as Record<MealSlot, { label: string; items: T[]; totals: ReturnType<typeof sumFoodEntries> }>;
}

export function allFoods(localFoods: LocalFood[]) {
  const byId = new Map<string, LocalFood>();
  [...seedFoods, ...localFoods].forEach((food) => byId.set(food.id, { ...food, baseGrams: food.baseGrams || 100 }));
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function searchFoods(query: string, foods: LocalFood[]) {
  const term = query.trim().toLowerCase();
  if (!term) return foods.filter((food) => food.favourite || food.template || food.source === 'seed').slice(0, 8);
  return foods
    .filter((food) => `${food.name} ${food.brand ?? ''}`.toLowerCase().includes(term))
    .slice(0, 10);
}
