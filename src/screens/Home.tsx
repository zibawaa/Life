import { Plus } from 'lucide-react';
import type { AppSettings, DashboardEntry, EntryType, Insight } from '../types';
import { todayKey } from '../data/defaults';
import { calculateTargets, getActiveSplitDay } from '../data/nutrition';
import { Card, EmptyState, InsightCard, areaLabels, entrySummary, formatEntryDate } from '../components/Primitives';

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
  const activeSplit = getActiveSplitDay(settings.workoutSplit, settings.splitStartDate);
  const todayFood = todayEntries.filter((entry) => entry.type === 'food').reduce((sum, entry) => sum + entry.calories, 0);
  const recentEntries = entries.slice(0, 8);

  return (
    <div className="screen-stack">
      <section className="hero-panel">
        <div>
          <span>Local-only PWA</span>
          <h2>Your long-term life timeline</h2>
          <p>Track health, mood, training, calories, money, goals, and bucket list patterns in one private place.</p>
        </div>
        <button type="button" className="primary-button" onClick={() => onAdd('mood')}>
          <Plus size={18} />
          Quick add
        </button>
      </section>

      <div className="summary-grid">
        <Card title="Today">
          <div className="metric-list">
            <p><strong>{todayEntries.length}</strong><span>entries logged</span></p>
            <p><strong>{activeSplit.category}</strong><span>{activeSplit.isRest ? 'rest day' : activeSplit.label}</span></p>
            <p><strong>{todayFood}</strong><span>kcal of {targets.calories}</span></p>
          </div>
        </Card>
        <Card title="Fast Log">
          <div className="quick-grid">
            {(Object.keys(areaLabels) as EntryType[]).map((type) => (
              <button key={type} type="button" onClick={() => onAdd(type)}>
                {areaLabels[type]}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="insight-row">
        {insights.slice(0, 3).map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>

      <Card title="Timeline">
        {recentEntries.length === 0 ? (
          <EmptyState title="No entries yet" body="Use Add to start logging. Your timeline and insights will build from your local history." />
        ) : (
          <div className="timeline-list">
            {recentEntries.map((entry) => (
              <article key={entry.id} className={`timeline-item ${entry.type}`}>
                <div className="timeline-date">{formatEntryDate(entry.date)}</div>
                <div>
                  <span>{areaLabels[entry.type]}</span>
                  <h3>{entry.title}</h3>
                  <p>{entrySummary(entry)}</p>
                  {entry.notes && <small>{entry.notes}</small>}
                </div>
                <div className="entry-actions">
                  <button type="button" onClick={() => onEdit(entry)}>Edit</button>
                  <button type="button" onClick={() => onDelete(entry.id)}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

