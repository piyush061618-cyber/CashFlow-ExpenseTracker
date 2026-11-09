import { getDB } from './db';
import { RecurringTransaction } from '../types';
import { nowISO, computeNextDueDate } from '../utils/date';
import { addTransaction } from './transactionsRepo';
import { parseISO, isAfter } from 'date-fns';

export { computeNextDueDate };

export async function getAllRecurring(): Promise<RecurringTransaction[]> {
  const db = await getDB();
  return await db.getAllAsync<RecurringTransaction>(`
    SELECT
      r.*,
      c.name as category_name,
      w.name as wallet_name
    FROM recurring_transactions r
    LEFT JOIN categories c ON r.category_id = c.id
    LEFT JOIN wallets w ON r.wallet_id = w.id
    ORDER BY r.is_active DESC, r.next_due_date ASC
  `);
}

export async function createRecurring(
  rec: Omit<RecurringTransaction, 'created_at' | 'last_processed_date'>
): Promise<RecurringTransaction> {
  const db = await getDB();
  const now = nowISO();
  await db.runAsync(
    `INSERT INTO recurring_transactions (id, type, amount_paise, category_id, wallet_id, description, frequency, start_date, end_date, next_due_date, last_processed_date, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      rec.id,
      rec.type,
      rec.amount_paise,
      rec.category_id,
      rec.wallet_id,
      rec.description,
      rec.frequency,
      rec.start_date,
      rec.end_date || null,
      rec.next_due_date,
      null,
      rec.is_active,
      now,
    ]
  );
  return {
    ...rec,
    last_processed_date: null,
    created_at: now,
  };
}

export async function updateRecurring(rec: RecurringTransaction): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `UPDATE recurring_transactions SET
       type = ?,
       amount_paise = ?,
       category_id = ?,
       wallet_id = ?,
       description = ?,
       frequency = ?,
       start_date = ?,
       end_date = ?,
       next_due_date = ?,
       is_active = ?
     WHERE id = ?`,
    [
      rec.type,
      rec.amount_paise,
      rec.category_id,
      rec.wallet_id,
      rec.description,
      rec.frequency,
      rec.start_date,
      rec.end_date || null,
      rec.next_due_date,
      rec.is_active,
      rec.id,
    ]
  );
}

export async function toggleRecurringActive(id: string, isActive: boolean): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    'UPDATE recurring_transactions SET is_active = ? WHERE id = ?',
    [isActive ? 1 : 0, id]
  );
}

export async function deleteRecurring(id: string): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM recurring_transactions WHERE id = ?', [id]);
}

/**
 * Evaluates active recurring transactions and idempotently generates due transactions
 * Prevents duplicates when app is reopened repeatedly.
 */
export async function processDueRecurringTransactions(): Promise<{ processedCount: number }> {
  const db = await getDB();
  const now = new Date();
  const nowStr = now.toISOString();

  // Select active recurring items where next_due_date <= now
  const dueItems = await db.getAllAsync<RecurringTransaction>(
    'SELECT * FROM recurring_transactions WHERE is_active = 1 AND next_due_date <= ?',
    [nowStr]
  );

  let processedCount = 0;

  for (const item of dueItems) {
    // If end_date is set and current date is past end_date, deactivate and skip
    if (item.end_date && isAfter(now, parseISO(item.end_date))) {
      await db.runAsync('UPDATE recurring_transactions SET is_active = 0 WHERE id = ?', [item.id]);
      continue;
    }

    // Insert actual transaction
    const txId = 'tx_rec_' + item.id + '_' + item.next_due_date.substring(0, 10);

    // Check if this exact transaction was already created (idempotency check)
    const existing = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM transactions WHERE id = ?',
      [txId]
    );

    if (!existing) {
      await addTransaction({
        id: txId,
        type: item.type,
        amount_paise: item.amount_paise,
        category_id: item.category_id,
        wallet_id: item.wallet_id,
        date: item.next_due_date,
        description: `[Recurring] ${item.description}`,
        payment_method: 'Auto / Recurring',
      });
      processedCount++;
    }

    // Compute next due date
    const nextDue = computeNextDueDate(item.next_due_date, item.frequency);

    // Update recurring transaction state
    await db.runAsync(
      `UPDATE recurring_transactions SET
         last_processed_date = ?,
         next_due_date = ?
       WHERE id = ?`,
      [item.next_due_date, nextDue, item.id]
    );
  }

  return { processedCount };
}
