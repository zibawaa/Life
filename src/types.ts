export type Screen = 'home' | 'add' | 'insights' | 'areas' | 'settings';

export type AreaKey = 'mood' | 'health' | 'gym' | 'food' | 'finance' | 'goal' | 'bucket';

export type EntryType = AreaKey;

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';

export type BodyGoal = 'lose' | 'maintain' | 'gain';

export type Sex = 'female' | 'male' | 'unspecified';

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

export type ServingUnit = 'g' | 'oz' | 'serving';

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface ProfileSettings {
  name: string;
  age: number;
  sex: Sex;
  weightKg: number;
  heightCm: number;
  activityLevel: ActivityLevel;
  bodyGoal: BodyGoal;
  monthlyBudget: number;
  goalWeightKg: number;
  macroProteinPercent: number;
  macroCarbsPercent: number;
  macroFatPercent: number;
}

export interface PlannedExercise {
  id: string;
  name: string;
  targetSets: number;
  targetReps: string;
  targetWeightKg: number;
}

export interface WorkoutSplitDay {
  dayIndex: number;
  label: string;
  category: string;
  isRest: boolean;
  exercises: PlannedExercise[];
  notes: string;
}

export interface AppSettings {
  onboardingCompleted: boolean;
  profile: ProfileSettings;
  splitStartDate: string;
  activeSplitDayIndex: number;
  workoutSplit: WorkoutSplitDay[];
}

export interface BaseEntry {
  id: string;
  type: EntryType;
  date: string;
  title: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface MoodEntry extends BaseEntry {
  type: 'mood';
  score: number;
  tags: string[];
}

export interface HealthEntry extends BaseEntry {
  type: 'health';
  symptom: string;
  severity: number;
  treatments: string;
  triggers: string[];
  doctorQuestions: string;
}

export interface LoggedExerciseSet {
  id: string;
  exerciseName: string;
  sets: number;
  reps: string;
  weightKg: number;
}

export interface GymEntry extends BaseEntry {
  type: 'gym';
  splitDayIndex: number;
  splitLabel: string;
  category: string;
  durationMinutes: number;
  effort: number;
  exercises: LoggedExerciseSet[];
}

export interface FoodEntry extends BaseEntry {
  type: 'food';
  meal: string;
  mealSlot?: MealSlot;
  foodId?: string;
  foodName?: string;
  brand?: string;
  servingLabel?: string;
  servingGrams?: number;
  servingUnit?: ServingUnit;
  servingAmount?: number;
  isQuickAdd?: boolean;
  isRecipe?: boolean;
  unverified?: boolean;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  waterMl: number;
  barcode?: string;
  source?: 'manual' | 'barcode' | 'search' | 'recipe';
}

export interface FinanceEntry extends BaseEntry {
  type: 'finance';
  direction: 'income' | 'expense';
  amount: number;
  category: string;
}

export interface GoalEntry extends BaseEntry {
  type: 'goal';
  area: string;
  milestone: string;
  progress: number;
  deadline: string;
}

export interface BucketEntry extends BaseEntry {
  type: 'bucket';
  status: 'idea' | 'planned' | 'done';
  priority: 'low' | 'medium' | 'high';
}

export type DashboardEntry =
  | MoodEntry
  | HealthEntry
  | GymEntry
  | FoodEntry
  | FinanceEntry
  | GoalEntry
  | BucketEntry;

export interface LocalFood {
  id: string;
  barcode?: string;
  name: string;
  brand?: string;
  source?: 'seed' | 'barcode' | 'manual' | 'recipe';
  baseGrams?: number;
  servingOptions?: ServingOption[];
  favourite?: boolean;
  template?: boolean;
  unverified?: boolean;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize?: string;
  savedAt: string;
  updatedAt?: string;
}

export interface ServingOption {
  label: string;
  grams: number;
}

export interface WeightLog {
  id: string;
  date: string;
  weightKg: number;
  createdAt: string;
}

export interface Insight {
  id: string;
  title: string;
  body: string;
  area: AreaKey | 'all';
  tone: 'good' | 'watch' | 'neutral';
}

export interface ProductLookupResult {
  barcode: string;
  name: string;
  brand?: string;
  baseGrams?: number;
  servingOptions?: ServingOption[];
  unverified?: boolean;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize?: string;
}

export interface DashboardExport {
  version: 1;
  exportedAt: string;
  settings: AppSettings;
  entries: DashboardEntry[];
  localFoods: LocalFood[];
  weightLogs?: WeightLog[];
}
