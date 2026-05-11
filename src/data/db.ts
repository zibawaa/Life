import Dexie, { type Table } from 'dexie';
import type { AppSettings, DashboardEntry, DashboardExport, LocalFood, WeightLog } from '../types';
import { defaultSettings } from './defaults';

interface SettingRecord {
  key: 'app';
  value: AppSettings;
}

class LifeDashboardDatabase extends Dexie {
  entries!: Table<DashboardEntry, string>;
  settings!: Table<SettingRecord, string>;
  localFoods!: Table<LocalFood, string>;
  weightLogs!: Table<WeightLog, string>;

  constructor() {
    super('LifeDashboardDB');
    this.version(1).stores({
      entries: 'id, type, date, createdAt',
      settings: 'key',
      localFoods: 'id, barcode, name'
    });
    this.version(2).stores({
      entries: 'id, type, date, createdAt',
      settings: 'key',
      localFoods: 'id, barcode, name, source',
      weightLogs: 'id, date, createdAt'
    });
  }
}

export const db = new LifeDashboardDatabase();

export async function getSettings(): Promise<AppSettings> {
  const existing = await db.settings.get('app');
  if (existing?.value) {
    return {
      ...defaultSettings(),
      ...existing.value,
      profile: { ...defaultSettings().profile, ...existing.value.profile },
      workoutSplit: existing.value.workoutSplit?.length ? existing.value.workoutSplit : defaultSettings().workoutSplit
    };
  }

  const settings = defaultSettings();
  await db.settings.put({ key: 'app', value: settings });
  return settings;
}

export async function putSettings(settings: AppSettings) {
  await db.settings.put({ key: 'app', value: settings });
}

export async function listEntries() {
  return db.entries.orderBy('date').reverse().toArray();
}

export async function saveEntry(entry: DashboardEntry) {
  await db.entries.put(entry);
}

export async function deleteEntry(id: string) {
  await db.entries.delete(id);
}

export async function listLocalFoods() {
  return db.localFoods.orderBy('name').toArray();
}

export async function saveLocalFood(food: LocalFood) {
  await db.localFoods.put(food);
}

export async function listWeightLogs() {
  return db.weightLogs.orderBy('date').reverse().toArray();
}

export async function saveWeightLog(log: WeightLog) {
  await db.weightLogs.put(log);
}

export async function deleteWeightLog(id: string) {
  await db.weightLogs.delete(id);
}

export async function exportDashboardData(): Promise<DashboardExport> {
  const [settings, entries, localFoods, weightLogs] = await Promise.all([getSettings(), listEntries(), listLocalFoods(), listWeightLogs()]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    entries,
    localFoods,
    weightLogs
  };
}

export async function importDashboardData(payload: DashboardExport) {
  if (payload.version !== 1 || !payload.settings || !Array.isArray(payload.entries) || !Array.isArray(payload.localFoods)) {
    throw new Error('This backup file is not a valid Life Dashboard export.');
  }

  await db.transaction('rw', db.entries, db.settings, db.localFoods, db.weightLogs, async () => {
    await db.entries.clear();
    await db.settings.clear();
    await db.localFoods.clear();
    await db.weightLogs.clear();
    await db.settings.put({ key: 'app', value: payload.settings });
    await db.entries.bulkPut(payload.entries);
    await db.localFoods.bulkPut(payload.localFoods);
    if (Array.isArray(payload.weightLogs)) {
      await db.weightLogs.bulkPut(payload.weightLogs);
    }
  });
}

export async function resetDashboardData() {
  await db.transaction('rw', db.entries, db.settings, db.localFoods, db.weightLogs, async () => {
    await db.entries.clear();
    await db.localFoods.clear();
    await db.weightLogs.clear();
    await db.settings.clear();
    await db.settings.put({ key: 'app', value: defaultSettings() });
  });
}
