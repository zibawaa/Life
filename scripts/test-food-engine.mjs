import assert from 'node:assert/strict';
import { mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const tmpDir = resolve('.tmp-food-engine');
const outfile = resolve(tmpDir, 'foodEngine.test.mjs');

try {
  await mkdir(tmpDir, { recursive: true });
  await build({
    entryPoints: ['src/data/foodEngine.ts'],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    sourcemap: false,
    logLevel: 'silent'
  });

  const {
    applyServingToFood,
    calculateFoodTargets,
    groupFoodEntriesByMeal,
    sumFoodEntries
  } = await import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);

  const targets = calculateFoodTargets({
    name: 'Alex',
    age: 30,
    sex: 'male',
    weightKg: 75,
    heightCm: 175,
    activityLevel: 'moderate',
    bodyGoal: 'maintain',
    monthlyBudget: 1000,
    goalWeightKg: 72,
    macroProteinPercent: 30,
    macroCarbsPercent: 40,
    macroFatPercent: 30
  });

  assert.equal(targets.calories, 2633);
  assert.equal(targets.protein, 197);
  assert.equal(targets.carbs, 263);
  assert.equal(targets.fat, 88);

  const chicken = {
    id: 'food-chicken',
    name: 'Chicken breast',
    calories: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
    baseGrams: 100,
    servingOptions: [{ label: '1 fillet', grams: 170 }],
    savedAt: '2026-05-11T00:00:00.000Z'
  };

  assert.deepEqual(applyServingToFood(chicken, { unit: 'g', amount: 200 }), {
    servingLabel: '200g',
    servingGrams: 200,
    calories: 330,
    protein: 62,
    carbs: 0,
    fat: 7
  });

  assert.deepEqual(applyServingToFood(chicken, { unit: 'oz', amount: 4 }), {
    servingLabel: '4oz',
    servingGrams: 113,
    calories: 187,
    protein: 35,
    carbs: 0,
    fat: 4
  });

  assert.deepEqual(applyServingToFood(chicken, { unit: 'serving', amount: 2, servingLabel: '1 fillet' }), {
    servingLabel: '2 x 1 fillet',
    servingGrams: 340,
    calories: 561,
    protein: 105,
    carbs: 0,
    fat: 12
  });

  const entries = [
    { type: 'food', mealSlot: 'breakfast', calories: 400, protein: 30, carbs: 44, fat: 11 },
    { type: 'food', mealSlot: 'lunch', calories: 650, protein: 50, carbs: 70, fat: 18 },
    { type: 'food', mealSlot: 'snacks', calories: 150, protein: 4, carbs: 20, fat: 6 }
  ];

  assert.deepEqual(sumFoodEntries(entries), {
    calories: 1200,
    protein: 84,
    carbs: 134,
    fat: 35
  });

  const grouped = groupFoodEntriesByMeal(entries);
  assert.equal(grouped.breakfast.items.length, 1);
  assert.equal(grouped.dinner.items.length, 0);
  assert.equal(grouped.lunch.totals.calories, 650);
} finally {
  await rm(tmpDir, { recursive: true, force: true });
}
