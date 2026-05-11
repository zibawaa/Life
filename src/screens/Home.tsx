import { ChevronDown, ChevronRight, Dumbbell, Filter, HeartPulse, Plus, Smile, Soup, Target, WalletCards } from 'lucide-react';
import type { AppSettings, DashboardEntry, EntryType, FoodEntry, GoalEntry, HealthEntry, Insight, MoodEntry, FinanceEntry } from '../types';
import { todayKey } from '../data/defaults';
import { calculateTargets, getSelectedSplitDay } from '../data/nutrition';
import { Card, EmptyState, areaLabels, entrySummary, formatEntryDate } from '../components/Primitives';

const currency = (value: number) => `GBP ${value.toFixed(2)}`;

export function HomeScreen({
  entries,
  settings,
  insights,
  onAdd,
  onEdit,
  onDelete
}: {
  entries: DashboardEntry[];
  settings: AppSettings;
  insights: Insight[];
  onAdd: (type: EntryType) => void;
  onEdit: (entry: DashboardEntry) => void;
  onDelete: (id: string) => void;
}) {
  const today = todayKey();
  const todayEntries = entries.filter((entry) => entry.date === today);
  const targets = calculateTargets(settings.profile);
  const activeSplit = getSelectedSplitDay(settings.workoutSplit, settings.activeSplitDayIndex);
  const todaysMood = todayEntries.find((entry): entry is MoodEntry => entry.type === 'mood');
  const healthCount = todayEntries.filter((entry): entry is HealthEntry => entry.type === 'health').length;
  const todayFood = todayEntries.filter((entry): entry is FoodEntry => entry.type === 'food').reduce((sum, entry) => sum + entry.calories, 0);
  const todaySpend = todayEntries
    .filter((entry): entry is FinanceEntry => entry.type === 'finance' && entry.direction === 'expense')
    .reduce((sum, entry) => sum + entry.amount, 0);
  const goalDone = todayEntries.filter((entry): entry is GoalEntry => entry.type === 'goal' && entry.progress >= 100).length;
  const dayScore = calculateDayScore(todaysMood?.score ?? 0, healthCount, todayFood, targets.calories, todaySpend, settings.profile.monthlyBudget);
  const recentEntries = entries.slice(0, 5);

  return (
    <div className="screen-stack home-layout">
      <section className="today-board">
        <div className="board-head">
          <h2>Today - {new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date())}</h2>
        </div>

        <div className="today-board-grid">
          <div className="today-stat-list">
            <TodayRow icon={<Smile size={22} />} label="Mood" value={todaysMood ? `${todaysMood.score}/10` : '-/10'} note={todaysMood?.tags[0] ?? 'Not logged'} tone="olive" />
            <TodayRow icon={<HeartPulse size={22} />} label="Health" value={`${healthCount}`} note={healthCount === 1 ? 'note logged' : 'notes logged'} tone="coral" />
            <TodayRow icon={<Dumbbell size={22} />} label="Gym" value={activeSplit.category} note={activeSplit.label} tone="olive" />
            <TodayRow icon={<Soup size={22} />} label="Food" value={`${todayFood} / ${targets.calories}`} note="kcal" tone="coral" />
            <TodayRow icon={<WalletCards size={22} />} label="Money" value={currency(todaySpend)} note="spent" tone="olive" />
            <TodayRow icon={<Target size={22} />} label="Goals" value={`${goalDone}`} note={goalDone === 1 ? 'task done' : 'tasks done'} tone="olive" />
          </div>

          <div className="day-score-panel">
            <div className="score-ring" style={{ '--score': `${dayScore}%` } as React.CSSProperties}>
              <strong>{dayScore}%</strong>
              <span>Day Score</span>
            </div>
            <div className="score-paws" aria-hidden="true" />
            <button type="button" className="primary-button details-button" onClick={() => onAdd('mood')}>
              View Today Details
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      <Card
        title="Life Timeline"
        action={
          <button type="button" className="filter-button">
            <Filter size={16} />
            Filter
          </button>
        }
        className="timeline-card"
      >
        {recentEntries.length === 0 ? (
          <EmptyState title="No timeline entries yet" body="Use Add to log mood, health, gym, food, money, goals, or bucket list items." />
        ) : (
          <div className="mock-timeline-list">
            {recentEntries.map((entry) => (
              <article key={entry.id} className="mock-timeline-item">
                <div className="mock-time">{entry.date === today ? entry.createdAt.slice(11, 16) : formatEntryDate(entry.date)}</div>
                <div className={`mock-dot ${entry.type}`}>{iconForEntry(entry.type)}</div>
                <button type="button" className="mock-entry-body" onClick={() => onEdit(entry)}>
                  <strong>{areaLabels[entry.type]} - {entry.title}</strong>
                  <span>{entrySummary(entry)}</span>
                  {entry.notes && <em>{entry.notes}</em>}
                </button>
                <button type="button" className="mock-entry-chevron" onClick={() => onDelete(entry.id)} aria-label={`Delete ${entry.title}`}>
                  <ChevronRight size={21} />
                </button>
              </article>
            ))}
          </div>
        )}
        <button type="button" className="timeline-more">
          View full timeline
          <ChevronDown size={18} />
        </button>
      </Card>

      <Card title="Insights & Trends" className="trend-card">
        <div className="trend-grid">
          <TrendTile title="Mood Trend" subtitle="7-Day Average" value={todaysMood ? `${todaysMood.score}/10` : '0/10'} foot="Log mood to build trend" variant="line" />
          <TrendTile title="Gym Split Progress" subtitle="This Week" value={`${weeklyGymCount(entries)}/7`} foot="Days completed" variant="ring" />
          <TrendTile title="Calories" subtitle="Remaining" value={`${Math.max(0, targets.calories - todayFood)}`} foot={`${todayFood} / ${targets.calories}`} variant="gauge" />
          <TrendTile title="Finances" subtitle="This Month" value={currency(Math.max(0, settings.profile.monthlyBudget - todaySpend))} foot={`${currency(todaySpend)} spent`} variant="bar" />
        </div>
      </Card>

      <button type="button" className="floating-quick-add" onClick={() => onAdd('mood')}>
        <span><Plus size={26} /></span>
        Quick add
        <i aria-hidden="true" />
      </button>

      <div className="sr-only">
        {insights.map((insight) => insight.body).join(' ')}
      </div>
    </div>
  );
}

function TodayRow({
  icon,
  label,
  value,
  note,
  tone
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
  tone: 'olive' | 'coral';
}) {
  return (
    <div className="today-row">
      <span className={`today-icon ${tone}`}>{icon}</span>
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{note}</em>
    </div>
  );
}

function TrendTile({
  title,
  subtitle,
  value,
  foot,
  variant
}: {
  title: string;
  subtitle: string;
  value: string;
  foot: string;
  variant: 'line' | 'ring' | 'gauge' | 'bar';
}) {
  return (
    <article className="trend-tile">
      <h3>{title}</h3>
      <p>{subtitle}</p>
      <div className={`trend-visual ${variant}`} aria-hidden="true" />
      <strong>{value}</strong>
      <span>{foot}</span>
    </article>
  );
}

function iconForEntry(type: EntryType) {
  const iconProps = { size: 22 };
  switch (type) {
    case 'mood':
      return <Smile {...iconProps} />;
    case 'health':
      return <HeartPulse {...iconProps} />;
    case 'gym':
      return <Dumbbell {...iconProps} />;
    case 'food':
      return <Soup {...iconProps} />;
    case 'finance':
      return <WalletCards {...iconProps} />;
    case 'goal':
    case 'bucket':
      return <Target {...iconProps} />;
  }
}

function weeklyGymCount(entries: DashboardEntry[]) {
  const start = new Date();
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  return entries.filter((entry) => entry.type === 'gym' && new Date(`${entry.date}T00:00:00`) >= start).length;
}

function calculateDayScore(mood: number, healthCount: number, calories: number, target: number, spend: number, monthlyBudget: number) {
  const moodScore = mood ? mood * 7 : 35;
  const healthScore = healthCount > 0 ? 8 : 16;
  const foodScore = calories > 0 ? Math.max(0, 16 - Math.abs(target - calories) / target * 16) : 8;
  const budgetScore = spend <= monthlyBudget / 30 ? 10 : 4;
  return Math.max(0, Math.min(99, Math.round(moodScore + healthScore + foodScore + budgetScore)));
}
