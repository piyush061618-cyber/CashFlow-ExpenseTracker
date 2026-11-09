import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  setAppPin,
  verifyAppPin,
  disableAppPin,
  authenticateWithBiometrics,
  checkBiometricHardware,
} from '../../services/securityService';
import { getSetting } from '../../database/settingsRepo';
import { useTheme } from '../../theme/ThemeContext';
import { Header } from '../../components/common/Header';
import { Lock, Fingerprint, Delete, ShieldAlert } from 'lucide-react-native';

export interface AuthLockScreenProps {
  mode?: 'unlock' | 'setup';
  onUnlockSuccess?: () => void;
  onCancel?: () => void;
}

export const AuthLockScreen: React.FC<AuthLockScreenProps> = (props) => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  let route: any = null;
  try {
    route = useRoute<any>();
  } catch {
    // Rendered outside a screen route
  }

  const mode: 'unlock' | 'setup' = props.mode || route?.params?.mode || 'unlock';
  const onUnlockSuccess = props.onUnlockSuccess || route?.params?.onUnlockSuccess;
  const onCancel = props.onCancel || route?.params?.onCancel;

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [errorMsg, setErrorMsg] = useState('');
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometryType, setBiometryType] = useState('Biometrics');

  useEffect(() => {
    async function checkBio() {
      try {
        const bioEnabled = await getSetting<boolean>('biometric_enabled', false);
        const bioHw = await checkBiometricHardware();
        if (bioEnabled && bioHw.isAvailable) {
          setBiometricsAvailable(true);
          setBiometryType(bioHw.biometryType || 'Biometrics');
          if (mode === 'unlock') {
            // Auto-trigger biometrics on unlock prompt
            triggerBiometrics();
          }
        }
      } catch (err) {
        console.warn('Biometric initialization check failed:', err);
      }
    }
    checkBio();
  }, []);

  const triggerBiometrics = async () => {
    try {
      const success = await authenticateWithBiometrics('Unlock CashFlow');
      if (success) {
        if (onUnlockSuccess) {
          onUnlockSuccess();
        }
        if (navigation?.canGoBack && navigation.canGoBack()) {
          navigation.goBack();
        }
      }
    } catch (err) {
      console.warn('Biometric trigger error:', err);
    }
  };

  const handleKeyPress = async (num: string) => {
    if (pin.length >= 4) return;
    const nextPin = pin + num;
    setPin(nextPin);
    setErrorMsg('');

    if (nextPin.length === 4) {
      if (mode === 'unlock') {
        const isValid = await verifyAppPin(nextPin);
        if (isValid) {
          setPin('');
          if (onUnlockSuccess) {
            onUnlockSuccess();
          }
          if (navigation?.canGoBack && navigation.canGoBack()) {
            navigation.goBack();
          }
        } else {
          setErrorMsg('Incorrect PIN. Please try again.');
          setPin('');
        }
      } else {
        // Setup mode
        if (step === 'enter') {
          setConfirmPin(nextPin);
          setPin('');
          setStep('confirm');
        } else {
          // Confirm step
          if (nextPin === confirmPin) {
            await setAppPin(nextPin);
            Alert.alert('PIN Established', 'Your security PIN has been encrypted and enabled.', [
              {
                text: 'OK',
                onPress: () => {
                  if (navigation?.canGoBack && navigation.canGoBack()) {
                    navigation.goBack();
                  }
                },
              },
            ]);
          } else {
            setErrorMsg('PINs did not match. Please enter your PIN again.');
            setPin('');
            setConfirmPin('');
            setStep('enter');
          }
        }
      }
    }
  };

  const handleDeleteKey = () => {
    if (pin.length > 0) {
      setPin(pin.substring(0, pin.length - 1));
      setErrorMsg('');
    }
  };

  const handleDisablePin = async () => {
    Alert.alert(
      'Turn Off Security Lock',
      'Are you sure you want to disable PIN and biometric protection?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            await disableAppPin();
            Alert.alert('Lock Disabled', 'Security PIN and biometric protection have been turned off.', [
              {
                text: 'OK',
                onPress: () => {
                  if (navigation?.canGoBack && navigation.canGoBack()) {
                    navigation.goBack();
                  }
                },
              },
            ]);
          },
        },
      ]
    );
  };

  const handleHeaderBack = () => {
    if (onCancel) {
      onCancel();
    } else if (navigation?.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
      {mode === 'setup' ? (
        <Header
          title="Setup Security PIN"
          onBack={handleHeaderBack}
        />
      ) : onCancel ? (
        <Header
          title="Unlock CashFlow"
          onBack={handleHeaderBack}
        />
      ) : (
        <View style={styles.topSpacer} />
      )}

      <View style={styles.content}>
        <View style={[styles.lockIconBox, { backgroundColor: errorMsg ? '#FEE2E2' : colors.primaryLight }]}>
          {errorMsg ? (
            <ShieldAlert size={34} color={colors.expense} />
          ) : (
            <Lock size={34} color={colors.primary} />
          )}
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          {mode === 'setup'
            ? step === 'enter'
              ? 'Enter New 4-Digit PIN'
              : 'Confirm Your New PIN'
            : 'Enter PIN to Unlock'}
        </Text>

        {errorMsg ? (
          <Text style={[styles.errorText, { color: colors.expense }]}>{errorMsg}</Text>
        ) : (
          <Text style={[styles.subText, { color: colors.textSecondary }]}>
            {mode === 'setup'
              ? 'Choose a memorable 4-digit security code'
              : biometricsAvailable
              ? `Use your PIN or tap ${biometryType} below`
              : 'Protected by salted SHA-256 local encryption'}
          </Text>
        )}

        {/* PIN Dots */}
        <View style={styles.dotsRow}>
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <View
                key={idx}
                style={[
                  styles.dot,
                  {
                    backgroundColor: isFilled
                      ? errorMsg
                        ? colors.expense
                        : colors.primary
                      : colors.surfaceVariant,
                    borderColor: isFilled
                      ? errorMsg
                        ? colors.expense
                        : colors.primary
                      : colors.border,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Numeric Keypad */}
        <View style={styles.keypad}>
          {[
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            ['bio', '0', 'del'],
          ].map((row, rIdx) => (
            <View key={rIdx} style={styles.keypadRow}>
              {row.map((k) => {
                if (k === 'bio') {
                  return biometricsAvailable && mode === 'unlock' ? (
                    <TouchableOpacity
                      key={k}
                      activeOpacity={0.7}
                      onPress={triggerBiometrics}
                      style={[styles.keypadKey, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                    >
                      <Fingerprint size={28} color={colors.primary} />
                    </TouchableOpacity>
                  ) : (
                    <View key={k} style={styles.keypadKeyPlaceholder} />
                  );
                }
                if (k === 'del') {
                  return (
                    <TouchableOpacity
                      key={k}
                      activeOpacity={0.7}
                      onPress={handleDeleteKey}
                      style={[styles.keypadKey, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                    >
                      <Delete size={24} color={colors.text} />
                    </TouchableOpacity>
                  );
                }
                return (
                  <TouchableOpacity
                    key={k}
                    activeOpacity={0.7}
                    onPress={() => handleKeyPress(k)}
                    style={[styles.keypadKey, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <Text style={[styles.keypadNum, { color: colors.text }]}>{k}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {mode === 'setup' && (
          <TouchableOpacity onPress={handleDisablePin} style={styles.disableBtn}>
            <Text style={[styles.disableText, { color: colors.expense }]}>Turn Off PIN Lock</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topSpacer: {
    height: 30,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  lockIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  subText: {
    fontSize: 13,
    marginBottom: 28,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 28,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 18,
    marginBottom: 36,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  keypad: {
    width: '100%',
    maxWidth: 290,
    gap: 16,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  keypadKey: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  keypadKeyPlaceholder: {
    width: 72,
    height: 72,
  },
  keypadNum: {
    fontSize: 26,
    fontWeight: '700',
  },
  disableBtn: {
    marginTop: 28,
    padding: 10,
  },
  disableText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
