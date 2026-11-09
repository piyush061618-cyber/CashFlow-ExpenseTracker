import { getDB } from './db';
import {
  Transaction,
  TransactionFilter,
  FinancialSummary,
  CategoryBreakdownItem,
  TransactionType,
} from '../types';
import {
  nowISO,
  getStartOfDay,
  getEndOfDay,
  getWeekRange,
  getMonthRange,
  getMonthKey,
} from '../utils/date';
import { getNetAvailableBalance } from './walletsRepo';

/**
 * Reverses a transaction's balance effect on a given wallet
 */
async function reverseWalletEffect(
  db: any,
  walletId: string,
  type: TransactionType,
  amountPaise: number,
  timestamp: string
) {
  if (type === 'income') {
    // Reversing income = decrease balance
    await db.runAsync(
      'UPDATE wallets SET balance_paise = balance_paise - ?, updated_at = ? WHERE id = ?',
      [amountPaise, timestamp, walletId]
    );
  } else {
    // Reversing expense = increase balance
    await db.runAsync(
      'UPDATE wallets SET balance_paise = balance_paise + ?, updated_at = ? WHERE id = ?',
      [amountPaise, timestamp, walletId]
    );
  }
}

/**
 * Applies a transaction's balance effect to a wallet
 */
async function applyWalletEffect(
  db: any,
  walletId: string,
  type: TransactionType,
  amountPaise: number,
  timestamp: string
) {
  if (type === 'income') {
    // Income increases balance
    await db.runAsync(
      'UPDATE wallets SET balance_paise = balance_paise + ?, updated_at = ? WHERE id = ?',
      [amountPaise, timestamp, walletId]
    );
  } else {
    // Expense decreases balance
    await db.runAsync(
      'UPDATE wallets SET balance_paise = balance_paise - ?, updated_at = ? WHERE id = ?',
      [amountPaise, timestamp, walletId]
    );
  }
}

/**
 * Adds a transaction atomically and updates the wallet balance
 */
export async function addTransaction(
  tx: Omit<Transaction, 'created_at' | 'updated_at'>
): Promise<Transaction> {
  const db = await getDB();
  const now = nowISO();

  await db.withTransactionAsync(async () => {
    // 1. Insert transaction
    await db.runAsync(
      `INSERT INTO transactions (id, type, amount_paise, category_id, wallet_id, date, description, payment_method, receipt_uri, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tx.id,
        tx.type,
        tx.amount_paise,
        tx.category_id,
        tx.wallet_id,
        tx.date,
        tx.description || '',
        tx.payment_method,
        tx.receipt_uri || null,
        now,
        now,
      ]
    );

    // 2. Atomically update wallet balance
    await applyWalletEffect(db, tx.wallet_id, tx.type, tx.amount_paise, now);
  });

  return {
    ...tx,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Updates a transaction atomically: reverses prior effect on old wallet, applies new effect
 */
export async function updateTransaction(tx: Transaction): Promise<void> {
  const db = await getDB();
  const now = nowISO();

  await db.withTransactionAsync(async () => {
    // 1. Retrieve current state of transaction
    const existing = await db.getFirstAsync<Transaction>(
      'SELECT * FROM transactions WHERE id = ?',
      [tx.id]
    );
    if (!existing) {
      throw new Error(`Transaction ${tx.id} not found.`);
    }

    // 2. Reverse previous effect on the previous wallet
    await reverseWalletEffect(
      db,
      existing.wallet_id,
      existing.type,
      existing.amount_paise,
      now
    );

    // 3. Update transaction record
    await db.runAsync(
      `UPDATE transactions SET
         type = ?,
         amount_paise = ?,
         category_id = ?,
         wallet_id = ?,
         date = ?,
         description = ?,
         payment_method = ?,
         receipt_uri = ?,
         updated_at = ?
       WHERE id = ?`,
      [
        tx.type,
        tx.amount_paise,
        tx.category_id,
        tx.wallet_id,
        tx.date,
        tx.description || '',
        tx.payment_method,
        tx.receipt_uri || null,
        now,
        tx.id,
      ]
    );

    // 4. Apply new effect to the target wallet
    await applyWalletEffect(db, tx.wallet_id, tx.type, tx.amount_paise, now);
  });
}

/**
 * Deletes a transaction atomically and restores wallet balance
 */
export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDB();
  const now = nowISO();

  await db.withTransactionAsync(async () => {
    const existing = await db.getFirstAsync<Transaction>(
      'SELECT * FROM transactions WHERE id = ?',
      [id]
    );
    if (!existing) {
      return;
    }

    // Reverse effect on wallet
    await reverseWalletEffect(
      db,
      existing.wallet_id,
      existing.type,
      existing.amount_paise,
      now
    );

    // Delete record
    await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
  });
}

export async function getTransactionById(id: string): Promise<Transaction | null> {
  const db = await getDB();
  const row = await db.getFirstAsync<Transaction>(
    `SELECT
       t.*,
       c.name as category_name,
       c.icon as category_icon,
       c.color as category_color,
       w.name as wallet_name,
       w.type as wallet_type,
       w.color as wallet_color
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     LEFT JOIN wallets w ON t.wallet_id = w.id
     WHERE t.id = ?`,
    [id]
  );
  return row || null;
}

/**
 * Queries transactions with flexible filtering, search, and sorting
 */
export async function getFilteredTransactions(
  filter: TransactionFilter = {}
): Promise<Transaction[]> {
  const db = await getDB();
  const whereClauses: string[] = [];
  const params: any[] = [];

  if (filter.type && filter.type !== 'all') {
    whereClauses.push('t.type = ?');
    params.push(filter.type);
  }

  if (filter.startDate) {
    whereClauses.push('t.date >= ?');
    params.push(filter.startDate);
  }

  if (filter.endDate) {
    whereClauses.push('t.date <= ?');
    params.push(filter.endDate);
  }

  if (filter.categoryIds && filter.categoryIds.length > 0) {
    const placeholders = filter.categoryIds.map(() => '?').join(',');
    whereClauses.push(`t.category_id IN (${placeholders})`);
    params.push(...filter.categoryIds);
  }

  if (filter.walletIds && filter.walletIds.length > 0) {
    const placeholders = filter.walletIds.map(() => '?').join(',');
    whereClauses.push(`t.wallet_id IN (${placeholders})`);
    params.push(...filter.walletIds);
  }

  if (filter.paymentMethods && filter.paymentMethods.length > 0) {
    const placeholders = filter.paymentMethods.map(() => '?').join(',');
    whereClauses.push(`t.payment_method IN (${placeholders})`);
    params.push(...filter.paymentMethods);
  }

  if (filter.searchQuery && filter.searchQuery.trim().length > 0) {
    whereClauses.push('(t.description LIKE ? OR c.name LIKE ?)');
    const q = `%${filter.searchQuery.trim()}%`;
    params.push(q, q);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  let orderBySql = 'ORDER BY t.date DESC, t.created_at DESC';
  if (filter.sortBy === 'oldest') {
    orderBySql = 'ORDER BY t.date ASC, t.created_at ASC';
  } else if (filter.sortBy === 'highest') {
    orderBySql = 'ORDER BY t.amount_paise DESC';
  } else if (filter.sortBy === 'lowest') {
    orderBySql = 'ORDER BY t.amount_paise ASC';
  }

  const query = `
    SELECT
      t.*,
      c.name as category_name,
      c.icon as category_icon,
      c.color as category_color,
      w.name as wallet_name,
      w.type as wallet_type,
      w.color as wallet_color
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN wallets w ON t.wallet_id = w.id
    ${whereSql}
    ${orderBySql}
  `;

  return await db.getAllAsync<Transaction>(query, params);
}

/**
 * Calculates complete dashboard financial summary metrics
 */
export async function getFinancialSummary(referenceDate: Date = new Date()): Promise<FinancialSummary> {
  const db = await getDB();
  const balances = await getNetAvailableBalance();

  const monthRange = getMonthRange(referenceDate);
  const weekRange = getWeekRange(referenceDate);
  const todayStart = getStartOfDay(referenceDate);
  const todayEnd = getEndOfDay(referenceDate);
  const monthKey = getMonthKey(referenceDate);

  // Month Income
  const monthIncRow = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount_paise), 0) as total FROM transactions
     WHERE type = 'income' AND date >= ? AND date <= ?`,
    [monthRange.start, monthRange.end]
  );
  const monthlyIncome = monthIncRow?.total || 0;

  // Month Expense
  const monthExpRow = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount_paise), 0) as total FROM transactions
     WHERE type = 'expense' AND date >= ? AND date <= ?`,
    [monthRange.start, monthRange.end]
  );
  const monthlyExpense = monthExpRow?.total || 0;

  // Today Expense
  const todayExpRow = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount_paise), 0) as total FROM transactions
     WHERE type = 'expense' AND date >= ? AND date <= ?`,
    [todayStart, todayEnd]
  );
  const todayExpense = todayExpRow?.total || 0;

  // Week Expense
  const weekExpRow = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount_paise), 0) as total FROM transactions
     WHERE type = 'expense' AND date >= ? AND date <= ?`,
    [weekRange.start, weekRange.end]
  );
  const weeklyExpense = weekExpRow?.total || 0;

  // Overall Monthly Budget
  const budgetRow = await db.getFirstAsync<{ amount_paise: number }>(
    `SELECT amount_paise FROM budgets
     WHERE category_id IS NULL AND period = 'monthly' AND period_key = ?`,
    [monthKey]
  );
  const monthlyBudgetLimit = budgetRow?.amount_paise || 0;
  const remainingBudget = monthlyBudgetLimit > 0 ? monthlyBudgetLimit - monthlyExpense : 0;

  return {
    total_balance_paise: balances.totalAvailablePaise,
    total_assets_paise: balances.totalAssetsPaise,
    total_liabilities_paise: balances.totalLiabilitiesPaise,
    monthly_income_paise: monthlyIncome,
    monthly_expense_paise: monthlyExpense,
    monthly_savings_paise: monthlyIncome - monthlyExpense,
    today_expense_paise: todayExpense,
    weekly_expense_paise: weeklyExpense,
    remaining_monthly_budget_paise: remainingBudget,
    monthly_budget_limit_paise: monthlyBudgetLimit,
    monthly_budget_consumed_paise: monthlyExpense,
  };
}

/**
 * Returns category breakdown for reporting and pie charts
 */
export async function getCategoryBreakdown(
  startDate: string,
  endDate: string,
  type: TransactionType = 'expense'
): Promise<CategoryBreakdownItem[]> {
  const db = await getDB();

  const totalRow = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount_paise), 0) as total FROM transactions
     WHERE type = ? AND date >= ? AND date <= ?`,
    [type, startDate, endDate]
  );
  const overallTotal = totalRow?.total || 0;

  const rows = await db.getAllAsync<{
    category_id: string;
    category_name: string;
    category_color: string;
    category_icon: string;
    total_paise: number;
    count: number;
  }>(
    `SELECT
       t.category_id,
       c.name as category_name,
       c.color as category_color,
       c.icon as category_icon,
       SUM(t.amount_paise) as total_paise,
       COUNT(t.id) as count
     FROM transactions t
     JOIN categories c ON t.category_id = c.id
     WHERE t.type = ? AND t.date >= ? AND t.date <= ?
     GROUP BY t.category_id
     ORDER BY total_paise DESC`,
    [type, startDate, endDate]
  );

  return rows.map((r) => ({
    ...r,
    percentage: overallTotal > 0 ? (r.total_paise / overallTotal) * 100 : 0,
  }));
}

/**
 * Returns daily expense totals for a date range (used for bar charts)
 */
export async function getDailyExpenseTotals(
  startDate: string,
  endDate: string
): Promise<{ dateStr: string; total_paise: number }[]> {
  const db = await getDB();
  return await db.getAllAsync<{ dateStr: string; total_paise: number }>(
    `SELECT
       SUBSTR(date, 1, 10) as dateStr,
       COALESCE(SUM(amount_paise), 0) as total_paise
     FROM transactions
     WHERE type = 'expense' AND date >= ? AND date <= ?
     GROUP BY SUBSTR(date, 1, 10)
     ORDER BY dateStr ASC`,
    [startDate, endDate]
  );
}

/**
 * Returns monthly spending and income trends for a given year
 */
export async function getMonthlyTrend(
  year: number
): Promise<{ monthKey: string; income_paise: number; expense_paise: number }[]> {
  const db = await getDB();
  const start = `${year}-01-01T00:00:00.000Z`;
  const end = `${year}-12-31T23:59:59.999Z`;

  const rows = await db.getAllAsync<{
    monthKey: string;
    income_paise: number;
    expense_paise: number;
  }>(
    `SELECT
       SUBSTR(date, 1, 7) as monthKey,
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount_paise ELSE 0 END), 0) as income_paise,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_paise ELSE 0 END), 0) as expense_paise
     FROM transactions
     WHERE date >= ? AND date <= ?
     GROUP BY SUBSTR(date, 1, 7)
     ORDER BY monthKey ASC`,
    [start, end]
  );

  return rows;
}

