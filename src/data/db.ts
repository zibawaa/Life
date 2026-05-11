import Dexie, { type Table } from 'dexie';
import type { AppSettings, DashboardEntry, DashboardExport, LocalFood } from '../types';
import { defaultSettings } from './defaults';

interface SettingRecord {
  key: 'app';
  value: AppSettings;
}

class LifeDashboardDatabase extends Dexie {
  entries!: Table<DashboardEntry, string>;
  settings!: Table<SettingRecord, string>;
  localFoods!: Table<LocalFood, string>;

  constructor() {
    super('LifeDashboardDB');
    this.version(1).stores({
      entries: 'id, type, date, createdAt',
      settings: 'key',
      localFoods: 'id, barcode, name'
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

export async function exportDashboardData(): Promise<DashboardExport> {
  const [settings, entries, localFoods] = await Promise.all([getSettings(), listEntries(), listLocalFoods()]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    entries,
    localFoods
  };
}

export async function importDashboardData(payload: DashboardExport) {
  if (payload.version !== 1 || !payload.settings || !Array.isArray(payload.entries) || !Array.isArray(payload.localFoods)) {
    throw new Error('This backup file is not a valid Life Dashboard export.');
  }

  await db.transaction('rw', db.entries, db.settings, db.localFoods, async () => {
    await db.entries.clear();
    await db.settings.clear();
    await db.localFoods.clear();
    await db.settings.put({ key: 'app', value: payload.settings });
    await db.entries.bulkPut(payload.entries);
    await db.localFoods.bulkPut(payload.localFoods);
  });
}

export async function resetDashboardData() {
  await db.transaction('rw', db.entries, db.settings, db.localFoods, async () => {
    await db.entries.clear();
    await db.localFoods.clear();
    await db.settings.clear();
    await db.settings.put({ key: 'app', value: defaultSettings() });
  });
}
