import { Download, RotateCcw, Save, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card, Field } from '../components/Primitives';
import { calculateTargets } from '../data/nutrition';
import { generateId } from '../data/defaults';
import type { AppSettings, DashboardExport, PlannedExercise, ProfileSettings, WorkoutSplitDay } from '../types';

const serializeExercises = (exercises: PlannedExercise[]) =>
  exercises.map((exercise) => `${exercise.name} | ${exercise.targetSets} | ${exercise.targetReps} | ${exercise.targetWeightKg}`).join('\n');

const parseExercises = (value: string): PlannedExercise[] =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name = 'Exercise', sets = '3', reps = '8-12', weight = '0'] = line.split('|').map((item) => item.trim());
      return {
        id: generateId('exercise'),
        name,
        targetSets: Number.parseInt(sets, 10) || 3,
        targetReps: reps,
        targetWeightKg: Number.parseFloat(weight) || 0
      };
    });

export function SettingsScreen({
  settings,
  onSaveSettings,
  onExport,
  onImport,
  onReset
}: {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => Promise<void>;
  onExport: () => Promise<DashboardExport>;
  onImport: (payload: DashboardExport) => Promise<void>;
  onReset: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [importText, setImportText] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => setDraft(settings), [settings]);

  const targets = calculateTargets(draft.profile);

  const updateProfile = <K extends keyof ProfileSettings>(key: K, value: ProfileSettings[K]) => {
    setDraft((current) => ({ ...current, profile: { ...current.profile, [key]: value } }));
  };

  const updateSplitDay = (dayIndex: number, patch: Partial<WorkoutSplitDay>) => {
    setDraft((current) => ({
      ...current,
      workoutSplit: current.workoutSplit.map((day) => (day.dayIndex === dayIndex ? { ...day, ...patch } : day))
    }));
  };

  const save = async () => {
    await onSaveSettings(draft);
    setMessage('Settings saved locally.');
  };

  const exportData = async () => {
    const payload = await onExport();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `life-dashboard-backup-${payload.exportedAt.slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage('Export created.');
  };

  const importData = async () => {
    try {
      await onImport(JSON.parse(importText) as DashboardExport);
      setMessage('Import completed.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Import failed.');
    }
  };

  const reset = async () => {
    if (!window.confirm('Reset all local Life Dashboard data on this device?')) return;
    await onReset();
    setMessage('Local data reset.');
  };

  return (
    <div className="screen-stack">
      <section className="page-title">
        <h2>Settings</h2>
        <p>Profile, food targets, workout split, and local data backup controls.</p>
      </section>

      <Card title="Profile and food targets">
        <div className="form-grid">
          <Field label="Name">
            <input value={draft.profile.name} onChange={(event) => updateProfile('name', event.target.value)} />
          </Field>
          <Field label="Age">
            <input type="number" value={draft.profile.age} onChange={(event) => updateProfile('age', Number.parseInt(event.target.value, 10) || 18)} />
          </Field>
          <Field label="Sex">
            <select value={draft.profile.sex} onChange={(event) => updateProfile('sex', event.target.value as ProfileSettings['sex'])}>
              <option value="unspecified">Unspecified</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </Field>
          <Field label="Weight kg">
            <input type="number" value={draft.profile.weightKg} onChange={(event) => updateProfile('weightKg', Number.parseFloat(event.target.value) || 0)} />
          </Field>
          <Field label="Height cm">
            <input type="number" value={draft.profile.heightCm} onChange={(event) => updateProfile('heightCm', Number.parseFloat(event.target.value) || 0)} />
          </Field>
          <Field label="Activity">
            <select value={draft.profile.activityLevel} onChange={(event) => updateProfile('activityLevel', event.target.value as ProfileSettings['activityLevel'])}>
              <option value="sedentary">Sedentary</option>
              <option value="light">Light</option>
              <option value="moderate">Moderate</option>
              <option value="active">Active</option>
            </select>
          </Field>
          <Field label="Goal">
            <select value={draft.profile.bodyGoal} onChange={(event) => updateProfile('bodyGoal', event.target.value as ProfileSettings['bodyGoal'])}>
              <option value="lose">Lose weight</option>
              <option value="maintain">Maintain</option>
              <option value="gain">Gain weight</option>
            </select>
          </Field>
          <Field label="Monthly budget GBP">
            <input type="number" value={draft.profile.monthlyBudget} onChange={(event) => updateProfile('monthlyBudget', Number.parseFloat(event.target.value) || 0)} />
          </Field>
        </div>
        <div className="target-strip">
          <span>{targets.calories} kcal</span>
          <span>{targets.protein}g protein</span>
          <span>{targets.carbs}g carbs</span>
          <span>{targets.fat}g fat</span>
        </div>
      </Card>

      <Card title="Workout split">
        <Field label="Split start date" hint="This date defines Day 1 of the repeating seven-day cycle.">
          <input type="date" value={draft.splitStartDate} onChange={(event) => setDraft((current) => ({ ...current, splitStartDate: event.target.value }))} />
        </Field>
        <div className="split-editor">
          {draft.workoutSplit.map((day) => (
            <section key={day.dayIndex} className="split-day-editor">
              <div className="split-day-head">
                <strong>{day.label}</strong>
                <label>
                  <input type="checkbox" checked={day.isRest} onChange={(event) => updateSplitDay(day.dayIndex, { isRest: event.target.checked })} />
                  Rest
                </label>
              </div>
              <div className="form-grid two">
                <Field label="Label">
                  <input value={day.label} onChange={(event) => updateSplitDay(day.dayIndex, { label: event.target.value })} />
                </Field>
                <Field label="Category">
                  <input value={day.category} onChange={(event) => updateSplitDay(day.dayIndex, { category: event.target.value })} />
                </Field>
              </div>
              <Field label="Exercises" hint="One per line: name | sets | reps | kg">
                <textarea value={serializeExercises(day.exercises)} onChange={(event) => updateSplitDay(day.dayIndex, { exercises: parseExercises(event.target.value) })} />
              </Field>
              <Field label="Notes">
                <input value={day.notes} onChange={(event) => updateSplitDay(day.dayIndex, { notes: event.target.value })} />
              </Field>
            </section>
          ))}
        </div>
      </Card>

      <Card title="Local data">
        <div className="data-actions">
          <button type="button" className="secondary-button" onClick={exportData}>
            <Download size={16} />
            Export JSON
          </button>
          <button type="button" className="secondary-button danger" onClick={reset}>
            <RotateCcw size={16} />
            Reset local data
          </button>
        </div>
        <Field label="Import JSON backup">
          <textarea value={importText} onChange={(event) => setImportText(event.target.value)} placeholder="Paste a Life Dashboard export JSON file here" />
        </Field>
        <div className="form-actions">
          <button type="button" className="secondary-button" onClick={importData} disabled={!importText.trim()}>
            <Upload size={16} />
            Import
          </button>
          <button type="button" className="primary-button" onClick={save}>
            <Save size={18} />
            Save settings
          </button>
        </div>
        {message && <p className="form-message">{message}</p>}
      </Card>

      <Card title="Install">
        <p className="card-copy">
          After deploying to Netlify, open the site on your phone and use the browser share menu to add it to your home screen.
          Barcode scanning requires HTTPS and camera permission; manual barcode entry remains available.
        </p>
      </Card>
    </div>
  );
}

