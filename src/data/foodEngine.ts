import type { FoodEntry, LocalFood, MacroTargets, MealSlot, ProfileSettings, ServingUnit } from '../types';

export const mealSlots: Array<{ key: MealSlot; label: string }> = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snacks', label: 'Snacks' }
];

/**
 * Per-100g macros for common raw / fresh / cooked staples.
 * Values from USDA FoodData Central. Weighable items default to 100g so the
 * user can scale by their actual gram weight (orange, salad, chicken etc.)
 */
const SEED_ISO = '2026-05-11T00:00:00.000Z';

const seed = (
  id: string,
  name: string,
  calories: number,
  protein: number,
  carbs: number,
  fat: number,
  servingOptions?: Array<{ label: string; grams: number }>
): LocalFood => ({
  id: `seed-${id}`,
  name,
  source: 'seed',
  baseGrams: 100,
  calories,
  protein,
  carbs,
  fat,
  servingOptions,
  servingSize: '100g',
  savedAt: SEED_ISO
});

export const seedFoods: LocalFood[] = [
  // Fruits (raw)
  seed('apple', 'Apple', 52, 0.3, 14, 0.2, [{ label: '1 medium', grams: 182 }]),
  seed('banana', 'Banana', 89, 1.1, 23, 0.3, [{ label: '1 medium', grams: 118 }]),
  seed('orange', 'Orange', 47, 0.9, 12, 0.1, [{ label: '1 medium', grams: 131 }]),
  seed('grapes', 'Grapes', 69, 0.7, 18, 0.2, [{ label: '1 cup', grams: 151 }]),
  seed('strawberries', 'Strawberries', 32, 0.7, 7.7, 0.3, [{ label: '1 cup', grams: 152 }]),
  seed('blueberries', 'Blueberries', 57, 0.7, 14.5, 0.3, [{ label: '1 cup', grams: 148 }]),
  seed('raspberries', 'Raspberries', 52, 1.2, 12, 0.7, [{ label: '1 cup', grams: 123 }]),
  seed('mango', 'Mango', 60, 0.8, 15, 0.4, [{ label: '1 medium', grams: 200 }]),
  seed('pineapple', 'Pineapple', 50, 0.5, 13, 0.1, [{ label: '1 cup chunks', grams: 165 }]),
  seed('watermelon', 'Watermelon', 30, 0.6, 8, 0.2, [{ label: '1 wedge', grams: 286 }]),
  seed('melon-cantaloupe', 'Cantaloupe melon', 34, 0.8, 8, 0.2, [{ label: '1 cup', grams: 160 }]),
  seed('peach', 'Peach', 39, 0.9, 10, 0.3, [{ label: '1 medium', grams: 150 }]),
  seed('pear', 'Pear', 57, 0.4, 15, 0.1, [{ label: '1 medium', grams: 178 }]),
  seed('plum', 'Plum', 46, 0.7, 11, 0.3, [{ label: '1 plum', grams: 66 }]),
  seed('cherries', 'Cherries', 63, 1.1, 16, 0.2, [{ label: '1 cup', grams: 154 }]),
  seed('kiwi', 'Kiwi fruit', 61, 1.1, 15, 0.5, [{ label: '1 fruit', grams: 76 }]),
  seed('lemon', 'Lemon', 29, 1.1, 9, 0.3, [{ label: '1 lemon', grams: 84 }]),
  seed('lime', 'Lime', 30, 0.7, 11, 0.2, [{ label: '1 lime', grams: 67 }]),
  seed('avocado', 'Avocado', 160, 2, 9, 15, [{ label: '1 fruit', grams: 201 }]),
  seed('clementine', 'Clementine', 47, 0.9, 12, 0.2, [{ label: '1 fruit', grams: 74 }]),

  // Vegetables (raw)
  seed('lettuce', 'Lettuce (iceberg)', 14, 0.9, 3, 0.1),
  seed('lettuce-romaine', 'Romaine lettuce', 17, 1.2, 3.3, 0.3),
  seed('spinach', 'Spinach', 23, 2.9, 3.6, 0.4, [{ label: '1 cup', grams: 30 }]),
  seed('kale', 'Kale', 35, 2.9, 4.4, 1.5),
  seed('rocket', 'Rocket (arugula)', 25, 2.6, 3.7, 0.7),
  seed('broccoli', 'Broccoli', 34, 2.8, 7, 0.4, [{ label: '1 cup', grams: 91 }]),
  seed('cauliflower', 'Cauliflower', 25, 1.9, 5, 0.3, [{ label: '1 cup', grams: 100 }]),
  seed('carrot', 'Carrot', 41, 0.9, 10, 0.2, [{ label: '1 medium', grams: 61 }]),
  seed('tomato', 'Tomato', 18, 0.9, 3.9, 0.2, [{ label: '1 medium', grams: 123 }]),
  seed('cherry-tomato', 'Cherry tomatoes', 18, 0.9, 3.9, 0.2),
  seed('cucumber', 'Cucumber', 16, 0.7, 3.6, 0.1, [{ label: '1/2 cucumber', grams: 150 }]),
  seed('bell-pepper-red', 'Red bell pepper', 31, 1, 6, 0.3, [{ label: '1 pepper', grams: 119 }]),
  seed('bell-pepper-green', 'Green bell pepper', 20, 0.9, 4.6, 0.2),
  seed('onion', 'Onion', 40, 1.1, 9.3, 0.1),
  seed('red-onion', 'Red onion', 40, 1.1, 9.3, 0.1),
  seed('garlic', 'Garlic', 149, 6.4, 33, 0.5, [{ label: '1 clove', grams: 3 }]),
  seed('potato', 'Potato (raw)', 77, 2, 17, 0.1, [{ label: '1 medium', grams: 213 }]),
  seed('potato-boiled', 'Potato (boiled)', 87, 1.9, 20, 0.1),
  seed('jacket-potato', 'Jacket potato (baked)', 93, 2.5, 21, 0.1, [{ label: '1 medium', grams: 173 }]),
  seed('sweet-potato', 'Sweet potato', 86, 1.6, 20, 0.1, [{ label: '1 medium', grams: 130 }]),
  seed('mushroom', 'Mushrooms', 22, 3.1, 3.3, 0.3, [{ label: '1 cup', grams: 70 }]),
  seed('courgette', 'Courgette (zucchini)', 17, 1.2, 3.1, 0.3),
  seed('aubergine', 'Aubergine (eggplant)', 25, 1, 6, 0.2),
  seed('asparagus', 'Asparagus', 20, 2.2, 3.9, 0.1),
  seed('peas', 'Peas', 81, 5.4, 14, 0.4, [{ label: '1 cup', grams: 145 }]),
  seed('sweetcorn', 'Sweetcorn', 86, 3.3, 19, 1.4, [{ label: '1 cup', grams: 154 }]),
  seed('green-beans', 'Green beans', 31, 1.8, 7, 0.2),
  seed('cabbage', 'Cabbage', 25, 1.3, 5.8, 0.1),
  seed('mixed-salad', 'Mixed salad leaves', 18, 1.4, 3.3, 0.2, [{ label: '1 bowl', grams: 80 }]),

  // Meat & poultry (raw, weights for the typical cooked-yield piece)
  seed('chicken-breast', 'Chicken breast (raw)', 120, 22.5, 0, 2.6, [{ label: '1 fillet', grams: 170 }]),
  seed('chicken-breast-cooked', 'Chicken breast (cooked)', 165, 31, 0, 3.6, [{ label: '1 fillet', grams: 120 }]),
  seed('chicken-thigh-cooked', 'Chicken thigh (cooked, skinless)', 209, 26, 0, 11),
  seed('roast-chicken', 'Roast chicken (mixed meat)', 190, 29, 0, 7.4),
  seed('chicken-mince-cooked', 'Chicken mince (cooked)', 189, 28, 0, 8),
  seed('beef-mince-5', 'Beef mince 5% fat (cooked)', 174, 27, 0, 7),
  seed('beef-mince-20', 'Beef mince 20% fat (cooked)', 254, 25, 0, 17),
  seed('beef-steak-cooked', 'Beef steak (cooked)', 271, 30, 0, 17),
  seed('pork-loin-cooked', 'Pork loin (cooked)', 211, 27, 0, 11),
  seed('bacon-cooked', 'Bacon (cooked)', 541, 37, 1.4, 42, [{ label: '1 rasher', grams: 8 }]),
  seed('ham-cooked', 'Cooked ham', 145, 21, 1.5, 5.5, [{ label: '1 slice', grams: 23 }]),
  seed('sausage-cooked', 'Pork sausage (cooked)', 296, 13, 4, 26, [{ label: '1 sausage', grams: 50 }]),
  seed('turkey-breast-cooked', 'Turkey breast (cooked)', 135, 30, 0, 1),

  // Fish & seafood
  seed('salmon-cooked', 'Salmon (cooked)', 208, 22, 0, 13, [{ label: '1 fillet', grams: 130 }]),
  seed('tuna-canned-water', 'Tuna in water (drained)', 116, 26, 0, 1, [{ label: '1 can', grams: 112 }]),
  seed('tuna-canned-oil', 'Tuna in oil (drained)', 198, 25, 0, 11),
  seed('cod-cooked', 'Cod (cooked)', 105, 23, 0, 0.9),
  seed('prawns-cooked', 'Prawns (cooked)', 99, 24, 0.2, 0.3, [{ label: '6 prawns', grams: 60 }]),
  seed('mackerel-cooked', 'Mackerel (cooked)', 305, 21, 0, 25),

  // Dairy, eggs
  seed('egg', 'Egg', 143, 12.6, 0.7, 9.5, [{ label: '1 large egg', grams: 50 }]),
  seed('egg-white', 'Egg white', 52, 11, 0.7, 0.2, [{ label: '1 white', grams: 33 }]),
  seed('milk-whole', 'Whole milk', 61, 3.2, 4.8, 3.3, [{ label: '1 cup', grams: 244 }]),
  seed('milk-semi', 'Semi-skimmed milk', 46, 3.4, 4.7, 1.7, [{ label: '1 cup', grams: 244 }]),
  seed('milk-skimmed', 'Skimmed milk', 34, 3.4, 5, 0.1, [{ label: '1 cup', grams: 244 }]),
  seed('oat-milk', 'Oat milk', 47, 0.8, 7, 1.5),
  seed('greek-yogurt', 'Greek yogurt (plain)', 97, 9, 3.6, 5, [{ label: '1 small pot', grams: 150 }]),
  seed('greek-yogurt-0', 'Greek yogurt 0% fat', 59, 10.3, 3.6, 0.4, [{ label: '1 pot', grams: 150 }]),
  seed('yogurt-natural', 'Natural yogurt', 61, 3.5, 4.7, 3.3),
  seed('cheddar', 'Cheddar cheese', 402, 25, 1.3, 33, [{ label: '1 slice', grams: 28 }]),
  seed('mozzarella', 'Mozzarella', 280, 28, 3.1, 17),
  seed('feta', 'Feta cheese', 264, 14, 4.1, 21),
  seed('cottage-cheese', 'Cottage cheese', 98, 11, 3.4, 4.3, [{ label: '1 pot', grams: 200 }]),
  seed('butter', 'Butter', 717, 0.9, 0.1, 81, [{ label: '1 tbsp', grams: 14 }]),

  // Grains, breads, pasta
  seed('rice-white-cooked', 'White rice (cooked)', 130, 2.7, 28, 0.3, [{ label: '1 cup', grams: 158 }]),
  seed('rice-brown-cooked', 'Brown rice (cooked)', 111, 2.6, 23, 0.9, [{ label: '1 cup', grams: 195 }]),
  seed('pasta-cooked', 'Pasta (cooked)', 158, 5.8, 31, 0.9, [{ label: '1 cup', grams: 140 }]),
  seed('couscous-cooked', 'Couscous (cooked)', 112, 3.8, 23, 0.2),
  seed('quinoa-cooked', 'Quinoa (cooked)', 120, 4.4, 21, 1.9, [{ label: '1 cup', grams: 185 }]),
  seed('oats', 'Rolled oats (dry)', 389, 16.9, 66.3, 6.9, [{ label: '1/2 cup', grams: 40 }]),
  seed('bread-white', 'White bread', 265, 9, 49, 3.2, [{ label: '1 slice', grams: 36 }]),
  seed('bread-wholemeal', 'Wholemeal bread', 247, 13, 41, 4.2, [{ label: '1 slice', grams: 38 }]),
  seed('bagel', 'Bagel (plain)', 257, 10, 51, 1.5, [{ label: '1 bagel', grams: 99 }]),
  seed('tortilla-wrap', 'Tortilla wrap (flour)', 297, 8, 49, 7, [{ label: '1 wrap', grams: 60 }]),

  // Legumes, beans, tofu
  seed('chickpeas-cooked', 'Chickpeas (cooked)', 164, 8.9, 27, 2.6, [{ label: '1 can drained', grams: 240 }]),
  seed('black-beans-cooked', 'Black beans (cooked)', 132, 8.9, 24, 0.5),
  seed('kidney-beans-cooked', 'Kidney beans (cooked)', 127, 8.7, 23, 0.5),
  seed('lentils-cooked', 'Lentils (cooked)', 116, 9, 20, 0.4, [{ label: '1 cup', grams: 198 }]),
  seed('baked-beans', 'Baked beans in tomato sauce', 81, 4.8, 15, 0.5, [{ label: '1/2 can', grams: 207 }]),
  seed('tofu-firm', 'Tofu (firm)', 144, 17, 2.8, 8.7),
  seed('hummus', 'Hummus', 166, 7.9, 14, 9.6, [{ label: '2 tbsp', grams: 30 }]),

  // Nuts, seeds, oils
  seed('almonds', 'Almonds', 579, 21, 22, 50, [{ label: '1 handful', grams: 28 }]),
  seed('peanuts', 'Peanuts', 567, 26, 16, 49, [{ label: '1 handful', grams: 28 }]),
  seed('cashews', 'Cashews', 553, 18, 30, 44, [{ label: '1 handful', grams: 28 }]),
  seed('walnuts', 'Walnuts', 654, 15, 14, 65, [{ label: '1 handful', grams: 28 }]),
  seed('peanut-butter', 'Peanut butter', 588, 25, 20, 50, [{ label: '1 tbsp', grams: 16 }]),
  seed('chia-seeds', 'Chia seeds', 486, 17, 42, 31, [{ label: '1 tbsp', grams: 12 }]),
  seed('olive-oil', 'Olive oil', 884, 0, 0, 100, [{ label: '1 tbsp', grams: 14 }]),
  seed('rapeseed-oil', 'Rapeseed oil', 884, 0, 0, 100, [{ label: '1 tbsp', grams: 14 }]),

  // Condiments
  seed('mayonnaise', 'Mayonnaise', 680, 1, 0.6, 75, [{ label: '1 tbsp', grams: 14 }]),
  seed('ketchup', 'Tomato ketchup', 101, 1.7, 26, 0.1, [{ label: '1 tbsp', grams: 17 }]),
  seed('mustard', 'Mustard', 66, 4.4, 5.8, 4, [{ label: '1 tsp', grams: 5 }]),
  seed('soy-sauce', 'Soy sauce', 60, 8.1, 5.6, 0.1, [{ label: '1 tbsp', grams: 16 }]),
  seed('honey', 'Honey', 304, 0.3, 82, 0, [{ label: '1 tbsp', grams: 21 }]),
  seed('sugar', 'Sugar (white)', 387, 0, 100, 0, [{ label: '1 tsp', grams: 4 }])
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
