import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppSettings, DashboardEntry, DashboardExport, LocalFood } from '../types';
import {
  deleteEntry,
  exportDashboardData,
  getSettings,
  importDashboardData,
  listEntries,
  listLocalFoods,
  putSettings,
  resetDashboardData,
  saveEntry,
  saveLocalFood
} from '../data/db';
import { buildInsights } from '../data/insights';

export function useDashboardData() {
  const [entries, setEntries] = useState<DashboardEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [localFoods, setLocalFoods] = useState<LocalFood[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [nextSettings, nextEntries, nextFoods] = await Promise.all([getSettings(), listEntries(), listLocalFoods()]);
    setSettings(nextSettings);
    setEntries(nextEntries);
    setLocalFoods(nextFoods);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh().catch((error) => {
      console.error(error);
      setLoading(false);
    });
  }, [refresh]);

  const updateSettings = useCallback(
    async (nextSettings: AppSettings) => {
      await putSettings(nextSettings);
      await refresh();
    },
    [refresh]
  );

  const upsertEntry = useCallback(
    async (entry: DashboardEntry) => {
      await saveEntry(entry);
      await refresh();
    },
    [refresh]
  );

  const removeEntry = useCallback(
    async (id: string) => {
      await deleteEntry(id);
      await refresh();
    },
    [refresh]
  );

  const upsertLocalFood = useCallback(
    async (food: LocalFood) => {
      await saveLocalFood(food);
      await refresh();
    },
    [refresh]
  );

  const exportData = useCallback(() => exportDashboardData(), []);

  const importData = useCallback(
    async (payload: DashboardExport) => {
      await importDashboardData(payload);
      await refresh();
    },
    [refresh]
  );

  const resetData = useCallback(async () => {
    await resetDashboardData();
    await refresh();
  }, [refresh]);

  const insights = useMemo(() => (settings ? buildInsights(entries, settings) : []), [entries, settings]);

  return {
    entries,
    settings,
    localFoods,
    insights,
    loading,
    refresh,
    updateSettings,
    upsertEntry,
    removeEntry,
    upsertLocalFood,
    exportData,
    importData,
    resetData
  };
}

