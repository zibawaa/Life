import { Check, Dumbbell, HeartPulse, PiggyBank } from 'lucide-react';
import { useState } from 'react';
import { Card, Field } from '../components/Primitives';
import { calculateTargets } from '../data/nutrition';
import type { AppSettings, ProfileSettings } from '../types';

export function OnboardingScreen({
  settings,
  onComplete
}: {
  settings: AppSettings;
  onComplete: (settings: AppSettings) => Promise<void>;
}) {
  const [draft, setDraft] = useState(settings);
  const [saving, setSaving] = useState(false);
  const targets = calculateTargets(draft.profile);

  const updateProfile = <K extends keyof ProfileSettings>(key: K, value: ProfileSettings[K]) => {
    setDraft((current) => ({ ...current, profile: { ...current.profile, [key]: value } }));
  };

  const complete = async () => {
    setSaving(true);
    await onComplete({ ...draft, onboardingCompleted: true });
    setSaving(false);
  };

  return (
    <main className="onboarding-shell">
      <section className="onboarding-hero">
        <div>
          <span>Private setup</span>
          <h1>Life Dashboard</h1>
          <p>Set your starting details so the dashboard can calculate targets, classify your split, and keep insights personal to you.</p>
        </div>
        <div className="onboarding-cat" aria-hidden="true" />
      </section>

      <div className="onboarding-grid">
        <Card title="About you">
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
            <Field label="Activity level">
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
                <option value="maintain">Maintain weight</option>
                <option value="gain">Gain weight</option>
              </select>
            </Field>
            <Field label="Monthly budget GBP">
              <input type="number" value={draft.profile.monthlyBudget} onChange={(event) => updateProfile('monthlyBudget', Number.parseFloat(event.target.value) || 0)} />
            </Field>
          </div>
        </Card>

        <div className="onboarding-side">
          <Card title="Starting targets">
            <div className="target-strip">
              <span>{targets.calories} kcal</span>
              <span>{targets.protein}g protein</span>
              <span>{targets.carbs}g carbs</span>
              <span>{targets.fat}g fat</span>
            </div>
            <p className="card-copy">These are estimates for tracking. They are not medical or nutrition advice.</p>
          </Card>

          <Card title="Split cycle">
            <Field label="Day 1 starts on">
              <input type="date" value={draft.splitStartDate} onChange={(event) => setDraft((current) => ({ ...current, splitStartDate: event.target.value }))} />
            </Field>
            <div className="onboarding-points">
              <p><Dumbbell size={17} /> Day 1 to Day 7 repeats automatically.</p>
              <p><HeartPulse size={17} /> Rest days count as real split days.</p>
              <p><PiggyBank size={17} /> Personal logs stay on this device.</p>
            </div>
          </Card>
        </div>
      </div>

      <button type="button" className="onboarding-submit" onClick={complete} disabled={saving}>
        <Check size={20} />
        Start dashboard
      </button>
    </main>
  );
}

