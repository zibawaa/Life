import { Check, ChevronLeft, ChevronRight, Dumbbell, HeartPulse, PiggyBank, UserRound, WalletCards } from 'lucide-react';
import { useState } from 'react';
import { Field } from '../components/Primitives';
import { calculateTargets } from '../data/nutrition';
import type { AppSettings, ProfileSettings } from '../types';

const steps = [
  {
    label: 'Welcome',
    title: 'Set up your dashboard',
    body: 'A quick private setup gives the app enough context to calculate useful targets and organise your logs.',
    icon: HeartPulse
  },
  {
    label: 'Profile',
    title: 'Basic details',
    body: 'These details help the calorie and macro targets start from a sensible estimate.',
    icon: UserRound
  },
  {
    label: 'Body goal',
    title: 'Food direction',
    body: 'Pick your activity level and whether you want to lose, maintain, or gain weight.',
    icon: Dumbbell
  },
  {
    label: 'Setup',
    title: 'Money and split',
    body: 'Set your monthly budget and the first day of your workout cycle.',
    icon: WalletCards
  }
];

const numericValue = (value: string, fallback: number) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function OnboardingScreen({
  settings,
  onComplete
}: {
  settings: AppSettings;
  onComplete: (settings: AppSettings) => Promise<void>;
}) {
  const [draft, setDraft] = useState(settings);
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const targets = calculateTargets(draft.profile);
  const activeStep = steps[stepIndex];
  const ActiveIcon = activeStep.icon;
  const isLastStep = stepIndex === steps.length - 1;

  const updateProfile = <K extends keyof ProfileSettings>(key: K, value: ProfileSettings[K]) => {
    setDraft((current) => ({ ...current, profile: { ...current.profile, [key]: value } }));
  };

  const complete = async () => {
    setSaving(true);
    try {
      await onComplete({ ...draft, onboardingCompleted: true });
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (isLastStep) {
      void complete();
      return;
    }

    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  };

  const renderStep = () => {
    if (stepIndex === 0) {
      return (
        <div className="onboarding-choice-grid">
          <div>
            <HeartPulse size={24} />
            <strong>Health, mood, and food</strong>
            <span>Targets and trends improve as your logs build up.</span>
          </div>
          <div>
            <Dumbbell size={24} />
            <strong>Gym split tracking</strong>
            <span>Your 7 day split repeats automatically from the start date.</span>
          </div>
          <div>
            <PiggyBank size={24} />
            <strong>Private local data</strong>
            <span>Everything stays in this browser unless you export it.</span>
          </div>
        </div>
      );
    }

    if (stepIndex === 1) {
      return (
        <div className="onboarding-fields">
          <Field label="Name">
            <input value={draft.profile.name} onChange={(event) => updateProfile('name', event.target.value)} autoFocus />
          </Field>
          <Field label="Age">
            <input
              type="number"
              min="13"
              value={draft.profile.age}
              onChange={(event) => updateProfile('age', Math.max(13, Math.round(numericValue(event.target.value, 18))))}
            />
          </Field>
          <Field label="Sex">
            <select value={draft.profile.sex} onChange={(event) => updateProfile('sex', event.target.value as ProfileSettings['sex'])}>
              <option value="unspecified">Unspecified</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </Field>
        </div>
      );
    }

    if (stepIndex === 2) {
      return (
        <div className="onboarding-fields">
          <Field label="Weight kg">
            <input
              type="number"
              min="1"
              value={draft.profile.weightKg}
              onChange={(event) => updateProfile('weightKg', numericValue(event.target.value, draft.profile.weightKg))}
            />
          </Field>
          <Field label="Height cm">
            <input
              type="number"
              min="1"
              value={draft.profile.heightCm}
              onChange={(event) => updateProfile('heightCm', numericValue(event.target.value, draft.profile.heightCm))}
            />
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
        </div>
      );
    }

    return (
      <div className="onboarding-final">
        <div className="onboarding-fields onboarding-fields--compact">
          <Field label="Monthly budget GBP">
            <input
              type="number"
              min="0"
              value={draft.profile.monthlyBudget}
              onChange={(event) => updateProfile('monthlyBudget', numericValue(event.target.value, draft.profile.monthlyBudget))}
            />
          </Field>
          <Field label="Day 1 starts on">
            <input type="date" value={draft.splitStartDate} onChange={(event) => setDraft((current) => ({ ...current, splitStartDate: event.target.value }))} />
          </Field>
        </div>

        <div className="onboarding-target-card" aria-label="Starting nutrition targets">
          <span>{targets.calories} kcal</span>
          <span>{targets.protein}g protein</span>
          <span>{targets.carbs}g carbs</span>
          <span>{targets.fat}g fat</span>
        </div>
        <p className="onboarding-note">Nutrition targets are estimates for tracking and are not medical advice.</p>
      </div>
    );
  };

  return (
    <div className="onboarding-overlay">
      <section className="onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="onboarding-title" aria-describedby="onboarding-copy">
        <div className="onboarding-progress-row" aria-label={`Step ${stepIndex + 1} of ${steps.length}`}>
          <span>{activeStep.label}</span>
          <div className="onboarding-dots" aria-hidden="true">
            {steps.map((step, index) => (
              <span key={step.label} className={index <= stepIndex ? 'active' : ''} />
            ))}
          </div>
        </div>

        <div className="onboarding-hero">
          <div className="onboarding-icon" aria-hidden="true">
            <ActiveIcon size={32} />
          </div>
          <div>
            <h1 id="onboarding-title">{activeStep.title}</h1>
            <p id="onboarding-copy">{activeStep.body}</p>
          </div>
          <div className="onboarding-cat" aria-hidden="true" />
        </div>

        <div className="onboarding-meter" aria-hidden="true">
          <span style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} />
        </div>

        <div className="onboarding-step">{renderStep()}</div>

        <div className="onboarding-actions">
          <button type="button" className="onboarding-back" onClick={() => setStepIndex((current) => Math.max(0, current - 1))} disabled={stepIndex === 0 || saving}>
            <ChevronLeft size={18} />
            Back
          </button>
          <button type="button" className="onboarding-submit" onClick={next} disabled={saving}>
            {isLastStep ? <Check size={20} /> : <ChevronRight size={20} />}
            {isLastStep ? 'Start dashboard' : 'Next'}
          </button>
        </div>
      </section>
    </div>
  );
}
