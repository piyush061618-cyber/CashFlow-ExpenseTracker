import { getDB } from './db';
import { SavingsGoal } from '../types';
import { nowISO } from '../utils/date';

export async function getAllGoals(): Promise<SavingsGoal[]> {
  const db = await getDB();
  return await db.getAllAsync<SavingsGoal>(
    'SELECT * FROM savings_goals ORDER BY is_completed ASC, target_date ASC'
  );
}

export async function getGoalById(id: string): Promise<SavingsGoal | null> {
  const db = await getDB();
  const goal = await db.getFirstAsync<SavingsGoal>(
    'SELECT * FROM savings_goals WHERE id = ?',
    [id]
  );
  return goal || null;
}

export async function createGoal(
  goal: Omit<SavingsGoal, 'created_at' | 'saved_amount_paise' | 'is_completed'>
): Promise<SavingsGoal> {
  const db = await getDB();
  const now = nowISO();
  await db.runAsync(
    `INSERT INTO savings_goals (id, title, target_amount_paise, saved_amount_paise, target_date, color, icon, is_completed, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      goal.id,
      goal.title,
      goal.target_amount_paise,
      0,
      goal.target_date,
      goal.color,
      goal.icon,
      0,
      now,
    ]
  );
  return {
    ...goal,
    saved_amount_paise: 0,
    is_completed: 0,
    created_at: now,
  };
}

export async function updateGoal(goal: SavingsGoal): Promise<void> {
  const db = await getDB();
  const isCompleted = goal.saved_amount_paise >= goal.target_amount_paise ? 1 : 0;
  await db.runAsync(
    `UPDATE savings_goals SET
       title = ?,
       target_amount_paise = ?,
       saved_amount_paise = ?,
       target_date = ?,
       color = ?,
       icon = ?,
       is_completed = ?
     WHERE id = ?`,
    [
      goal.title,
      goal.target_amount_paise,
      goal.saved_amount_paise,
      goal.target_date,
      goal.color,
      goal.icon,
      isCompleted,
      goal.id,
    ]
  );
}

export async function deleteGoal(id: string): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM savings_goals WHERE id = ?', [id]);
}

/**
 * Deposits money towards a savings goal from a specified wallet.
 * Atomically debits wallet and credits goal saved_amount to prevent double counting.
 */
export async function depositToGoal(
  goalId: string,
  walletId: string,
  amountPaise: number
): Promise<{ success: boolean; newSavedAmount: number; isCompleted: boolean }> {
  if (amountPaise <= 0) {
    throw new Error('Deposit amount must be positive.');
  }

  const db = await getDB();
  const now = nowISO();
  let newSavedAmount = 0;
  let isCompleted = false;

  await db.withTransactionAsync(async () => {
    const goal = await db.getFirstAsync<SavingsGoal>(
      'SELECT * FROM savings_goals WHERE id = ?',
      [goalId]
    );
    if (!goal) throw new Error('Goal not found.');

    const wallet = await db.getFirstAsync<{ balance_paise: number }>(
      'SELECT balance_paise FROM wallets WHERE id = ?',
      [walletId]
    );
    if (!wallet) throw new Error('Wallet not found.');

    newSavedAmount = goal.saved_amount_paise + amountPaise;
    isCompleted = newSavedAmount >= goal.target_amount_paise;

    // 1. Debit wallet
    await db.runAsync(
      'UPDATE wallets SET balance_paise = balance_paise - ?, updated_at = ? WHERE id = ?',
      [amountPaise, now, walletId]
    );

    // 2. Credit goal
    await db.runAsync(
      'UPDATE savings_goals SET saved_amount_paise = ?, is_completed = ? WHERE id = ?',
      [newSavedAmount, isCompleted ? 1 : 0, goalId]
    );
  });

  return { success: true, newSavedAmount, isCompleted };
}

/**
 * Withdraws money from a goal back into a wallet
 */
export async function withdrawFromGoal(
  goalId: string,
  walletId: string,
  amountPaise: number
): Promise<{ success: boolean; newSavedAmount: number }> {
  if (amountPaise <= 0) {
    throw new Error('Withdrawal amount must be positive.');
  }

  const db = await getDB();
  const now = nowISO();
  let newSavedAmount = 0;

  await db.withTransactionAsync(async () => {
    const goal = await db.getFirstAsync<SavingsGoal>(
      'SELECT * FROM savings_goals WHERE id = ?',
      [goalId]
    );
    if (!goal) throw new Error('Goal not found.');

    if (amountPaise > goal.saved_amount_paise) {
      throw new Error('Withdrawal amount exceeds saved goal balance.');
    }

    newSavedAmount = goal.saved_amount_paise - amountPaise;
    const isCompleted = newSavedAmount >= goal.target_amount_paise;

    // 1. Credit wallet
    await db.runAsync(
      'UPDATE wallets SET balance_paise = balance_paise + ?, updated_at = ? WHERE id = ?',
      [amountPaise, now, walletId]
    );

    // 2. Debit goal
    await db.runAsync(
      'UPDATE savings_goals SET saved_amount_paise = ?, is_completed = ? WHERE id = ?',
      [newSavedAmount, isCompleted ? 1 : 0, goalId]
    );
  });

  return { success: true, newSavedAmount };
}

