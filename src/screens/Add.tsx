import { ScanBarcode, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { AreaTabs, Card, Field, areaLabels, parseTags } from '../components/Primitives';
import { generateId, todayKey } from '../data/defaults';
import { getSelectedSplitDay } from '../data/nutrition';
import { parseWorkoutSplitText } from '../data/workoutSplitParser';
import type {
  AppSettings,
  AreaKey,
  DashboardEntry,
  EntryType,
  LocalFood,
  LoggedExerciseSet
} from '../types';

interface AddFormState {
  date: string;
  title: string;
  notes: string;
  score: number;
  tags: string;
  symptom: string;
  severity: number;
  treatments: string;
  triggers: string;
  doctorQuestions: string;
  splitDayIndex: number;
  splitLabel: string;
  category: string;
  durationMinutes: number;
  effort: number;
  exercises: LoggedExerciseSet[];
  meal: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  waterMl: number;
  barcode: string;
  source: 'manual' | 'barcode' | 'search' | 'recipe';
  direction: 'income' | 'expense';
  amount: number;
  financeCategory: string;
  goalArea: string;
  milestone: string;
  progress: number;
  deadline: string;
  status: 'idea' | 'planned' | 'done';
  priority: 'low' | 'medium' | 'high';
}

const toNumber = (value: number | string) => {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

function blankForm(type: EntryType, settings: AppSettings): AddFormState {
  const activeSplit = getSelectedSplitDay(settings.workoutSplit, settings.activeSplitDayIndex);
  return {
    date: todayKey(),
    title: defaultTitle(type, activeSplit.category),
    notes: '',
    score: 7,
    tags: '',
    symptom: '',
    severity: 3,
    treatments: '',
    triggers: '',
    doctorQuestions: '',
    splitDayIndex: activeSplit.dayIndex,
    splitLabel: activeSplit.label,
    category: activeSplit.category,
    durationMinutes: activeSplit.isRest ? 0 : 60,
    effort: 7,
    exercises: activeSplit.exercises.map((exercise) => ({
      id: generateId('set'),
      exerciseName: exercise.name,
      sets: exercise.targetSets,
      reps: exercise.targetReps,
      weightKg: exercise.targetWeightKg
    })),
    meal: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    waterMl: 0,
    barcode: '',
    source: 'manual',
    direction: 'expense',
    amount: 0,
    financeCategory: 'General',
    goalArea: 'Life',
    milestone: '',
    progress: 0,
    deadline: '',
    status: 'idea',
    priority: 'medium'
  };
}

function defaultTitle(type: EntryType, category = '') {
  const titles: Record<EntryType, string> = {
    mood: 'Mood check-in',
    health: 'Health note',
    gym: category ? `${category} workout` : 'Gym session',
    food: 'Meal log',
    finance: 'Money log',
    goal: 'Goal progress',
    bucket: 'Bucket list idea'
  };
  return titles[type];
}

function entryToForm(entry: DashboardEntry, settings: AppSettings): AddFormState {
  const form = blankForm(entry.type, settings);
  form.date = entry.date;
  form.title = entry.title;
  form.notes = entry.notes;

  switch (entry.type) {
    case 'mood':
      form.score = entry.score;
      form.tags = entry.tags.join(', ');
      break;
    case 'health':
      form.symptom = entry.symptom;
      form.severity = entry.severity;
      form.treatments = entry.treatments;
      form.triggers = entry.triggers.join(', ');
      form.doctorQuestions = entry.doctorQuestions;
      break;
    case 'gym':
      form.splitDayIndex = entry.splitDayIndex;
      form.splitLabel = entry.splitLabel;
      form.category = entry.category;
      form.durationMinutes = entry.durationMinutes;
      form.effort = entry.effort;
      form.exercises = entry.exercises;
      break;
    case 'food':
      form.meal = entry.meal;
      form.calories = entry.calories;
      form.protein = entry.protein;
      form.carbs = entry.carbs;
      form.fat = entry.fat;
      form.waterMl = entry.waterMl;
      form.barcode = entry.barcode ?? '';
      form.source = entry.source ?? 'manual';
      break;
    case 'finance':
      form.direction = entry.direction;
      form.amount = entry.amount;
      form.financeCategory = entry.category;
      break;
    case 'goal':
      form.goalArea = entry.area;
      form.milestone = entry.milestone;
      form.progress = entry.progress;
      form.deadline = entry.deadline;
      break;
    case 'bucket':
      form.status = entry.status;
      form.priority = entry.priority;
      break;
  }

  return form;
}

function buildEntry(type: EntryType, form: AddFormState, editingEntry?: DashboardEntry | null): DashboardEntry {
  const now = new Date().toISOString();
  const base = {
    id: editingEntry?.id ?? generateId(type),
    type,
    date: form.date,
    title: form.title || defaultTitle(type, form.category),
    notes: form.notes,
    createdAt: editingEntry?.createdAt ?? now,
    updatedAt: now
  };

  switch (type) {
    case 'mood':
      return { ...base, type, score: toNumber(form.score), tags: parseTags(form.tags) };
    case 'health':
      return {
        ...base,
        type,
        symptom: form.symptom || form.title || 'Health note',
        severity: toNumber(form.severity),
        treatments: form.treatments,
        triggers: parseTags(form.triggers),
        doctorQuestions: form.doctorQuestions
      };
    case 'gym':
      return {
        ...base,
        type,
        splitDayIndex: toNumber(form.splitDayIndex),
        splitLabel: form.splitLabel,
        category: form.category,
        durationMinutes: toNumber(form.durationMinutes),
        effort: toNumber(form.effort),
        exercises: form.exercises
      };
    case 'food':
      return {
        ...base,
        type,
        meal: form.meal || form.title,
        calories: toNumber(form.calories),
        protein: toNumber(form.protein),
        carbs: toNumber(form.carbs),
        fat: toNumber(form.fat),
        waterMl: toNumber(form.waterMl),
        barcode: form.barcode || undefined,
        source: form.source
      };
    case 'finance':
      return {
        ...base,
        type,
        direction: form.direction,
        amount: toNumber(form.amount),
        category: form.financeCategory
      };
    case 'goal':
      return {
        ...base,
        type,
        area: form.goalArea,
        milestone: form.milestone,
        progress: toNumber(form.progress),
        deadline: form.deadline
      };
    case 'bucket':
      return {
        ...base,
        type,
        status: form.status,
        priority: form.priority
      };
  }
}

export function AddScreen({
  activeType,
  settings,
  editingEntry,
  onTypeChange,
  onSave,
  onSaveSettings,
  onSaveLocalFood,
  onCancelEdit
}: {
  activeType: EntryType;
  settings: AppSettings;
  editingEntry: DashboardEntry | null;
  onTypeChange: (type: EntryType) => void;
  onSave: (entry: DashboardEntry) => Promise<void>;
  onSaveSettings: (settings: AppSettings) => Promise<void>;
  onSaveLocalFood: (food: LocalFood) => Promise<void>;
  onCancelEdit: () => void;
}) {
  const [form, setForm] = useState(() => (editingEntry ? entryToForm(editingEntry, settings) : blankForm(activeType, settings)));
  const [message, setMessage] = useState('');
  const [splitPaste, setSplitPaste] = useState('');
  const [splitImportMessage, setSplitImportMessage] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    setForm(editingEntry ? entryToForm(editingEntry, settings) : blankForm(activeType, settings));
    setMessage('');
  }, [activeType, editingEntry, settings]);

  const activeSplit = useMemo(() => getSelectedSplitDay(settings.workoutSplit, settings.activeSplitDayIndex), [settings]);

  const set = <K extends keyof AddFormState>(key: K, value: AddFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    const entry = buildEntry(activeType, form, editingEntry);
    await onSave(entry);
    if (activeType === 'food' && form.source === 'barcode' && form.meal) {
      await onSaveLocalFood({
        id: generateId('food'),
        barcode: form.barcode || undefined,
        name: form.meal,
        calories: toNumber(form.calories),
        protein: toNumber(form.protein),
        carbs: toNumber(form.carbs),
        fat: toNumber(form.fat),
        source: 'barcode',
        baseGrams: 100,
        savedAt: new Date().toISOString()
      });
    }
  };

  const updateExercise = (id: string, patch: Partial<LoggedExerciseSet>) => {
    setForm((current) => ({
      ...current,
      exercises: current.exercises.map((exercise) => (exercise.id === id ? { ...exercise, ...patch } : exercise))
    }));
  };

  const addExercise = () => {
    setForm((current) => ({
      ...current,
      exercises: [
        ...current.exercises,
        { id: generateId('set'), exerciseName: 'New exercise', sets: 3, reps: '8-12', weightKg: 0 }
      ]
    }));
  };

  const applySplitDayToForm = (splitDay: ReturnType<typeof getSelectedSplitDay>) => {
    setForm((current) => ({
      ...current,
      title: defaultTitle('gym', splitDay.category),
      splitDayIndex: splitDay.dayIndex,
      splitLabel: splitDay.label,
      category: splitDay.category,
      durationMinutes: splitDay.isRest ? 0 : current.durationMinutes || 60,
      exercises: splitDay.exercises.map((exercise) => ({
        id: generateId('set'),
        exerciseName: exercise.name,
        sets: exercise.targetSets,
        reps: exercise.targetReps,
        weightKg: exercise.targetWeightKg
      }))
    }));
  };

  const importWorkoutSplit = async () => {
    try {
      const parsed = parseWorkoutSplitText(splitPaste);
      await onSaveSettings({ ...settings, workoutSplit: parsed.days, activeSplitDayIndex: settings.activeSplitDayIndex || 1 });
      applySplitDayToForm(getSelectedSplitDay(parsed.days, settings.activeSplitDayIndex || 1));
      setSplitPaste('');
      setSplitImportMessage(`Imported ${parsed.days.length} days, ${parsed.exerciseCount} exercises, ${parsed.restDayCount} rest days.`);
    } catch (error) {
      setSplitImportMessage(error instanceof Error ? error.message : 'Could not import that split.');
    }
  };

  const selectSplitDay = async (dayIndex: number) => {
    const splitDay = getSelectedSplitDay(settings.workoutSplit, dayIndex);
    applySplitDayToForm(splitDay);
    await onSaveSettings({ ...settings, activeSplitDayIndex: dayIndex });
  };

  return (
    <div className="screen-stack">
      <BarcodeScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onLog={onSave}
        onSaveLocalFood={onSaveLocalFood}
        defaultDate={form.date || todayKey()}
      />
      <section className="page-title">
        <h2>{editingEntry ? `Edit ${areaLabels[activeType]}` : 'Add log'}</h2>
        <p>Quickly log anything. It will appear in the timeline and the matching area tab.</p>
      </section>

      <Card>
        <AreaTabs value={activeType} onChange={(key: AreaKey) => onTypeChange(key)} compact />

        <div className="form-grid">
          <Field label="Date">
            <input type="date" value={form.date} onChange={(event) => set('date', event.target.value)} />
          </Field>
          <Field label="Title">
            <input value={form.title} onChange={(event) => set('title', event.target.value)} />
          </Field>
        </div>

        {activeType === 'mood' && (
          <div className="form-grid">
            <Field label="Mood score">
              <input type="number" min="1" max="10" value={form.score} onChange={(event) => set('score', toNumber(event.target.value))} />
            </Field>
            <Field label="Tags" hint="Comma separated, e.g. calm, tired, focused">
              <input value={form.tags} onChange={(event) => set('tags', event.target.value)} />
            </Field>
          </div>
        )}

        {activeType === 'health' && (
          <>
            <div className="form-grid">
              <Field label="Symptom or problem">
                <input value={form.symptom} onChange={(event) => set('symptom', event.target.value)} />
              </Field>
              <Field label="Severity">
                <input type="number" min="1" max="10" value={form.severity} onChange={(event) => set('severity', toNumber(event.target.value))} />
              </Field>
            </div>
            <div className="form-grid">
              <Field label="Meds, treatment, action">
                <input value={form.treatments} onChange={(event) => set('treatments', event.target.value)} />
              </Field>
              <Field label="Triggers" hint="Comma separated">
                <input value={form.triggers} onChange={(event) => set('triggers', event.target.value)} />
              </Field>
            </div>
            <Field label="Doctor questions">
              <textarea value={form.doctorQuestions} onChange={(event) => set('doctorQuestions', event.target.value)} />
            </Field>
          </>
        )}

        {activeType === 'gym' && (
          <>
            <div className="split-import-panel">
              <div className="editor-head">
                <h3>Paste full split</h3>
                <button type="button" className="secondary-button" onClick={importWorkoutSplit} disabled={!splitPaste.trim()}>
                  Auto-categorise
                </button>
              </div>
              <Field label="Full split text" hint="Paste Day 1-7. The app will save the split and fill this workout from today's day.">
                <textarea
                  className="split-paste-textarea"
                  value={splitPaste}
                  onChange={(event) => setSplitPaste(event.target.value)}
                  placeholder={'DAY GYM SPLIT\nDay 1 - Upper A...\nIncline Bench Press 2x6'}
                />
              </Field>
              {splitImportMessage && <p className="form-message">{splitImportMessage}</p>}
            </div>

            <div className="split-banner">
              <strong>{activeSplit.label}: {activeSplit.category}</strong>
              <span>{activeSplit.isRest ? 'Selected rest day from your split.' : 'Selected from your split. Tap another day if you are on a different day.'}</span>
              <div className="split-day-picker" aria-label="Choose current split day">
                {settings.workoutSplit.map((day) => (
                  <button
                    key={day.dayIndex}
                    type="button"
                    className={day.dayIndex === activeSplit.dayIndex ? 'active' : ''}
                    onClick={() => {
                      selectSplitDay(day.dayIndex).catch((error) => setSplitImportMessage(error instanceof Error ? error.message : 'Could not select day.'));
                    }}
                  >
                    {day.label}
                    <span>{day.category}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="form-grid">
              <Field label="Split label">
                <input value={form.splitLabel} onChange={(event) => set('splitLabel', event.target.value)} />
              </Field>
              <Field label="Workout category">
                <input value={form.category} onChange={(event) => set('category', event.target.value)} />
              </Field>
              <Field label="Duration minutes">
                <input type="number" value={form.durationMinutes} onChange={(event) => set('durationMinutes', toNumber(event.target.value))} />
              </Field>
              <Field label="Effort">
                <input type="number" min="1" max="10" value={form.effort} onChange={(event) => set('effort', toNumber(event.target.value))} />
              </Field>
            </div>
            <div className="exercise-editor">
              <div className="editor-head">
                <h3>Sets, reps, kg</h3>
                <button type="button" className="secondary-button" onClick={addExercise}>Add exercise</button>
              </div>
              {form.exercises.map((exercise) => (
                <div key={exercise.id} className="exercise-row">
                  <input value={exercise.exerciseName} onChange={(event) => updateExercise(exercise.id, { exerciseName: event.target.value })} />
                  <input type="number" value={exercise.sets} onChange={(event) => updateExercise(exercise.id, { sets: toNumber(event.target.value) })} aria-label="Sets" />
                  <input value={exercise.reps} onChange={(event) => updateExercise(exercise.id, { reps: event.target.value })} aria-label="Reps" />
                  <input type="number" value={exercise.weightKg} onChange={(event) => updateExercise(exercise.id, { weightKg: toNumber(event.target.value) })} aria-label="Weight kg" />
                </div>
              ))}
            </div>
          </>
        )}

        {activeType === 'food' && (
          <>
            <button type="button" className="primary-button scan-launch" onClick={() => setScannerOpen(true)}>
              <ScanBarcode size={18} /> Scan barcode
            </button>
            <p className="card-copy scan-launch-hint">Opens a full-screen scanner. Detected products are logged with meal slot and macros.</p>
            <div className="form-grid">
              <Field label="Food or meal">
                <input value={form.meal} onChange={(event) => set('meal', event.target.value)} />
              </Field>
              <Field label="Calories">
                <input type="number" value={form.calories} onChange={(event) => set('calories', toNumber(event.target.value))} />
              </Field>
              <Field label="Protein g">
                <input type="number" value={form.protein} onChange={(event) => set('protein', toNumber(event.target.value))} />
              </Field>
              <Field label="Carbs g">
                <input type="number" value={form.carbs} onChange={(event) => set('carbs', toNumber(event.target.value))} />
              </Field>
              <Field label="Fat g">
                <input type="number" value={form.fat} onChange={(event) => set('fat', toNumber(event.target.value))} />
              </Field>
              <Field label="Water ml">
                <input type="number" value={form.waterMl} onChange={(event) => set('waterMl', toNumber(event.target.value))} />
              </Field>
            </div>
          </>
        )}

        {activeType === 'finance' && (
          <div className="form-grid">
            <Field label="Type">
              <select value={form.direction} onChange={(event) => set('direction', event.target.value as AddFormState['direction'])}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </Field>
            <Field label="Amount">
              <input type="number" value={form.amount} onChange={(event) => set('amount', toNumber(event.target.value))} />
            </Field>
            <Field label="Category">
              <input value={form.financeCategory} onChange={(event) => set('financeCategory', event.target.value)} />
            </Field>
          </div>
        )}

        {activeType === 'goal' && (
          <div className="form-grid">
            <Field label="Area">
              <input value={form.goalArea} onChange={(event) => set('goalArea', event.target.value)} />
            </Field>
            <Field label="Milestone">
              <input value={form.milestone} onChange={(event) => set('milestone', event.target.value)} />
            </Field>
            <Field label="Progress %">
              <input type="number" min="0" max="100" value={form.progress} onChange={(event) => set('progress', toNumber(event.target.value))} />
            </Field>
            <Field label="Deadline">
              <input type="date" value={form.deadline} onChange={(event) => set('deadline', event.target.value)} />
            </Field>
          </div>
        )}

        {activeType === 'bucket' && (
          <div className="form-grid">
            <Field label="Status">
              <select value={form.status} onChange={(event) => set('status', event.target.value as AddFormState['status'])}>
                <option value="idea">Idea</option>
                <option value="planned">Planned</option>
                <option value="done">Done</option>
              </select>
            </Field>
            <Field label="Priority">
              <select value={form.priority} onChange={(event) => set('priority', event.target.value as AddFormState['priority'])}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </Field>
          </div>
        )}

        <Field label="Notes">
          <textarea value={form.notes} onChange={(event) => set('notes', event.target.value)} />
        </Field>

        <div className="form-actions">
          {editingEntry && (
            <button type="button" className="secondary-button" onClick={onCancelEdit}>
              Cancel edit
            </button>
          )}
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              save().catch((error) => setMessage(error instanceof Error ? error.message : 'Could not save entry.'));
            }}
          >
            <Save size={18} />
            {editingEntry ? 'Save changes' : 'Save log'}
          </button>
        </div>
        {message && <p className="form-message">{message}</p>}
      </Card>
    </div>
  );
}
