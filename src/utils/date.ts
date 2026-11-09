// Date & Period Utility Functions (Offline-friendly, leap-year and boundary aware)
import {
  format,
  parseISO,
  isToday,
  isYesterday,
  startOfWeek as dfStartOfWeek,
  endOfWeek as dfEndOfWeek,
  startOfMonth as dfStartOfMonth,
  endOfMonth as dfEndOfMonth,
  startOfYear as dfStartOfYear,
  endOfYear as dfEndOfYear,
  subDays,
  addDays,
  addWeeks,
  addMonths,
  addYears,
} from 'date-fns';
import { RecurringFrequency } from '../types';

export { subDays };

/**
 * Returns current timestamp in standardized local ISO string format (YYYY-MM-DDTHH:mm:ss.SSS)
 * Consistent for lexicographic sorting in SQLite across timezones.
 */
export function nowISO(): string {
  return format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSS");
}

/**
 * Formats ISO string into standard readable date: "09 Nov 2026"
 */
export function formatDate(isoString: string): string {
  try {
    const d = typeof isoString === 'string' ? parseISO(isoString) : new Date(isoString);
    return format(d, 'dd MMM yyyy');
  } catch {
    return isoString;
  }
}

export const formatDisplayDate = formatDate;

/**
 * Formats ISO string with time: "09 Nov 2026, 03:30 PM"
 */
export function formatDateTime(isoString: string): string {
  try {
    const d = typeof isoString === 'string' ? parseISO(isoString) : new Date(isoString);
    return format(d, 'dd MMM yyyy, hh:mm a');
  } catch {
    return isoString;
  }
}

/**
 * Formats time only: "03:30 PM"
 */
export function formatTime(isoString: string): string {
  try {
    const d = typeof isoString === 'string' ? parseISO(isoString) : new Date(isoString);
    return format(d, 'hh:mm a');
  } catch {
    return '';
  }
}

/**
 * Returns relative group header: "Today", "Yesterday", or "dd MMMM yyyy"
 */
export function getDateGroupHeader(isoString: string): string {
  try {
    const d = typeof isoString === 'string' ? parseISO(isoString) : new Date(isoString);
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'dd MMMM yyyy');
  } catch {
    return 'Unknown Date';
  }
}

/**
 * Returns start of day ISO string
 */
export function getStartOfDay(d: Date = new Date()): string {
  return format(d, "yyyy-MM-dd'T'00:00:00.000");
}

/**
 * Returns end of day ISO string
 */
export function getEndOfDay(d: Date = new Date()): string {
  return format(d, "yyyy-MM-dd'T'23:59:59.999");
}

/**
 * Week starts strictly on Monday and ends on Sunday as required by accounting rules
 */
export function getWeekRange(date: Date = new Date()): { start: string; end: string } {
  const start = dfStartOfWeek(date, { weekStartsOn: 1 });
  const end = dfEndOfWeek(date, { weekStartsOn: 1 });
  return {
    start: getStartOfDay(start),
    end: getEndOfDay(end),
  };
}

/**
 * Returns month range (accounting for 28/29/30/31 days and leap years)
 */
export function getMonthRange(date: Date = new Date()): { start: string; end: string } {
  const start = dfStartOfMonth(date);
  const end = dfEndOfMonth(date);
  return {
    start: getStartOfDay(start),
    end: getEndOfDay(end),
  };
}

/**
 * Returns year range
 */
export function getYearRange(date: Date = new Date()): { start: string; end: string } {
  const start = dfStartOfYear(date);
  const end = dfEndOfYear(date);
  return {
    start: getStartOfDay(start),
    end: getEndOfDay(end),
  };
}

/**
 * Returns Period Key for monthly budgets e.g. "2026-11"
 */
export function getMonthKey(date: Date = new Date()): string {
  return format(date, 'yyyy-MM');
}

/**
 * Returns Period Key for weekly budgets e.g. "2026-W45"
 */
export function getWeekKey(date: Date = new Date()): string {
  return format(date, 'yyyy-II');
}

/**
 * Returns array of last 7 days including today (for weekly bar chart)
 */
export function getLast7Days(): { label: string; dateStr: string; start: string; end: string }[] {
  const days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = subDays(today, i);
    days.push({
      label: format(d, 'EEE'), // Mon, Tue...
      dateStr: format(d, 'yyyy-MM-dd'),
      start: getStartOfDay(d),
      end: getEndOfDay(d),
    });
  }
  return days;
}

/**
 * Returns array of months for the current year (for yearly trends)
 */
export function getMonthsOfYear(year: number = new Date().getFullYear()): { label: string; monthKey: string; start: string; end: string }[] {
  const months = [];
  for (let m = 0; m < 12; m++) {
    const d = new Date(year, m, 1);
    months.push({
      label: format(d, 'MMM'),
      monthKey: format(d, 'yyyy-MM'),
      start: getStartOfDay(dfStartOfMonth(d)),
      end: getEndOfDay(dfEndOfMonth(d)),
    });
  }
  return months;
}

/**
 * Computes next due date for recurring transactions
 */
export function computeNextDueDate(currentDue: string, frequency: RecurringFrequency): string {
  const d = parseISO(currentDue);
  let nextDate: Date;
  switch (frequency) {
    case 'daily':
      nextDate = addDays(d, 1);
      break;
    case 'weekly':
      nextDate = addWeeks(d, 1);
      break;
    case 'monthly':
      nextDate = addMonths(d, 1);
      break;
    case 'yearly':
      nextDate = addYears(d, 1);
      break;
  }
  return format(nextDate, "yyyy-MM-dd'T'HH:mm:ss.SSS");
}
