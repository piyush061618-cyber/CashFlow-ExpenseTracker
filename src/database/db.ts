import * as SQLite from 'expo-sqlite';
import { DEFAULT_INCOME_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_WALLETS, DEFAULT_APP_SETTINGS } from '../constants/defaultData';
import { nowISO } from '../utils/date';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('cashflow.db');
    await dbInstance.execAsync('PRAGMA foreign_keys = ON;');
    await dbInstance.execAsync('PRAGMA journal_mode = WAL;');
  }
  return dbInstance;
}

export async function initDatabase(): Promise<void> {
  const db = await getDB();

  // Create tables
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS wallets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      balance_paise INTEGER NOT NULL DEFAULT 0,
      credit_limit_paise INTEGER DEFAULT 0,
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      is_custom INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      amount_paise INTEGER NOT NULL,
      category_id TEXT NOT NULL,
      wallet_id TEXT NOT NULL,
      date TEXT NOT NULL,
      description TEXT,
      payment_method TEXT NOT NULL,
      receipt_uri TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
      FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS transfers (
      id TEXT PRIMARY KEY,
      from_wallet_id TEXT NOT NULL,
      to_wallet_id TEXT NOT NULL,
      amount_paise INTEGER NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (from_wallet_id) REFERENCES wallets(id) ON DELETE RESTRICT,
      FOREIGN KEY (to_wallet_id) REFERENCES wallets(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      category_id TEXT,
      amount_paise INTEGER NOT NULL,
      period TEXT NOT NULL,
      period_key TEXT NOT NULL,
      notify_75 INTEGER NOT NULL DEFAULT 1,
      notify_90 INTEGER NOT NULL DEFAULT 1,
      notify_100 INTEGER NOT NULL DEFAULT 1,
      notified_threshold INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS savings_goals (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      target_amount_paise INTEGER NOT NULL,
      saved_amount_paise INTEGER NOT NULL DEFAULT 0,
      target_date TEXT NOT NULL,
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      is_completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recurring_transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      amount_paise INTEGER NOT NULL,
      category_id TEXT NOT NULL,
      wallet_id TEXT NOT NULL,
      description TEXT,
      frequency TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      next_due_date TEXT NOT NULL,
      last_processed_date TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
      FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notification_history (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      type TEXT NOT NULL,
      triggered_at TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_transfers_date ON transfers(date);
    CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(period, period_key);
    CREATE INDEX IF NOT EXISTS idx_recurring_active ON recurring_transactions(is_active, next_due_date);
  `);

  // Seed default categories if none exist
  const catCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM categories');
  if (!catCount || catCount.count === 0) {
    const now = nowISO();
    for (const c of DEFAULT_INCOME_CATEGORIES) {
      await db.runAsync(
        'INSERT INTO categories (id, name, type, icon, color, is_custom, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [c.id, c.name, c.type, c.icon, c.color, c.is_custom, now]
      );
    }
    for (const c of DEFAULT_EXPENSE_CATEGORIES) {
      await db.runAsync(
        'INSERT INTO categories (id, name, type, icon, color, is_custom, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [c.id, c.name, c.type, c.icon, c.color, c.is_custom, now]
      );
    }
  }

  // Seed default wallets if none exist
  const walletCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM wallets');
  if (!walletCount || walletCount.count === 0) {
    const now = nowISO();
    for (const w of DEFAULT_WALLETS) {
      await db.runAsync(
        'INSERT INTO wallets (id, name, type, balance_paise, credit_limit_paise, color, icon, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [w.id, w.name, w.type, w.balance_paise, w.credit_limit_paise || 0, w.color, w.icon, w.is_default, now, now]
      );
    }
  }

  // Seed default settings if empty
  const settingsCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM app_settings');
  if (!settingsCount || settingsCount.count === 0) {
    for (const [key, value] of Object.entries(DEFAULT_APP_SETTINGS)) {
      await db.runAsync('INSERT INTO app_settings (key, value) VALUES (?, ?)', [key, JSON.stringify(value)]);
    }
  }
}

