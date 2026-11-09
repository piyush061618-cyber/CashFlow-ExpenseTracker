import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getDB } from '../database/db';
import { getSetting } from '../database/settingsRepo';
import { nowISO } from '../utils/date';
import { formatINR } from '../utils/currency';

// Configure notification presentation behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Requests Android notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('cashflow_alerts', {
        name: 'CashFlow Financial Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
      });
    }

    return finalStatus === 'granted';
  } catch {
    return false;
  }
}

/**
 * Logs a notification to the in-app history table
 */
async function recordNotification(
  title: string,
  body: string,
  type: 'daily_reminder' | 'budget_warning' | 'recurring_due' | 'goal_reminder' | 'weekly_summary'
) {
  try {
    const db = await getDB();
    const id = 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    await db.runAsync(
      'INSERT INTO notification_history (id, title, body, type, triggered_at, is_read) VALUES (?, ?, ?, ?, ?, 0)',
      [id, title, body, type, nowISO()]
    );
  } catch (e) {
    console.warn('Failed to record notification in database:', e);
  }
}

/**
 * Schedules daily reminder to log expenses
 */
export async function scheduleDailyReminder(timeString: string = '20:30'): Promise<void> {
  const isEnabled = await getSetting<boolean>('daily_reminder_enabled', true);
  if (!isEnabled) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return;
  }

  const [hourStr, minuteStr] = timeString.split(':');
  const hour = parseInt(hourStr, 10) || 20;
  const minute = parseInt(minuteStr, 10) || 30;

  // Cancel previous daily reminders
  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Daily Expense Check-in 📝',
      body: 'Did you spend or earn anything today? Record your transactions to keep your budget on track!',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

/**
 * Checks and triggers budget warnings at 75%, 90%, and 100% thresholds
 * Enforces deduplication using notified_threshold
 */
export async function checkBudgetThresholdAlert(
  budgetId: string,
  categoryName: string,
  spentPaise: number,
  limitPaise: number,
  notifiedThreshold: number,
  onThresholdUpdate: (threshold: number) => Promise<void>
): Promise<void> {
  const alertsEnabled = await getSetting<boolean>('budget_alerts_enabled', true);
  if (!alertsEnabled || limitPaise <= 0) return;

  const percentage = (spentPaise / limitPaise) * 100;

  let newThreshold = 0;
  let title = '';
  let body = '';

  if (percentage >= 100 && notifiedThreshold < 100) {
    newThreshold = 100;
    title = `🚨 Budget Exceeded: ${categoryName}`;
    body = `You have spent ${formatINR(spentPaise)}, exceeding your budget of ${formatINR(limitPaise)}!`;
  } else if (percentage >= 90 && notifiedThreshold < 90) {
    newThreshold = 90;
    title = `⚠️ Budget Alert (90%): ${categoryName}`;
    body = `You have consumed 90% of your ${categoryName} budget (${formatINR(spentPaise)} of ${formatINR(limitPaise)}).`;
  } else if (percentage >= 75 && notifiedThreshold < 75) {
    newThreshold = 75;
    title = `📊 Budget Alert (75%): ${categoryName}`;
    body = `You have used 75% of your ${categoryName} budget. Remaining: ${formatINR(limitPaise - spentPaise)}.`;
  }

  if (newThreshold > 0) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: null, // Send immediately
    });

    await recordNotification(title, body, 'budget_warning');
    await onThresholdUpdate(newThreshold);
  }
}

/**
 * Sends notification when a recurring transaction is processed
 */
export async function sendRecurringTransactionAlert(
  description: string,
  amountPaise: number,
  type: 'income' | 'expense'
): Promise<void> {
  const enabled = await getSetting<boolean>('recurring_reminders_enabled', true);
  if (!enabled) return;

  const title = type === 'income' ? 'Recurring Income Processed 💰' : 'Recurring Bill Auto-Logged 🧾';
  const body = `${description}: ${formatINR(amountPaise)} recorded.`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: null,
  });

  await recordNotification(title, body, 'recurring_due');
}

