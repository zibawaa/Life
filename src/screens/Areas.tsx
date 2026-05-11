import type { AppSettings, AreaKey, DashboardEntry, EntryType, FinanceEntry, FoodEntry, Insight } from '../types';
import { calculateTargets, getActiveSplitDay } from '../data/nutrition';
import { todayKey } from '../data/defaults';
import {
  AreaTabs,
  Card,
  EmptyState,
  InsightCard,
  areaDescriptions,
  areaLabels,
  entrySummary,
  formatEntryDate
} from '../components/Primitives';

function EntryList({
  entries,
  onEdit,
  onDelete
}: {
  entries: DashboardEntry[];
  onEdit: (entry: DashboardEntry) => void;
  onDelete: (id: string) => void;
}) {
  if (entries.length === 0) {
    return <EmptyState title="Nothing logged here yet" body="Use Add to create your first entry for this area." />;
  }

  return (
    <div className="compact-entry-list">
      {entries.map((entry) => (
        <article key={entry.id} className="compact-entry">
          <div>
            <span>{formatEntryDate(entry.date)}</span>
            <h3>{entry.title}</h3>
            <p>{entrySummary(entry)}</p>
          </div>
          <div className="entry-actions">
            <button type="button" onClick={() => onEdit(entry)}>Edit</button>
            <button type="button" onClick={() => onDelete(entry.id)}>Delete</button>
          </div>
        </article>
      ))}
    </div>
  );
}

export function AreasScreen({
  selectedArea,
  entries,
  settings,
  insights,
  onAreaChange,
  onAdd,
  onEdit,
  onDelete
}: {
  selectedArea: AreaKey;
  entries: DashboardEntry[];
  settings: AppSettings;
  insights: Insight[];
  onAreaChange: (area: AreaKey) => void;
  onAdd: (type: EntryType) => void;
  onEdit: (entry: DashboardEntry) => void;
  onDelete: (id: string) => void;
}) {
  const areaEntries = entries.filter((entry) => entry.type === selectedArea);
  const areaInsights = insights.filter((insight) => insight.area === selectedArea || insight.area === 'all');
  const targets = calculateTargets(settings.profile);
  const activeSplit = getActiveSplitDay(settings.workoutSplit, settings.splitStartDate);
  const todayFood = entries
    .filter((entry): entry is FoodEntry => entry.type === 'food' && entry.date === todayKey())
    .reduce((sum, entry) => sum + entry.calories, 0);
  const financeSpend = entries
    .filter((entry): entry is FinanceEntry => entry.type === 'finance' && entry.direction === 'expense')
    .reduce((sum, entry) => sum + entry.amount, 0);

  return (
    <div className="screen-stack">
      <section className="page-title">
        <h2>Areas</h2>
        <p>Each tracker has its own tab, while every log still rolls into your main timeline.</p>
      </section>

      <AreaTabs value={selectedArea} onChange={onAreaChange} />

      <div className="area-overview">
        <Card title={areaLabels[selectedArea]} action={<button className="secondary-button" type="button" onClick={() => onAdd(selectedArea)}>Add</button>}>
          <p className="card-copy">{areaDescriptions[selectedArea]}</p>

          {selectedArea === 'mood' && (
            <div className="metric-list">
              <p><strong>{areaEntries.length}</strong><span>mood logs</span></p>
              <p><strong>{averageMood(areaEntries)}</strong><span>average mood</span></p>
            </div>
          )}

          {selectedArea === 'health' && (
            <div className="metric-list">
              <p><strong>{areaEntries.length}</strong><span>health notes</span></p>
              <p><strong>{averageSeverity(areaEntries)}</strong><span>average severity</span></p>
            </div>
          )}

          {selectedArea === 'gym' && (
            <div className="split-status">
              <strong>{activeSplit.label}: {activeSplit.category}</strong>
              <span>{activeSplit.isRest ? 'Rest day from split' : `${activeSplit.exercises.length} planned exercises`}</span>
              <div className="split-mini-list">
                {settings.workoutSplit.map((day) => (
                  <span key={day.dayIndex} className={day.dayIndex === activeSplit.dayIndex ? 'active' : ''}>
                    {day.label}: {day.category}
                  </span>
                ))}
              </div>
            </div>
          )}

          {selectedArea === 'food' && (
            <div className="metric-list">
              <p><strong>{todayFood}</strong><span>kcal today</span></p>
              <p><strong>{targets.calories}</strong><span>kcal target</span></p>
              <p><strong>{targets.protein}g</strong><span>protein target</span></p>
            </div>
          )}

          {selectedArea === 'finance' && (
            <div className="metric-list">
              <p><strong>GBP {financeSpend.toFixed(0)}</strong><span>tracked spend</span></p>
              <p><strong>GBP {settings.profile.monthlyBudget}</strong><span>monthly budget</span></p>
            </div>
          )}

          {selectedArea === 'goal' && (
            <div className="metric-list">
              <p><strong>{areaEntries.length}</strong><span>goal updates</span></p>
              <p><strong>{activeGoals(areaEntries)}</strong><span>active goals</span></p>
            </div>
          )}

          {selectedArea === 'bucket' && (
            <div className="metric-list">
              <p><strong>{areaEntries.length}</strong><span>items</span></p>
              <p><strong>{doneBucketItems(areaEntries)}</strong><span>done</span></p>
            </div>
          )}
        </Card>

        <Card title="Area insights">
          <div className="insight-grid compact">
            {areaInsights.slice(0, 2).map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </Card>
      </div>

      <Card title={`Recent ${areaLabels[selectedArea]} entries`}>
        <EntryList entries={areaEntries} onEdit={onEdit} onDelete={onDelete} />
      </Card>
    </div>
  );
}

function averageMood(entries: DashboardEntry[]) {
  const moods = entries.filter((entry) => entry.type === 'mood');
  if (!moods.length) return '0/10';
  return `${(moods.reduce((sum, entry) => sum + entry.score, 0) / moods.length).toFixed(1)}/10`;
}

function averageSeverity(entries: DashboardEntry[]) {
  const health = entries.filter((entry) => entry.type === 'health');
  if (!health.length) return '0/10';
  return `${(health.reduce((sum, entry) => sum + entry.severity, 0) / health.length).toFixed(1)}/10`;
}

function activeGoals(entries: DashboardEntry[]) {
  return entries.filter((entry) => entry.type === 'goal' && entry.progress < 100).length;
}

function doneBucketItems(entries: DashboardEntry[]) {
  return entries.filter((entry) => entry.type === 'bucket' && entry.status === 'done').length;
}
