import {
  deriveKeyFromPassword,
  encryptPayloadAES,
  decryptPayloadAES,
  BackupManifest,
} from '../services/backupService';
import * as Crypto from 'expo-crypto';

describe('Backup AES-256-GCM Encryption & Data Protection Tests', () => {
  const sampleData = JSON.stringify({
    appName: 'CashFlow',
    version: 2,
    wallets: [{ id: 'w1', name: 'Main Account', balance_paise: 2500000 }],
    transactions: [
      { id: 'tx1', amount_paise: 2000000, type: 'income', description: 'Salary' },
      { id: 'tx2', amount_paise: 800000, type: 'expense', description: 'Groceries' },
    ],
    receiptImages: {
      'file:///receipts/rec_1.jpg': 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    },
  });

  test('Derives consistent 256-bit key from password and salt', async () => {
    const salt = 'a1b2c3d4e5f67890';
    const key1 = await deriveKeyFromPassword('SecretPass123!', salt);
    const key2 = await deriveKeyFromPassword('SecretPass123!', salt);
    const key3 = await deriveKeyFromPassword('DifferentPassword', salt);

    expect(key1).toBe(key2);
    expect(key1.length).toBe(64); // 64 hex characters = 32 bytes = 256 bits
    expect(key1).not.toBe(key3);
  });

  test('Successfully encrypts and decrypts payload with correct password', async () => {
    const password = 'MySecureFinancialPassword#2026';
    const { encryptedBase64, salt } = await encryptPayloadAES(sampleData, password);

    expect(encryptedBase64).toBeDefined();
    expect(encryptedBase64.length).toBeGreaterThan(0);
    expect(encryptedBase64).not.toBe(sampleData);

    const decrypted = await decryptPayloadAES(encryptedBase64, password, salt);
    expect(decrypted).toBe(sampleData);

    const parsed = JSON.parse(decrypted);
    expect(parsed.transactions.length).toBe(2);
    expect(parsed.transactions[0].description).toBe('Salary');
    expect(parsed.receiptImages['file:///receipts/rec_1.jpg']).toBeDefined();
  });

  test('Fails decryption when incorrect password is provided', async () => {
    const password = 'CorrectPassword123';
    const { encryptedBase64, salt } = await encryptPayloadAES(sampleData, password);

    await expect(
      decryptPayloadAES(encryptedBase64, 'WrongPassword456', salt)
    ).rejects.toThrow('Incorrect password');
  });

  test('Detects tampered ciphertext and rejects restoration', async () => {
    const password = 'PasswordTamperCheck';
    const { encryptedBase64, salt } = await encryptPayloadAES(sampleData, password);

    // Tamper with the middle of the base64 ciphertext
    const tamperedBase64 =
      encryptedBase64.substring(0, 20) + 'XXXX' + encryptedBase64.substring(24);

    await expect(
      decryptPayloadAES(tamperedBase64, password, salt)
    ).rejects.toThrow();
  });

  test('Validates SHA-256 checksum integrity of payload', async () => {
    const checksum = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      sampleData
    );
    expect(checksum).toBeDefined();
    expect(checksum.length).toBe(64);

    const computedChecksum = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      sampleData
    );
    expect(computedChecksum).toBe(checksum);
  });
});

