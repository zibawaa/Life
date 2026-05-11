import type { AppSettings, PlannedExercise, ProfileSettings, WorkoutSplitDay } from '../types';

export const todayKey = (date = new Date()) => date.toISOString().slice(0, 10);

export const generateId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const exercise = (name: string, targetSets = 3, targetReps = '8-12', targetWeightKg = 0): PlannedExercise => ({
  id: generateId('exercise'),
  name,
  targetSets,
  targetReps,
  targetWeightKg
});

export const defaultProfile: ProfileSettings = {
  name: 'You',
  age: 30,
  sex: 'unspecified',
  weightKg: 75,
  heightCm: 175,
  activityLevel: 'moderate',
  bodyGoal: 'maintain',
  monthlyBudget: 1200
};

export const defaultWorkoutSplit = (): WorkoutSplitDay[] => [
  {
    dayIndex: 1,
    label: 'Day 1',
    category: 'Push',
    isRest: false,
    exercises: [exercise('Bench press'), exercise('Shoulder press'), exercise('Triceps pressdown')],
    notes: 'Chest, shoulders, triceps'
  },
  {
    dayIndex: 2,
    label: 'Day 2',
    category: 'Pull',
    isRest: false,
    exercises: [exercise('Lat pulldown'), exercise('Barbell row'), exercise('Biceps curl')],
    notes: 'Back and biceps'
  },
  {
    dayIndex: 3,
    label: 'Day 3',
    category: 'Legs',
    isRest: false,
    exercises: [exercise('Squat'), exercise('Romanian deadlift'), exercise('Leg press')],
    notes: 'Lower body'
  },
  {
    dayIndex: 4,
    label: 'Day 4',
    category: 'Upper',
    isRest: false,
    exercises: [exercise('Incline press'), exercise('Cable row'), exercise('Lateral raise')],
    notes: 'Upper volume'
  },
  {
    dayIndex: 5,
    label: 'Day 5',
    category: 'Lower',
    isRest: false,
    exercises: [exercise('Deadlift'), exercise('Lunge'), exercise('Hamstring curl')],
    notes: 'Lower volume'
  },
  {
    dayIndex: 6,
    label: 'Day 6',
    category: 'Conditioning',
    isRest: false,
    exercises: [exercise('Cardio', 1, '20-30 min', 0), exercise('Core circuit', 3, '12-15', 0)],
    notes: 'Optional conditioning'
  },
  {
    dayIndex: 7,
    label: 'Day 7',
    category: 'Rest',
    isRest: true,
    exercises: [],
    notes: 'Recovery day'
  }
];

export const defaultSettings = (): AppSettings => ({
  onboardingCompleted: false,
  profile: defaultProfile,
  splitStartDate: todayKey(),
  workoutSplit: defaultWorkoutSplit()
});
