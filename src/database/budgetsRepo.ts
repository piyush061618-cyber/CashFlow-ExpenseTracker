import { getDB } from './db';
import { Budget, BudgetPeriod } from '../types';
import { nowISO, getMonthRange, getWeekRange, getMonthKey, getWeekKey } from '../utils/date';

export async function getBudgetsWithProgress(
  period: BudgetPeriod = 'monthly',
  periodKey?: string
): Promise<Budget[]> {
  const db = await getDB();
  const currentKey =
    periodKey || (period === 'monthly' ? getMonthKey() : getWeekKey());

  const dateRange =
    period === 'monthly' ? getMonthRange() : getWeekRange();

  const budgets = await db.getAllAsync<Budget>(
    `SELECT
       b.*,
       c.name as category_name,
       c.color as category_color,
       c.icon as category_icon
     FROM budgets b
     LEFT JOIN categories c ON b.category_id = c.id
     WHERE b.period = ? AND b.period_key = ?
     ORDER BY b.category_id IS NULL DESC, b.amount_paise DESC`,
    [period, currentKey]
  );

  // Compute actual spent for each budget in its period
  for (const b of budgets) {
    let spentRow;
    if (b.category_id) {
      spentRow = await db.getFirstAsync<{ spent: number }>(
        `SELECT COALESCE(SUM(amount_paise), 0) as spent
         FROM transactions
         WHERE type = 'expense' AND category_id = ? AND date >= ? AND date <= ?`,
        [b.category_id, dateRange.start, dateRange.end]
      );
    } else {
      spentRow = await db.getFirstAsync<{ spent: number }>(
        `SELECT COALESCE(SUM(amount_paise), 0) as spent
         FROM transactions
         WHERE type = 'expense' AND date >= ? AND date <= ?`,
        [dateRange.start, dateRange.end]
      );
    }

    const spent = spentRow?.spent || 0;
    b.spent_paise = spent;
    b.remaining_paise = b.amount_paise - spent;
    b.percentage = b.amount_paise > 0 ? Math.min(Math.round((spent / b.amount_paise) * 100), 999) : 0;
  }

  return budgets;
}

export async function upsertBudget(
  budget: Omit<Budget, 'created_at'>
): Promise<Budget> {
  const db = await getDB();
  const now = nowISO();

  // Check if budget exists for this category/period
  let existing;
  if (budget.category_id) {
    existing = await db.getFirstAsync<Budget>(
      'SELECT * FROM budgets WHERE category_id = ? AND period = ? AND period_key = ?',
      [budget.category_id, budget.period, budget.period_key]
    );
  } else {
    existing = await db.getFirstAsync<Budget>(
      'SELECT * FROM budgets WHERE category_id IS NULL AND period = ? AND period_key = ?',
      [budget.period, budget.period_key]
    );
  }

  if (existing) {
    await db.runAsync(
      `UPDATE budgets SET
         amount_paise = ?,
         notify_75 = ?,
         notify_90 = ?,
         notify_100 = ?
       WHERE id = ?`,
      [budget.amount_paise, budget.notify_75, budget.notify_90, budget.notify_100, existing.id]
    );
    return {
      ...budget,
      id: existing.id,
      created_at: existing.created_at,
    };
  } else {
    await db.runAsync(
      `INSERT INTO budgets (id, category_id, amount_paise, period, period_key, notify_75, notify_90, notify_100, notified_threshold, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        budget.id,
        budget.category_id || null,
        budget.amount_paise,
        budget.period,
        budget.period_key,
        budget.notify_75,
        budget.notify_90,
        budget.notify_100,
        0,
        now,
      ]
    );
    return {
      ...budget,
      created_at: now,
    };
  }
}

export async function updateBudgetNotifiedThreshold(
  budgetId: string,
  threshold: number
): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    'UPDATE budgets SET notified_threshold = ? WHERE id = ?',
    [threshold, budgetId]
  );
}

export async function deleteBudget(id: string): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM budgets WHERE id = ?', [id]);
}

