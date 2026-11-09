import { getDB } from './db';
import { Wallet, Transfer } from '../types';
import { nowISO } from '../utils/date';

export async function getAllWallets(): Promise<Wallet[]> {
  const db = await getDB();
  return await db.getAllAsync<Wallet>('SELECT * FROM wallets ORDER BY is_default DESC, name ASC');
}

export async function getWalletById(id: string): Promise<Wallet | null> {
  const db = await getDB();
  const wallet = await db.getFirstAsync<Wallet>('SELECT * FROM wallets WHERE id = ?', [id]);
  return wallet || null;
}

export async function createWallet(
  wallet: Omit<Wallet, 'created_at' | 'updated_at'>
): Promise<Wallet> {
  const db = await getDB();
  const now = nowISO();

  if (wallet.is_default === 1) {
    await db.runAsync('UPDATE wallets SET is_default = 0');
  }

  await db.runAsync(
    `INSERT INTO wallets (id, name, type, balance_paise, credit_limit_paise, color, icon, is_default, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      wallet.id,
      wallet.name,
      wallet.type,
      wallet.balance_paise,
      wallet.credit_limit_paise || 0,
      wallet.color,
      wallet.icon,
      wallet.is_default,
      now,
      now,
    ]
  );

  return {
    ...wallet,
    created_at: now,
    updated_at: now,
  };
}

export async function updateWallet(wallet: Wallet): Promise<void> {
  const db = await getDB();
  const now = nowISO();

  if (wallet.is_default === 1) {
    await db.runAsync('UPDATE wallets SET is_default = 0 WHERE id != ?', [wallet.id]);
  }

  await db.runAsync(
    `UPDATE wallets SET
       name = ?,
       type = ?,
       balance_paise = ?,
       credit_limit_paise = ?,
       color = ?,
       icon = ?,
       is_default = ?,
       updated_at = ?
     WHERE id = ?`,
    [
      wallet.name,
      wallet.type,
      wallet.balance_paise,
      wallet.credit_limit_paise || 0,
      wallet.color,
      wallet.icon,
      wallet.is_default,
      now,
      wallet.id,
    ]
  );
}

export async function deleteWallet(id: string): Promise<{ success: boolean; error?: string }> {
  const db = await getDB();

  // Check if transactions exist for this wallet
  const tx = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM transactions WHERE wallet_id = ?',
    [id]
  );
  if (tx && tx.count > 0) {
    return { success: false, error: 'Cannot delete wallet with existing transactions.' };
  }

  // Check transfers
  const tr = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM transfers WHERE from_wallet_id = ? OR to_wallet_id = ?',
    [id, id]
  );
  if (tr && tr.count > 0) {
    return { success: false, error: 'Cannot delete wallet with existing transfers.' };
  }

  await db.runAsync('DELETE FROM wallets WHERE id = ?', [id]);
  return { success: true };
}

/**
 * Transfers money atomically between wallets.
 * CRITICAL ACCOUNTING RULE:
 * Transfers between a user's own wallets must NOT be counted as income or expenses.
 * Ensures transfers correctly debit the source and credit the destination.
 */
export async function transferFunds(
  fromWalletId: string,
  toWalletId: string,
  amountPaise: number,
  notes: string = '',
  dateStr?: string
): Promise<Transfer> {
  if (fromWalletId === toWalletId) {
    throw new Error('Source and destination wallets must be different.');
  }
  if (amountPaise <= 0) {
    throw new Error('Transfer amount must be greater than zero.');
  }

  const db = await getDB();
  const transferId = 'tr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const now = dateStr || nowISO();

  await db.withTransactionAsync(async () => {
    // 1. Debit from source wallet
    await db.runAsync(
      'UPDATE wallets SET balance_paise = balance_paise - ?, updated_at = ? WHERE id = ?',
      [amountPaise, now, fromWalletId]
    );

    // 2. Credit destination wallet
    await db.runAsync(
      'UPDATE wallets SET balance_paise = balance_paise + ?, updated_at = ? WHERE id = ?',
      [amountPaise, now, toWalletId]
    );

    // 3. Record transfer entry (Isolated from transactions table)
    await db.runAsync(
      'INSERT INTO transfers (id, from_wallet_id, to_wallet_id, amount_paise, date, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [transferId, fromWalletId, toWalletId, amountPaise, now, notes, now]
    );
  });

  return {
    id: transferId,
    from_wallet_id: fromWalletId,
    to_wallet_id: toWalletId,
    amount_paise: amountPaise,
    date: now,
    notes,
    created_at: now,
  };
}

export async function getAllTransfers(): Promise<Transfer[]> {
  const db = await getDB();
  return await db.getAllAsync<Transfer>(`
    SELECT
      t.*,
      w1.name as from_wallet_name,
      w2.name as to_wallet_name
    FROM transfers t
    LEFT JOIN wallets w1 ON t.from_wallet_id = w1.id
    LEFT JOIN wallets w2 ON t.to_wallet_id = w2.id
    ORDER BY t.date DESC
  `);
}

/**
 * Calculates net available balance:
 * Asset wallets (Cash, Bank, Savings, UPI, Digital Wallet) - Credit Card liability
 */
export async function getNetAvailableBalance(): Promise<{
  totalAvailablePaise: number;
  totalAssetsPaise: number;
  totalLiabilitiesPaise: number;
}> {
  const wallets = await getAllWallets();
  let assets = 0;
  let liabilities = 0;

  for (const w of wallets) {
    if (w.type === 'credit_card') {
      liabilities += w.balance_paise; // Liability/outstanding on credit card
    } else {
      assets += w.balance_paise;
    }
  }

  return {
    totalAvailablePaise: assets - liabilities,
    totalAssetsPaise: assets,
    totalLiabilitiesPaise: liabilities,
  };
}

