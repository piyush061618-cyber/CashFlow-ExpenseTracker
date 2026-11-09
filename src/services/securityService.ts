import * as LocalAuthentication from 'expo-local-authentication';
import * as Crypto from 'expo-crypto';
import { getSetting, setSetting } from '../database/settingsRepo';

/**
 * Generates a random salt string
 */
function generateSalt(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Hashes a PIN using SHA-256 with salt to prevent plain-text exposure
 */
export async function hashPin(pin: string, salt: string): Promise<string> {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    salt + pin + salt
  );
}

/**
 * Sets a new 4 or 6-digit PIN securely
 */
export async function setAppPin(pin: string): Promise<void> {
  const salt = generateSalt();
  const hash = await hashPin(pin, salt);
  await setSetting('pin_salt', salt);
  await setSetting('pin_hash', hash);
  await setSetting('pin_enabled', true);
}

/**
 * Verifies user-entered PIN against stored salt and hash
 */
export async function verifyAppPin(pin: string): Promise<boolean> {
  const isEnabled = await getSetting<boolean>('pin_enabled', false);
  if (!isEnabled) return true;

  const salt = await getSetting<string>('pin_salt', '');
  const storedHash = await getSetting<string>('pin_hash', '');

  if (!salt || !storedHash) return false;

  const inputHash = await hashPin(pin, salt);
  return inputHash === storedHash;
}

/**
 * Disables the PIN lock
 */
export async function disableAppPin(): Promise<void> {
  await setSetting('pin_enabled', false);
  await setSetting('pin_hash', '');
  await setSetting('pin_salt', '');
}

/**
 * Checks if device hardware supports biometric authentication
 */
export async function checkBiometricHardware(): Promise<{
  isAvailable: boolean;
  hasHardware: boolean;
  isEnrolled: boolean;
  biometryType: string;
}> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

    let biometryType = 'None';
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometryType = 'Face Recognition';
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometryType = 'Fingerprint';
    }

    return {
      isAvailable: hasHardware && isEnrolled,
      hasHardware,
      isEnrolled,
      biometryType,
    };
  } catch {
    return {
      isAvailable: false,
      hasHardware: false,
      isEnrolled: false,
      biometryType: 'None',
    };
  }
}

/**
 * Prompts user for biometric authentication (Fingerprint / Face)
 */
export async function authenticateWithBiometrics(promptMessage = 'Unlock CashFlow'): Promise<boolean> {
  try {
    const status = await checkBiometricHardware();
    if (!status.isAvailable) return false;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Use PIN',
      cancelLabel: 'Cancel',
      disableDeviceFallback: true,
    });

    return result.success;
  } catch {
    return false;
  }
}

