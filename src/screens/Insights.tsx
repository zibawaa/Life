import type { Insight } from '../types';
import { Card, InsightCard } from '../components/Primitives';

export function InsightsScreen({ insights }: { insights: Insight[] }) {
  return (
    <div className="screen-stack">
      <section className="page-title">
        <h2>Insights</h2>
        <p>Rule-based observations from your local history. These are prompts for reflection, not professional advice.</p>
      </section>

      <Card>
        <div className="insight-grid">
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      </Card>
    </div>
  );
}

