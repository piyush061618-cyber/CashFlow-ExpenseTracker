import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDatabase } from './src/database/db';
import { getSetting } from './src/database/settingsRepo';
import { requestNotificationPermissions, scheduleDailyReminder } from './src/services/notificationService';
import { processDueRecurringTransactions } from './src/database/recurringRepo';
import { checkAndRunAutoBackup } from './src/services/backupService';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AuthLockScreen } from './src/screens/modals/AuthLockScreen';

function RootApp() {
  const { colors, isDark } = useTheme();
  const [isReady, setIsReady] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // 1. Initialize SQLite Database, tables, indexes, and seed default data
        await initDatabase();

        // 2. Request notifications and schedule daily reminder
        await requestNotificationPermissions();
        const reminderTime = await getSetting<string>('daily_reminder_time', '20:30');
        await scheduleDailyReminder(reminderTime);

        // 3. Process due recurring transactions idempotently
        await processDueRecurringTransactions();

        // 4. Run automatic backup check if scheduled
        await checkAndRunAutoBackup();

        // 5. Check if security PIN or biometric lock is active
        const pinEnabled = await getSetting<boolean>('pin_enabled', false);
        const biometricEnabled = await getSetting<boolean>('biometric_enabled', false);
        if (pinEnabled || biometricEnabled) {
          setIsLocked(true);
        }
      } catch (e) {
        console.warn('Initialization error:', e);
      } finally {
        setIsReady(true);
      }
    }

    prepare();
  }, []);

  // Listen to application lifecycle changes (background / foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        const pinEnabled = await getSetting<boolean>('pin_enabled', false);
        const biometricEnabled = await getSetting<boolean>('biometric_enabled', false);
        if (pinEnabled || biometricEnabled) {
          setIsLocked(true);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  if (!isReady) {
    return (
      <View style={[styles.splashContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
      {isLocked && (
        <View style={[styles.lockOverlay, { backgroundColor: colors.background }]}>
          <AuthLockScreen
            mode="unlock"
            onUnlockSuccess={() => setIsLocked(false)}
          />
        </View>
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    elevation: 99999,
  },
});
