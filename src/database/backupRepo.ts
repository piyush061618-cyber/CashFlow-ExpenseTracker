import { getDB } from './db';
import { nowISO } from '../utils/date';

export interface BackupData {
  version: number;
  appName: string;
  exportedAt: string;
  data: {
    wallets: any[];
    categories: any[];
    transactions: any[];
    transfers: any[];
    budgets: any[];
    savings_goals: any[];
    recurring_transactions: any[];
    app_settings: any[];
  };
}

export async function exportDatabaseToJson(): Promise<string> {
  const db = await getDB();

  const [
    wallets,
    categories,
    transactions,
    transfers,
    budgets,
    savings_goals,
    recurring_transactions,
    app_settings,
  ] = await Promise.all([
    db.getAllAsync('SELECT * FROM wallets'),
    db.getAllAsync('SELECT * FROM categories'),
    db.getAllAsync('SELECT * FROM transactions'),
    db.getAllAsync('SELECT * FROM transfers'),
    db.getAllAsync('SELECT * FROM budgets'),
    db.getAllAsync('SELECT * FROM savings_goals'),
    db.getAllAsync('SELECT * FROM recurring_transactions'),
    db.getAllAsync('SELECT * FROM app_settings'),
  ]);

  const backup: BackupData = {
    version: 1,
    appName: 'CashFlow',
    exportedAt: nowISO(),
    data: {
      wallets,
      categories,
      transactions,
      transfers,
      budgets,
      savings_goals,
      recurring_transactions,
      app_settings,
    },
  };

  return JSON.stringify(backup, null, 2);
}

export async function validateAndRestoreDatabase(
  jsonString: string
): Promise<{ success: boolean; message: string; recordCounts?: Record<string, number> }> {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return { success: false, message: 'Invalid JSON format in backup file.' };
  }

  // Validate format
  if (!parsed || parsed.appName !== 'CashFlow' || !parsed.version || !parsed.data) {
    return {
      success: false,
      message: 'Unrecognized backup structure. Ensure this is a CashFlow backup.',
    };
  }

  const { data } = parsed;
  if (!Array.isArray(data.wallets) || !Array.isArray(data.transactions) || !Array.isArray(data.categories)) {
    return { success: false, message: 'Missing critical tables in backup payload.' };
  }

  const db = await getDB();

  try {
    await db.withTransactionAsync(async () => {
      // 1. Temporarily disable foreign keys for clean restoration
      await db.execAsync('PRAGMA foreign_keys = OFF;');

      // 2. Clear tables
      await db.execAsync(`
        DELETE FROM transactions;
        DELETE FROM transfers;
        DELETE FROM budgets;
        DELETE FROM savings_goals;
        DELETE FROM recurring_transactions;
        DELETE FROM categories;
        DELETE FROM wallets;
        DELETE FROM app_settings;
      `);

      // 3. Restore categories
      for (const c of data.categories) {
        await db.runAsync(
          'INSERT INTO categories (id, name, type, icon, color, is_custom, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [c.id, c.name, c.type, c.icon, c.color, c.is_custom || 0, c.created_at || nowISO()]
        );
      }

      // 4. Restore wallets
      for (const w of data.wallets) {
        await db.runAsync(
          'INSERT INTO wallets (id, name, type, balance_paise, credit_limit_paise, color, icon, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            w.id,
            w.name,
            w.type,
            w.balance_paise,
            w.credit_limit_paise || 0,
            w.color,
            w.icon,
            w.is_default || 0,
            w.created_at || nowISO(),
            w.updated_at || nowISO(),
          ]
        );
      }

      // 5. Restore transactions
      for (const t of data.transactions) {
        await db.runAsync(
          'INSERT INTO transactions (id, type, amount_paise, category_id, wallet_id, date, description, payment_method, receipt_uri, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            t.id,
            t.type,
            t.amount_paise,
            t.category_id,
            t.wallet_id,
            t.date,
            t.description || '',
            t.payment_method || 'Cash',
            t.receipt_uri || null,
            t.created_at || nowISO(),
            t.updated_at || nowISO(),
          ]
        );
      }

      // 6. Restore transfers
      if (Array.isArray(data.transfers)) {
        for (const tr of data.transfers) {
          await db.runAsync(
            'INSERT INTO transfers (id, from_wallet_id, to_wallet_id, amount_paise, date, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [tr.id, tr.from_wallet_id, tr.to_wallet_id, tr.amount_paise, tr.date, tr.notes || '', tr.created_at || nowISO()]
          );
        }
      }

      // 7. Restore budgets
      if (Array.isArray(data.budgets)) {
        for (const b of data.budgets) {
          await db.runAsync(
            'INSERT INTO budgets (id, category_id, amount_paise, period, period_key, notify_75, notify_90, notify_100, notified_threshold, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              b.id,
              b.category_id || null,
              b.amount_paise,
              b.period,
              b.period_key,
              b.notify_75 || 1,
              b.notify_90 || 1,
              b.notify_100 || 1,
              b.notified_threshold || 0,
              b.created_at || nowISO(),
            ]
          );
        }
      }

      // 8. Restore savings goals
      if (Array.isArray(data.savings_goals)) {
        for (const g of data.savings_goals) {
          await db.runAsync(
            'INSERT INTO savings_goals (id, title, target_amount_paise, saved_amount_paise, target_date, color, icon, is_completed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              g.id,
              g.title,
              g.target_amount_paise,
              g.saved_amount_paise,
              g.target_date,
              g.color,
              g.icon,
              g.is_completed || 0,
              g.created_at || nowISO(),
            ]
          );
        }
      }

      // 9. Restore recurring
      if (Array.isArray(data.recurring_transactions)) {
        for (const r of data.recurring_transactions) {
          await db.runAsync(
            'INSERT INTO recurring_transactions (id, type, amount_paise, category_id, wallet_id, description, frequency, start_date, end_date, next_due_date, last_processed_date, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              r.id,
              r.type,
              r.amount_paise,
              r.category_id,
              r.wallet_id,
              r.description,
              r.frequency,
              r.start_date,
              r.end_date || null,
              r.next_due_date,
              r.last_processed_date || null,
              r.is_active !== undefined ? r.is_active : 1,
              r.created_at || nowISO(),
            ]
          );
        }
      }

      // 10. Restore settings
      if (Array.isArray(data.app_settings)) {
        for (const s of data.app_settings) {
          await db.runAsync(
            'INSERT INTO app_settings (key, value) VALUES (?, ?)',
            [s.key, s.value]
          );
        }
      }

      // Re-enable foreign keys
      await db.execAsync('PRAGMA foreign_keys = ON;');
    });

    return {
      success: true,
      message: 'Database successfully restored from backup!',
      recordCounts: {
        transactions: data.transactions.length,
        wallets: data.wallets.length,
        categories: data.categories.length,
        transfers: data.transfers?.length || 0,
        budgets: data.budgets?.length || 0,
        goals: data.savings_goals?.length || 0,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Restoration failed: ${err.message || 'Unknown database error'}`,
    };
  }
}

