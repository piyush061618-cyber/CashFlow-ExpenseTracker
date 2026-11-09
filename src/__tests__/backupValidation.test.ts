import { BackupData } from '../database/backupRepo';

describe('Backup Payload Structure and Validation Tests', () => {
  function validateBackupPayload(jsonString: string): { isValid: boolean; error?: string } {
    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      return { isValid: false, error: 'Invalid JSON format in backup file.' };
    }

    if (!parsed || parsed.appName !== 'CashFlow' || !parsed.version || !parsed.data) {
      return {
        isValid: false,
        error: 'Unrecognized backup structure. Ensure this is a CashFlow backup.',
      };
    }

    const { data } = parsed;
    if (
      !Array.isArray(data.wallets) ||
      !Array.isArray(data.transactions) ||
      !Array.isArray(data.categories)
    ) {
      return { isValid: false, error: 'Missing critical tables in backup payload.' };
    }

    return { isValid: true };
  }

  test('Rejects malformed non-JSON string', () => {
    const res = validateBackupPayload('Not JSON {');
    expect(res.isValid).toBe(false);
    expect(res.error).toBe('Invalid JSON format in backup file.');
  });

  test('Rejects JSON from other applications or without CashFlow signature', () => {
    const foreign = JSON.stringify({ appName: 'OtherApp', version: 1, data: {} });
    const res = validateBackupPayload(foreign);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('Unrecognized backup structure');
  });

  test('Rejects payload with missing critical tables', () => {
    const incomplete = JSON.stringify({
      appName: 'CashFlow',
      version: 1,
      data: { wallets: [] }, // missing transactions and categories
    });
    const res = validateBackupPayload(incomplete);
    expect(res.isValid).toBe(false);
    expect(res.error).toBe('Missing critical tables in backup payload.');
  });

  test('Accepts valid versioned CashFlow backup payload', () => {
    const valid: BackupData = {
      version: 1,
      appName: 'CashFlow',
      exportedAt: new Date().toISOString(),
      data: {
        wallets: [{ id: 'w1', name: 'Cash', balance_paise: 10000 }],
        categories: [{ id: 'c1', name: 'Food', type: 'expense' }],
        transactions: [{ id: 'tx1', amount_paise: 5000, type: 'expense' }],
        transfers: [],
        budgets: [],
        savings_goals: [],
        recurring_transactions: [],
        app_settings: [],
      },
    };
    const res = validateBackupPayload(JSON.stringify(valid));
    expect(res.isValid).toBe(true);
    expect(res.error).toBeUndefined();
  });
});

