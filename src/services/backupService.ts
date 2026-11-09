import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getDB } from '../database/db';
import { nowISO } from '../utils/date';
import { getSetting, setSetting } from '../database/settingsRepo';

declare const Buffer: any;

export interface BackupRecordCounts {
  transactions: number;
  wallets: number;
  categories: number;
  transfers: number;
  budgets: number;
  savings_goals: number;
  recurring_transactions: number;
  receipt_images: number;
}

export interface BackupDataPayload {
  wallets: any[];
  categories: any[];
  transactions: any[];
  transfers: any[];
  budgets: any[];
  savings_goals: any[];
  recurring_transactions: any[];
  app_settings: any[];
  receiptImages: Record<string, string>; // receipt_uri -> base64 string
}

export interface BackupManifest {
  appName: 'CashFlow';
  version: 1 | 2;
  createdAt: string;
  isEncrypted: boolean;
  encryptionSalt?: string;
  checksum: string;
  recordCounts: BackupRecordCounts;
  payload: string; // Plain JSON string or Base64 AES-GCM sealed string
}

export interface BackupHistoryItem {
  filename: string;
  uri: string;
  createdAt: string;
  sizeBytes: number;
  isEncrypted: boolean;
  version: number;
  recordCounts?: BackupRecordCounts;
}

const BACKUPS_DIR = `${FileSystem.documentDirectory}backups/`;
const RECEIPTS_DIR = `${FileSystem.documentDirectory}receipts/`;

/**
 * Ensures the backup and receipts directories exist
 */
async function ensureDirs() {
  const bInfo = await FileSystem.getInfoAsync(BACKUPS_DIR);
  if (!bInfo.exists) {
    await FileSystem.makeDirectoryAsync(BACKUPS_DIR, { intermediates: true });
  }
  const rInfo = await FileSystem.getInfoAsync(RECEIPTS_DIR);
  if (!rInfo.exists) {
    await FileSystem.makeDirectoryAsync(RECEIPTS_DIR, { intermediates: true });
  }
}

/**
 * Derives a 256-bit (32-byte) hex key from password and salt using repeated SHA-256 rounds
 */
export async function deriveKeyFromPassword(password: string, salt: string): Promise<string> {
  let hash = salt + password + salt;
  for (let i = 0; i < 1000; i++) {
    hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, hash);
  }
  return hash;
}

/**
 * Encrypts data using AES-256-GCM.
 * Supports both native Expo Crypto and Node.js crypto fallback for Jest tests.
 */
export async function encryptPayloadAES(plainText: string, password: string): Promise<{
  encryptedBase64: string;
  salt: string;
}> {
  // Generate 16-byte random salt
  const saltBytes = await Crypto.getRandomBytesAsync(16);
  const salt = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const keyHex = await deriveKeyFromPassword(password, salt);

  try {
    // Attempt native Expo Crypto AES-GCM
    if ((Crypto as any).AESEncryptionKey && (Crypto as any).aesEncryptAsync) {
      const key = await (Crypto as any).AESEncryptionKey.import(keyHex, 'hex');
      const sealed = await (Crypto as any).aesEncryptAsync(plainText, key);
      const combined = await sealed.combined('base64');
      return { encryptedBase64: combined, salt };
    }
  } catch {
    // Fall back to Node crypto if available (useful in Jest environments)
  }

  // Node.js crypto fallback for testing environments
  try {
    const nodeCrypto = require('crypto');
    const key = Buffer.from(keyHex, 'hex');
    const iv = nodeCrypto.randomBytes(12);
    const cipher = nodeCrypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(plainText, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const tag = cipher.getAuthTag();
    const combined = Buffer.concat([iv, encrypted, tag]).toString('base64');
    return { encryptedBase64: combined, salt };
  } catch (err: any) {
    throw new Error('Encryption engine unavailable: ' + err.message);
  }
}

/**
 * Decrypts data using AES-256-GCM.
 */
export async function decryptPayloadAES(encryptedBase64: string, password: string, salt: string): Promise<string> {
  const keyHex = await deriveKeyFromPassword(password, salt);

  try {
    if ((Crypto as any).AESEncryptionKey && (Crypto as any).AESSealedData && (Crypto as any).aesDecryptAsync) {
      const key = await Crypto.AESEncryptionKey.import(keyHex, 'hex');
      const sealed = Crypto.AESSealedData.fromCombined(encryptedBase64);
      const decrypted = await (Crypto as any).aesDecryptAsync(sealed, key, { output: 'string' });
      return typeof decrypted === 'string' ? decrypted : new TextDecoder().decode(decrypted);
    }
  } catch {
    // Fall back to Node crypto
  }

  // Node.js crypto fallback for testing environments
  try {
    const nodeCrypto = require('crypto');
    const key = Buffer.from(keyHex, 'hex');
    const combinedBuf = Buffer.from(encryptedBase64, 'base64');
    const iv = combinedBuf.subarray(0, 12);
    const tag = combinedBuf.subarray(combinedBuf.length - 16);
    const ciphertext = combinedBuf.subarray(12, combinedBuf.length - 16);

    const decipher = nodeCrypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(ciphertext, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    throw new Error('Incorrect password or corrupted backup file.');
  }
}

/**
 * Creates a complete database snapshot, bundles receipts as base64, and optionally encrypts with password.
 */
export async function createBackupArchive(options?: {
  password?: string;
  notes?: string;
}): Promise<{ manifest: BackupManifest; filePath: string; fileName: string; fileSize: number }> {
  await ensureDirs();
  const db = await getDB();

  // 1. Fetch all SQLite table records
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

  // 2. Read and bundle receipt images as Base64 strings
  const receiptImages: Record<string, string> = {};
  for (const t of transactions as any[]) {
    if (t.receipt_uri && typeof t.receipt_uri === 'string') {
      try {
        const fileInfo = await FileSystem.getInfoAsync(t.receipt_uri);
        if (fileInfo.exists) {
          const b64 = await FileSystem.readAsStringAsync(t.receipt_uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          receiptImages[t.receipt_uri] = b64;
        }
      } catch (err) {
        console.warn('Could not read receipt image for backup:', t.receipt_uri, err);
      }
    }
  }

  const payloadData: BackupDataPayload = {
    wallets,
    categories,
    transactions,
    transfers,
    budgets,
    savings_goals,
    recurring_transactions,
    app_settings,
    receiptImages,
  };

  const payloadString = JSON.stringify(payloadData);
  const checksum = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, payloadString);

  const recordCounts: BackupRecordCounts = {
    transactions: transactions.length,
    wallets: wallets.length,
    categories: categories.length,
    transfers: transfers.length,
    budgets: budgets.length,
    savings_goals: savings_goals.length,
    recurring_transactions: recurring_transactions.length,
    receipt_images: Object.keys(receiptImages).length,
  };

  let manifest: BackupManifest;

  if (options?.password && options.password.trim().length > 0) {
    const { encryptedBase64, salt } = await encryptPayloadAES(payloadString, options.password.trim());
    manifest = {
      appName: 'CashFlow',
      version: 2,
      createdAt: nowISO(),
      isEncrypted: true,
      encryptionSalt: salt,
      checksum,
      recordCounts,
      payload: encryptedBase64,
    };
  } else {
    manifest = {
      appName: 'CashFlow',
      version: 2,
      createdAt: nowISO(),
      isEncrypted: false,
      checksum,
      recordCounts,
      payload: payloadString,
    };
  }

  const manifestJson = JSON.stringify(manifest, null, 2);
  const timestampStr = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const fileName = `CashFlow_Backup_${timestampStr}${manifest.isEncrypted ? '_enc' : ''}.json`;
  const filePath = `${BACKUPS_DIR}${fileName}`;

  await FileSystem.writeAsStringAsync(filePath, manifestJson, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const fileInfo = await FileSystem.getInfoAsync(filePath);
  const fileSize = fileInfo.exists ? fileInfo.size : manifestJson.length;

  // Update last backup settings
  await setSetting('last_backup_date', manifest.createdAt);
  await setSetting('last_backup_size', fileSize);
  await setSetting('last_backup_name', fileName);

  return { manifest, filePath, fileName, fileSize };
}

/**
 * Exports a backup file to external storage or cloud (Downloads / Google Drive / Email) via sharing dialog
 */
export async function exportBackupToExternal(filePath: string): Promise<boolean> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('File sharing is not supported on this device.');
  }

  await Sharing.shareAsync(filePath, {
    mimeType: 'application/json',
    dialogTitle: 'Save CashFlow Database Backup',
    UTI: 'public.json',
  });
  return true;
}

/**
 * Lists all existing local backups in the history folder
 */
export async function listLocalBackups(): Promise<BackupHistoryItem[]> {
  await ensureDirs();
  const dirFiles = await FileSystem.readDirectoryAsync(BACKUPS_DIR);
  const items: BackupHistoryItem[] = [];

  for (const name of dirFiles) {
    if (!name.endsWith('.json') && !name.endsWith('.cashflow')) continue;

    const uri = `${BACKUPS_DIR}${name}`;
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists) {
        // Read manifest header for preview
        const content = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        const parsed = JSON.parse(content);
        if (parsed.appName === 'CashFlow') {
          items.push({
            filename: name,
            uri,
            createdAt: parsed.createdAt || info.modificationTime || nowISO(),
            sizeBytes: info.size,
            isEncrypted: !!parsed.isEncrypted,
            version: parsed.version || 1,
            recordCounts: parsed.recordCounts,
          });
        }
      }
    } catch {
      // Ignore corrupted entries
    }
  }

  // Sort newest first
  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Deletes a local backup file
 */
export async function deleteLocalBackup(filename: string): Promise<boolean> {
  const uri = `${BACKUPS_DIR}${filename}`;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates a backup string or file URI, decrypts if necessary, and returns preview details
 */
export async function validateBackupPayload(
  contentOrUri: string,
  password?: string
): Promise<{
  isValid: boolean;
  isEncrypted: boolean;
  manifest: BackupManifest | null;
  payloadData: BackupDataPayload | null;
  error?: string;
}> {
  let jsonString = contentOrUri;

  // If a file URI was provided, read its content
  if (contentOrUri.startsWith('file://') || contentOrUri.startsWith('/')) {
    try {
      jsonString = await FileSystem.readAsStringAsync(contentOrUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    } catch (err: any) {
      return {
        isValid: false,
        isEncrypted: false,
        manifest: null,
        payloadData: null,
        error: `Could not read backup file: ${err.message}`,
      };
    }
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return {
      isValid: false,
      isEncrypted: false,
      manifest: null,
      payloadData: null,
      error: 'Invalid JSON file format. Please select a valid CashFlow backup file.',
    };
  }

  if (!parsed || parsed.appName !== 'CashFlow') {
    return {
      isValid: false,
      isEncrypted: false,
      manifest: null,
      payloadData: null,
      error: 'Unrecognized backup structure. This file does not appear to be a CashFlow backup.',
    };
  }

  // Check version 1 (legacy unencrypted) vs version 2
  if (parsed.version === 1 && parsed.data) {
    return {
      isValid: true,
      isEncrypted: false,
      manifest: {
        appName: 'CashFlow',
        version: 1,
        createdAt: parsed.exportedAt || nowISO(),
        isEncrypted: false,
        checksum: '',
        recordCounts: {
          transactions: parsed.data.transactions?.length || 0,
          wallets: parsed.data.wallets?.length || 0,
          categories: parsed.data.categories?.length || 0,
          transfers: parsed.data.transfers?.length || 0,
          budgets: parsed.data.budgets?.length || 0,
          savings_goals: parsed.data.savings_goals?.length || 0,
          recurring_transactions: parsed.data.recurring_transactions?.length || 0,
          receipt_images: 0,
        },
        payload: '',
      },
      payloadData: {
        ...parsed.data,
        receiptImages: {},
      },
    };
  }

  // Version 2 format
  const manifest = parsed as BackupManifest;

  if (manifest.isEncrypted) {
    if (!password || password.trim().length === 0) {
      return {
        isValid: false,
        isEncrypted: true,
        manifest,
        payloadData: null,
        error: 'PASSWORD_REQUIRED',
      };
    }

    try {
      const decryptedJson = await decryptPayloadAES(
        manifest.payload,
        password.trim(),
        manifest.encryptionSalt || ''
      );
      const payloadData: BackupDataPayload = JSON.parse(decryptedJson);

      // Verify checksum
      const computedChecksum = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        decryptedJson
      );
      if (manifest.checksum && manifest.checksum !== computedChecksum) {
        return {
          isValid: false,
          isEncrypted: true,
          manifest,
          payloadData: null,
          error: 'Integrity check failed: Checksum does not match. File may be corrupted.',
        };
      }

      return {
        isValid: true,
        isEncrypted: true,
        manifest,
        payloadData,
      };
    } catch (err: any) {
      return {
        isValid: false,
        isEncrypted: true,
        manifest,
        payloadData: null,
        error: err.message || 'Incorrect password.',
      };
    }
  }

  // Version 2 unencrypted
  try {
    const payloadData: BackupDataPayload = JSON.parse(manifest.payload);
    return {
      isValid: true,
      isEncrypted: false,
      manifest,
      payloadData,
    };
  } catch {
    return {
      isValid: false,
      isEncrypted: false,
      manifest,
      payloadData: null,
      error: 'Corrupted payload structure in backup file.',
    };
  }
}

/**
 * Safely restores the database from validated payload data with an atomic transaction and safety rollback
 */
export async function restoreFromValidatedPayload(
  payloadData: BackupDataPayload
): Promise<{ success: boolean; message: string; recordCounts?: BackupRecordCounts }> {
  await ensureDirs();
  const db = await getDB();

  // Step 1: Create a temporary safety snapshot of current data before replacement
  let safetySnapshot: BackupDataPayload | null = null;
  try {
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
    safetySnapshot = {
      wallets,
      categories,
      transactions,
      transfers,
      budgets,
      savings_goals,
      recurring_transactions,
      app_settings,
      receiptImages: {},
    };
  } catch {
    // Safety snapshot failed, proceed carefully
  }

  // Step 2: Restore receipt images from Base64 back to local device storage
  const restoredReceiptUriMap: Record<string, string> = {};
  if (payloadData.receiptImages && typeof payloadData.receiptImages === 'object') {
    for (const [origUri, b64Data] of Object.entries(payloadData.receiptImages)) {
      try {
        const ext = origUri.endsWith('.png') ? 'png' : 'jpg';
        const newFileName = `rec_${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;
        const newUri = `${RECEIPTS_DIR}${newFileName}`;
        await FileSystem.writeAsStringAsync(newUri, b64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        restoredReceiptUriMap[origUri] = newUri;
      } catch (err) {
        console.warn('Could not restore receipt image:', origUri, err);
      }
    }
  }

  // Step 3: Atomic database transaction
  try {
    await db.withTransactionAsync(async () => {
      await db.execAsync('PRAGMA foreign_keys = OFF;');

      // Clear existing records
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

      // 1. Categories
      if (Array.isArray(payloadData.categories)) {
        for (const c of payloadData.categories) {
          await db.runAsync(
            'INSERT INTO categories (id, name, type, icon, color, is_custom, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [c.id, c.name, c.type, c.icon, c.color, c.is_custom ? 1 : 0, c.created_at || nowISO()]
          );
        }
      }

      // 2. Wallets
      if (Array.isArray(payloadData.wallets)) {
        for (const w of payloadData.wallets) {
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
              w.is_default ? 1 : 0,
              w.created_at || nowISO(),
              w.updated_at || nowISO(),
            ]
          );
        }
      }

      // 3. Transactions (with updated receipt URIs)
      if (Array.isArray(payloadData.transactions)) {
        for (const t of payloadData.transactions) {
          const finalReceiptUri = t.receipt_uri ? (restoredReceiptUriMap[t.receipt_uri] || t.receipt_uri) : null;
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
              finalReceiptUri,
              t.created_at || nowISO(),
              t.updated_at || nowISO(),
            ]
          );
        }
      }

      // 4. Transfers
      if (Array.isArray(payloadData.transfers)) {
        for (const tr of payloadData.transfers) {
          await db.runAsync(
            'INSERT INTO transfers (id, from_wallet_id, to_wallet_id, amount_paise, date, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [tr.id, tr.from_wallet_id, tr.to_wallet_id, tr.amount_paise, tr.date, tr.notes || '', tr.created_at || nowISO()]
          );
        }
      }

      // 5. Budgets
      if (Array.isArray(payloadData.budgets)) {
        for (const b of payloadData.budgets) {
          await db.runAsync(
            'INSERT INTO budgets (id, category_id, amount_paise, period, period_key, notify_75, notify_90, notify_100, notified_threshold, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              b.id,
              b.category_id || null,
              b.amount_paise,
              b.period,
              b.period_key,
              b.notify_75 !== undefined ? b.notify_75 : 1,
              b.notify_90 !== undefined ? b.notify_90 : 1,
              b.notify_100 !== undefined ? b.notify_100 : 1,
              b.notified_threshold || 0,
              b.created_at || nowISO(),
            ]
          );
        }
      }

      // 6. Savings Goals
      if (Array.isArray(payloadData.savings_goals)) {
        for (const g of payloadData.savings_goals) {
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
              g.is_completed ? 1 : 0,
              g.created_at || nowISO(),
            ]
          );
        }
      }

      // 7. Recurring Transactions
      if (Array.isArray(payloadData.recurring_transactions)) {
        for (const r of payloadData.recurring_transactions) {
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

      // 8. Settings (preserve security settings if not specified)
      if (Array.isArray(payloadData.app_settings)) {
        for (const s of payloadData.app_settings) {
          // Do not overwrite device PIN/biometric settings from someone else's backup
          if (s.key === 'pin_hash' || s.key === 'pin_salt' || s.key === 'pin_enabled' || s.key === 'biometric_enabled') {
            continue;
          }
          await db.runAsync(
            'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
            [s.key, s.value]
          );
        }
      }

      await db.execAsync('PRAGMA foreign_keys = ON;');
    });

    const recordCounts: BackupRecordCounts = {
      transactions: payloadData.transactions?.length || 0,
      wallets: payloadData.wallets?.length || 0,
      categories: payloadData.categories?.length || 0,
      transfers: payloadData.transfers?.length || 0,
      budgets: payloadData.budgets?.length || 0,
      savings_goals: payloadData.savings_goals?.length || 0,
      recurring_transactions: payloadData.recurring_transactions?.length || 0,
      receipt_images: Object.keys(restoredReceiptUriMap).length,
    };

    return {
      success: true,
      message: 'All records and receipts restored successfully!',
      recordCounts,
    };
  } catch (err: any) {
    // Attempt rollback from safety snapshot
    if (safetySnapshot) {
      try {
        await restoreFromValidatedPayload(safetySnapshot);
      } catch {
        // Rollback attempt
      }
    }

    return {
      success: false,
      message: `Database restoration encountered an error: ${err.message || 'Unknown database fault'}. Existing data was preserved.`,
    };
  }
}

/**
 * Checks and automatically creates a scheduled backup if due
 */
export async function checkAndRunAutoBackup(): Promise<void> {
  try {
    const frequency = await getSetting<string>('auto_backup_frequency', 'manual');
    if (frequency === 'manual' || frequency === 'none') return;

    const lastBackup = await getSetting<string>('last_backup_date', '');
    if (!lastBackup) {
      await createBackupArchive();
      return;
    }

    const lastDate = new Date(lastBackup).getTime();
    const now = Date.now();
    const diffHours = (now - lastDate) / (1000 * 60 * 60);

    let isDue = false;
    if (frequency === 'daily' && diffHours >= 24) isDue = true;
    if (frequency === 'weekly' && diffHours >= 168) isDue = true;
    if (frequency === 'monthly' && diffHours >= 720) isDue = true;

    if (isDue) {
      await createBackupArchive();
    }
  } catch (err) {
    console.warn('Auto-backup check failed:', err);
  }
}
