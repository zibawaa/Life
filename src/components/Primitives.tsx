import type { AreaKey, DashboardEntry, EntryType, Insight } from '../types';

export const areaLabels: Record<AreaKey, string> = {
  mood: 'Mood',
  health: 'Health',
  gym: 'Gym',
  food: 'Food',
  finance: 'Finances',
  goal: 'Goals',
  bucket: 'Bucket List'
};

export const areaDescriptions: Record<AreaKey, string> = {
  mood: 'Scores, tags, and notes',
  health: 'Symptoms, severity, triggers',
  gym: 'Split days, sets, reps, kg',
  food: 'Calories, macros, products',
  finance: 'Income, expenses, budget',
  goal: 'Milestones and progress',
  bucket: 'Dreams and plans'
};

export function Card({
  title,
  children,
  action,
  className = ''
}: {
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <div className="card-head">
          {title && <h2>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty-state">
      <div className="paw-mark" aria-hidden="true" />
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}

export function AreaTabs({
  value,
  onChange,
  compact = false
}: {
  value: AreaKey | EntryType;
  onChange: (value: AreaKey) => void;
  compact?: boolean;
}) {
  return (
    <div className={`area-tabs ${compact ? 'compact' : ''}`} role="tablist" aria-label="Life areas">
      {(Object.keys(areaLabels) as AreaKey[]).map((key) => (
        <button
          key={key}
          type="button"
          className={value === key ? 'active' : ''}
          onClick={() => onChange(key)}
          role="tab"
          aria-selected={value === key}
        >
          <span>{areaLabels[key]}</span>
        </button>
      ))}
    </div>
  );
}

export function Field({
  label,
  children,
  hint
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function InsightCard({ insight }: { insight: Insight }) {
  return (
    <article className={`insight-card ${insight.tone}`}>
      <div>
        <span>{insight.area === 'all' ? 'Life' : areaLabels[insight.area]}</span>
        <h3>{insight.title}</h3>
      </div>
      <p>{insight.body}</p>
    </article>
  );
}

export function formatEntryDate(dateKey: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short'
  }).format(new Date(`${dateKey}T00:00:00`));
}

export function entrySummary(entry: DashboardEntry) {
  switch (entry.type) {
    case 'mood':
      return `${entry.score}/10 mood${entry.tags.length ? ` · ${entry.tags.join(', ')}` : ''}`;
    case 'health':
      return `Severity ${entry.severity}/10 · ${entry.symptom}`;
    case 'gym':
      return `${entry.splitLabel} · ${entry.category} · ${entry.exercises.length} exercises`;
    case 'food':
      return `${entry.calories} kcal · P ${entry.protein}g · C ${entry.carbs}g · F ${entry.fat}g`;
    case 'finance':
      return `${entry.direction === 'income' ? '+' : '-'}£${entry.amount.toFixed(2)} · ${entry.category}`;
    case 'goal':
      return `${entry.progress}% · ${entry.milestone || 'Progress update'}`;
    case 'bucket':
      return `${entry.status} · ${entry.priority} priority`;
  }
}

export function parseTags(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
