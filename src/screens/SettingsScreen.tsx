import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getSetting, setSetting, AppSettings } from '../database/settingsRepo';
import { checkBiometricHardware } from '../services/securityService';
import { scheduleDailyReminder } from '../services/notificationService';
import { subscribeDataChanged } from '../utils/dataEvents';
import { useTheme } from '../theme/ThemeContext';
import { Card } from '../components/common/Card';
import {
  User,
  Wallet,
  Target,
  Repeat,
  Tag,
  Sparkles,
  Lock,
  Fingerprint,
  Bell,
  Download,
  Database,
  Trash2,
  ChevronRight,
  Sun,
  Moon,
  Shield,
  HelpCircle,
} from 'lucide-react-native';

export const SettingsScreen: React.FC = () => {
  const { colors, mode, setThemeMode, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricName, setBiometricName] = useState('Fingerprint');

  const loadSettings = async () => {
    try {
      const s = await getSetting<AppSettings>('full_settings', {
        profile_name: 'Personal Account',
        default_currency: 'INR',
        currency_symbol: '₹',
        theme_mode: 'system',
        biometric_enabled: false,
        pin_enabled: false,
        daily_reminder_enabled: true,
        daily_reminder_time: '20:30',
        budget_alerts_enabled: true,
        recurring_reminders_enabled: true,
        ai_provider: 'local',
        ai_api_key: '',
        last_backup_date: '',
      });
      setSettings(s);

      const bio = await checkBiometricHardware();
      setBiometricAvailable(bio.isAvailable);
      setBiometricName(bio.biometryType || 'Fingerprint');
    } catch (err) {
      console.warn('Error loading settings:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  useEffect(() => {
    const unsub = subscribeDataChanged(() => {
      loadSettings();
    });
    return unsub;
  }, []);

  const toggleThemeMode = () => {
    if (mode === 'system') setThemeMode('light');
    else if (mode === 'light') setThemeMode('dark');
    else setThemeMode('system');
  };

  const handleToggleBiometrics = async (enabled: boolean) => {
    if (!settings) return;

    if (enabled && !settings.pin_enabled) {
      Alert.alert(
        'PIN Setup Required',
        'Please establish a 4-digit PIN first. The PIN is required as a reliable fallback whenever biometric authentication cancels, fails, or is unavailable.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Setup PIN',
            onPress: () => navigation.navigate('AuthLockScreen', { mode: 'setup' }),
          },
        ]
      );
      return;
    }

    await setSetting('biometric_enabled', enabled);
    setSettings({ ...settings, biometric_enabled: enabled });
  };

  const handleToggleDailyReminder = async (enabled: boolean) => {
    if (!settings) return;
    await setSetting('daily_reminder_enabled', enabled);
    setSettings({ ...settings, daily_reminder_enabled: enabled });
    await scheduleDailyReminder(settings.daily_reminder_time);
  };

  const handleLockAppNow = () => {
    if (!settings?.pin_enabled && !settings?.biometric_enabled) {
      Alert.alert(
        'Lock Not Configured',
        'Please enable PIN lock first before locking the application.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Setup PIN',
            onPress: () => navigation.navigate('AuthLockScreen', { mode: 'setup' }),
          },
        ]
      );
      return;
    }

    navigation.navigate('AuthLockScreen', {
      mode: 'unlock',
      onUnlockSuccess: () => {
        // Unlocked cleanly
      },
      onCancel: () => {
        navigation.goBack();
      },
    });
  };

  const handleClearAllData = () => {
    Alert.alert(
      '⚠️ Reset & Wipe All Data',
      'This will irreversibly delete all transactions, budgets, custom wallets, and categories. Ensure you have made an external backup if you need your records.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Permanently Erase',
          style: 'destructive',
          onPress: async () => {
            navigation.navigate('ExportBackupModal');
          },
        },
      ]
    );
  };

  if (!settings) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 90 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <View style={[styles.avatarBox, { backgroundColor: colors.primary }]}>
            <User size={28} color="#FFFFFF" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>{settings.profile_name}</Text>
            <Text style={[styles.profileSub, { color: colors.textSecondary }]}>
              Default Currency: Indian Rupee (₹)
            </Text>
          </View>
        </Card>

        {/* Financial Tools Section */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>FINANCIAL HUBS</Text>
        <Card style={styles.menuCard}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('WalletsListModal')}
            style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#EEF2FF' }]}>
                <Wallet size={18} color="#4F46E5" />
              </View>
              <Text style={[styles.menuItemText, { color: colors.text }]}>Wallets & Transfers</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('GoalsListModal')}
            style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
                <Target size={18} color="#059669" />
              </View>
              <Text style={[styles.menuItemText, { color: colors.text }]}>Savings Goals</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('RecurringListModal')}
            style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
                <Repeat size={18} color="#D97706" />
              </View>
              <Text style={[styles.menuItemText, { color: colors.text }]}>Recurring Transactions</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('CategoryManagerModal')}
            style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#FDF2F8' }]}>
                <Tag size={18} color="#DB2777" />
              </View>
              <Text style={[styles.menuItemText, { color: colors.text }]}>Category Manager</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('AIAssistantModal')}
            style={styles.menuItem}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#F3E8FF' }]}>
                <Sparkles size={18} color="#9333EA" />
              </View>
              <View>
                <Text style={[styles.menuItemText, { color: colors.text }]}>AI Financial Assistant</Text>
                <Text style={[styles.menuItemSubText, { color: colors.textSecondary }]}>
                  Mode: {settings.ai_provider === 'local' ? 'Offline Local Intelligence' : settings.ai_provider.toUpperCase()}
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </Card>

        {/* Appearance & Security */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PREFERENCES & SECURITY</Text>
        <Card style={styles.menuCard}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={toggleThemeMode}
            style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconBox, { backgroundColor: colors.surfaceVariant }]}>
                {isDark ? <Moon size={18} color={colors.primary} /> : <Sun size={18} color="#F59E0B" />}
              </View>
              <View>
                <Text style={[styles.menuItemText, { color: colors.text }]}>Theme Appearance</Text>
                <Text style={[styles.menuItemSubText, { color: colors.textSecondary }]}>
                  {mode.toUpperCase()}
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('AuthLockScreen', { mode: 'setup' })}
            style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#FEF2F2' }]}>
                <Lock size={18} color="#EF4444" />
              </View>
              <View>
                <Text style={[styles.menuItemText, { color: colors.text }]}>PIN Lock Security</Text>
                <Text style={[styles.menuItemSubText, { color: colors.textSecondary }]}>
                  {settings.pin_enabled ? 'Enabled (Encrypted)' : 'Disabled'}
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          {biometricAvailable && (
            <View style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
                  <Fingerprint size={18} color="#3B82F6" />
                </View>
                <View>
                  <Text style={[styles.menuItemText, { color: colors.text }]}>
                    {biometricName} Unlock
                  </Text>
                  <Text style={[styles.menuItemSubText, { color: colors.textSecondary }]}>
                    Requires PIN fallback
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.biometric_enabled}
                onValueChange={handleToggleBiometrics}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
          )}

          {(settings.pin_enabled || settings.biometric_enabled) && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleLockAppNow}
              style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#F3E8FF' }]}>
                  <Shield size={18} color="#9333EA" />
                </View>
                <Text style={[styles.menuItemText, { color: colors.text }]}>Lock Application Now</Text>
              </View>
              <ChevronRight size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}

          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
                <Bell size={18} color="#10B981" />
              </View>
              <View>
                <Text style={[styles.menuItemText, { color: colors.text }]}>Daily Expense Reminder</Text>
                <Text style={[styles.menuItemSubText, { color: colors.textSecondary }]}>
                  At {settings.daily_reminder_time}
                </Text>
              </View>
            </View>
            <Switch
              value={settings.daily_reminder_enabled}
              onValueChange={handleToggleDailyReminder}
              trackColor={{ false: colors.border, true: colors.income }}
            />
          </View>
        </Card>

        {/* Data & Backup */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DATA PROTECTION & BACKUP</Text>
        <Card style={styles.menuCard}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ExportBackupModal')}
            style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
                <Database size={18} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuItemText, { color: colors.text }]}>Backup & Restore Hub</Text>
                <Text style={[styles.menuItemSubText, { color: colors.textSecondary }]}>
                  {settings.last_backup_date ? `Last: ${settings.last_backup_date.slice(0, 10)}` : 'Create & restore offline snapshots'}
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ExportBackupModal')}
            style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
                <Download size={18} color="#3B82F6" />
              </View>
              <Text style={[styles.menuItemText, { color: colors.text }]}>Export CSV & PDF Reports</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleClearAllData}
            style={styles.menuItem}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#FEF2F2' }]}>
                <Trash2 size={18} color="#EF4444" />
              </View>
              <Text style={[styles.menuItemText, { color: colors.expense, fontWeight: '700' }]}>
                Reset & Clear All Data
              </Text>
            </View>
            <ChevronRight size={18} color={colors.expense} />
          </TouchableOpacity>
        </Card>

        {/* About Info */}
        <View style={styles.aboutFooter}>
          <Text style={[styles.aboutText, { color: colors.textSecondary }]}>
            CashFlow • Personal Expense Tracker v1.1.0
          </Text>
          <Text style={[styles.aboutSubText, { color: colors.textMuted }]}>
            Offline-First • Local SQLite Encrypted Persistence
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 20,
    gap: 14,
  },
  avatarBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  profileSub: {
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuCard: {
    padding: 0,
    marginBottom: 20,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600',
  },
  menuItemSubText: {
    fontSize: 11,
    marginTop: 2,
  },
  aboutFooter: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  aboutText: {
    fontSize: 12,
    fontWeight: '600',
  },
  aboutSubText: {
    fontSize: 11,
    marginTop: 2,
  },
});
