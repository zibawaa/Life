import assert from 'node:assert/strict';
import { mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const sampleSplit = `DAY GYM SPLIT
===============


WEEKLY SCHEDULE
---------------
Day 1 - Upper A  (Chest + Shoulders + Triceps)
Day 2 - Lower A  (Quads + Hamstrings + Calves + Core)
Day 3 - Upper B  (Back + Biceps + Neck + Wrists)
Day 4 - REST
Day 5 - Upper C  (Chest + Shoulders + Triceps - variation)
Day 6 - Lower B  (Glutes + Hamstrings + Quads + Calves + Core)
Day 7 - REST


---------------------------------------------------------
DAY 1 - UPPER A  |  Chest + Shoulders + Triceps
---------------------------------------------------------

CHEST
Incline Bench Press          2x6
Flat Press                   2x6
Pec Fly (cable or machine)   2x8
SA Pec Fly                   1x8

SHOULDERS
High Cable Lateral Raise     2x10
Reverse Pec Deck             2x12

TRICEPS
Tricep Pushdown              2x10
ISO Cable Extension          2x10

CARDIO
Treadmill - 15% incline, 4 MPH, 30 mins


---------------------------------------------------------
DAY 2 - LOWER A  |  Quads + Hamstrings + Calves + Core
---------------------------------------------------------

LEGS
Leg Press                    3x10
Leg Extension                2x12
Seated Leg Curl              2x12
Seated Calf Raise            3x15

CORE
Hanging Leg Raise            3x12
Cable Woodchopper            2x12 per side

CARDIO
Treadmill - 15% incline, 4 MPH, 30 mins


---------------------------------------------------------
DAY 3 - UPPER B  |  Back + Biceps + Neck + Wrists
---------------------------------------------------------

BACK
Weighted Pull-Up or Pulldown     2x6-8
Seated Machine Row               2x10
Kneeling Cable Lat Pullover      2x12

BICEPS
Bayesian Curl                    2x10
Hammer Curl                      2x10
Preacher Curl (machine)          2x10

NECK
Chin Tucks                       2x12
Neck Curls                       2x12

WRISTS
Wrist Curl (barbell or dumbbell) 2x15
Reverse Wrist Curl               2x15

CARDIO
Treadmill - 15% incline, 4 MPH, 30 mins


---------------------------------------------------------
DAY 4 - REST
---------------------------------------------------------

Full rest or light walk.


---------------------------------------------------------
DAY 5 - UPPER C  |  Chest + Shoulders + Triceps (variation)
---------------------------------------------------------

CHEST
Flat Smith Machine Press         2x6
Flat Press                       2x6
Pec Fly (cable or machine)       2x8
SA Pec Fly                       1x8

SHOULDERS
High Cable Lateral Raise         2x10
Reverse Pec Deck                 2x12

TRICEPS
Cable Overhead Extension         2x10
ISO Cable Extension              2x10

CARDIO
Treadmill - 15% incline, 4 MPH, 30 mins


---------------------------------------------------------
DAY 6 - LOWER B  |  Glutes + Hamstrings + Quads + Calves + Core
---------------------------------------------------------

LEGS
Hack Squat                       3x6-8
Seated Leg Curl                  3x10
Leg Extension                    2x10
Leg Press (toe press for calves) 3x12
Seated Calf Raise                2x15

CORE
Hanging Knee Raise               3x12
Abductors                        2x12

CARDIO
Treadmill - 15% incline, 4 MPH, 30 mins


---------------------------------------------------------
DAY 7 - REST
---------------------------------------------------------

Full rest.`;

const tmpDir = resolve('.tmp-workout-parser');
const outfile = resolve(tmpDir, 'workoutSplitParser.test.mjs');

try {
  await mkdir(tmpDir, { recursive: true });
  await build({
    entryPoints: ['src/data/workoutSplitParser.ts'],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    sourcemap: false,
    logLevel: 'silent'
  });

  const { parseWorkoutSplitText } = await import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
  const result = parseWorkoutSplitText(sampleSplit);

  assert.equal(result.days.length, 7);
  assert.equal(result.exerciseCount, 44);
  assert.equal(result.restDayCount, 2);

  assert.deepEqual(
    result.days.map((day) => [day.dayIndex, day.label, day.category, day.isRest]),
    [
      [1, 'Day 1', 'Upper A', false],
      [2, 'Day 2', 'Lower A', false],
      [3, 'Day 3', 'Upper B', false],
      [4, 'Day 4', 'Rest', true],
      [5, 'Day 5', 'Upper C', false],
      [6, 'Day 6', 'Lower B', false],
      [7, 'Day 7', 'Rest', true]
    ]
  );

  const day1 = result.days[0];
  assert.equal(day1.notes, 'Chest + Shoulders + Triceps');
  assert.equal(day1.exercises[0].name, 'Incline Bench Press');
  assert.equal(day1.exercises[0].targetSets, 2);
  assert.equal(day1.exercises[0].targetReps, '6');
  assert.equal(day1.exercises.at(-1).name, 'Treadmill - 15% incline, 4 MPH');
  assert.equal(day1.exercises.at(-1).targetReps, '30 mins');

  const day2 = result.days[1];
  const woodchopper = day2.exercises.find((exercise) => exercise.name === 'Cable Woodchopper');
  assert.ok(woodchopper);
  assert.equal(woodchopper.targetSets, 2);
  assert.equal(woodchopper.targetReps, '12 per side');

  const day4 = result.days[3];
  assert.equal(day4.exercises.length, 0);
  assert.match(day4.notes, /light walk/i);

  const day6 = result.days[5];
  assert.equal(day6.notes, 'Glutes + Hamstrings + Quads + Calves + Core');
  assert.equal(day6.exercises[0].name, 'Hack Squat');
  assert.equal(day6.exercises[0].targetSets, 3);
  assert.equal(day6.exercises[0].targetReps, '6-8');
} finally {
  await rm(tmpDir, { recursive: true, force: true });
}
