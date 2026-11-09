import { getDB } from './db';
import { AppSettings } from '../types';
import { DEFAULT_APP_SETTINGS } from '../constants/defaultData';

export { AppSettings } from '../types';

export async function getSetting<T>(key: keyof AppSettings | string, defaultValue?: T): Promise<T> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    [key as string]
  );
  if (!row) {
    return (defaultValue !== undefined ? defaultValue : (DEFAULT_APP_SETTINGS as any)[key]) as T;
  }
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return row.value as unknown as T;
  }
}

export async function setSetting<T>(key: keyof AppSettings | string, value: T): Promise<void> {
  const db = await getDB();
  const serialized = JSON.stringify(value);
  await db.runAsync(
    'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?',
    [key as string, serialized, serialized]
  );
}

export async function getAllSettings(): Promise<AppSettings> {
  const db = await getDB();
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM app_settings'
  );
  const settings = { ...DEFAULT_APP_SETTINGS };
  for (const r of rows) {
    try {
      (settings as any)[r.key] = JSON.parse(r.value);
    } catch {
      (settings as any)[r.key] = r.value;
    }
  }
  return settings;
}

