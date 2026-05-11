import type { AppSettings, DashboardEntry, FoodEntry, GymEntry, HealthEntry, Insight, MoodEntry, FinanceEntry, GoalEntry } from '../types';
import { calculateTargets } from './nutrition';

const inLastDays = (dateKey: string, days: number) => {
  const entryTime = new Date(`${dateKey}T00:00:00`).getTime();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - days + 1);
  return entryTime >= start.getTime();
};

const average = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);

export function buildInsights(entries: DashboardEntry[], settings: AppSettings): Insight[] {
  const recent = entries.filter((entry) => inLastDays(entry.date, 7));
  const previous = entries.filter((entry) => inLastDays(entry.date, 30) && !inLastDays(entry.date, 7));
  const insights: Insight[] = [];

  const moods = recent.filter((entry): entry is MoodEntry => entry.type === 'mood');
  const olderMoods = previous.filter((entry): entry is MoodEntry => entry.type === 'mood');
  if (moods.length >= 2) {
    const recentAvg = average(moods.map((entry) => entry.score));
    const olderAvg = average(olderMoods.map((entry) => entry.score));
    const trend = olderMoods.length && recentAvg < olderAvg ? 'lower' : recentAvg >= 7 ? 'steady high' : 'building';
    insights.push({
      id: 'mood-trend',
      title: 'Mood pattern noticed',
      body: `Your 7-day mood average is ${recentAvg.toFixed(1)}/10. It is ${trend} compared with your recent history.`,
      area: 'mood',
      tone: recentAvg >= 7 ? 'good' : 'neutral'
    });
  }

  const gym = recent.filter((entry): entry is GymEntry => entry.type === 'gym');
  if (gym.length > 0) {
    const splitLabels = new Set(gym.map((entry) => entry.splitLabel));
    insights.push({
      id: 'gym-consistency',
      title: 'Gym consistency',
      body: `You logged ${gym.length} gym session${gym.length === 1 ? '' : 's'} this week across ${splitLabels.size} split day${splitLabels.size === 1 ? '' : 's'}.`,
      area: 'gym',
      tone: gym.length >= 3 ? 'good' : 'neutral'
    });
  }

  const foods = recent.filter((entry): entry is FoodEntry => entry.type === 'food');
  if (foods.length > 0) {
    const targets = calculateTargets(settings.profile);
    const calories = foods.reduce((sum, entry) => sum + entry.calories, 0);
    const dailyAverage = Math.round(calories / 7);
    insights.push({
      id: 'food-calories',
      title: 'Calorie trend',
      body: `Your logged food averages ${dailyAverage} kcal/day over the last 7 days against a target near ${targets.calories} kcal.`,
      area: 'food',
      tone: dailyAverage <= targets.calories ? 'good' : 'watch'
    });
  }

  const expenses = recent.filter((entry): entry is FinanceEntry => entry.type === 'finance' && entry.direction === 'expense');
  if (expenses.length > 0) {
    const total = expenses.reduce((sum, entry) => sum + entry.amount, 0);
    const weeklyBudget = settings.profile.monthlyBudget / 4.33;
    insights.push({
      id: 'finance-spend',
      title: 'Spending check',
      body: `You logged GBP ${total.toFixed(2)} in expenses this week. Your rough weekly budget is GBP ${weeklyBudget.toFixed(2)}.`,
      area: 'finance',
      tone: total <= weeklyBudget ? 'good' : 'watch'
    });
  }

  const health = recent.filter((entry): entry is HealthEntry => entry.type === 'health');
  if (health.length > 0) {
    const severity = average(health.map((entry) => entry.severity));
    insights.push({
      id: 'health-severity',
      title: 'Health log summary',
      body: `You logged ${health.length} health note${health.length === 1 ? '' : 's'} this week with average severity ${severity.toFixed(1)}/10.`,
      area: 'health',
      tone: severity >= 7 ? 'watch' : 'neutral'
    });
  }

  const staleGoals = entries
    .filter((entry): entry is GoalEntry => entry.type === 'goal')
    .filter((entry) => entry.progress < 100 && !inLastDays(entry.updatedAt.slice(0, 10), 14));

  if (staleGoals.length > 0) {
    insights.push({
      id: 'goal-inactivity',
      title: 'Goal check-in',
      body: `${staleGoals.length} active goal${staleGoals.length === 1 ? '' : 's'} have not been updated in two weeks.`,
      area: 'goal',
      tone: 'watch'
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: 'not-enough-data',
      title: 'Start building your pattern history',
      body: 'Add a few logs across mood, health, gym, food, and finances. Insights will get more useful as your local history grows.',
      area: 'all',
      tone: 'neutral'
    });
  }

  return insights;
}
