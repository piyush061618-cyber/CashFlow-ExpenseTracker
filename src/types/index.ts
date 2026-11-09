// Core Types for CashFlow Personal Expense Tracker

export type TransactionType = 'income' | 'expense';

export type WalletType =
  | 'cash'
  | 'bank'
  | 'savings'
  | 'upi'
  | 'credit_card'
  | 'digital_wallet';

export type BudgetPeriod = 'monthly' | 'weekly';

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Wallet {
  id: string;
  name: string;
  type: WalletType;
  balance_paise: number; // In paise (100 paise = 1 INR)
  credit_limit_paise?: number; // For credit cards
  color: string;
  icon: string;
  is_default: number; // 1 or 0
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  is_custom: number; // 1 or 0
  created_at: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount_paise: number;
  category_id: string;
  wallet_id: string;
  date: string; // ISO string YYYY-MM-DDTHH:mm:ss.sssZ
  description: string;
  payment_method: string;
  receipt_uri?: string | null;
  created_at: string;
  updated_at: string;

  // Joined fields for display
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  wallet_name?: string;
  wallet_type?: WalletType;
  wallet_color?: string;
}

export interface Transfer {
  id: string;
  from_wallet_id: string;
  to_wallet_id: string;
  amount_paise: number;
  date: string;
  notes: string;
  created_at: string;

  // Joined fields
  from_wallet_name?: string;
  to_wallet_name?: string;
}

export interface Budget {
  id: string;
  category_id: string | null; // null for overall spending budget
  amount_paise: number;
  period: BudgetPeriod;
  period_key: string; // e.g. "2026-11" for monthly, "2026-W45" for weekly
  notify_75: number; // 1 or 0
  notify_90: number; // 1 or 0
  notify_100: number; // 1 or 0
  notified_threshold: number; // 0, 75, 90, 100
  created_at: string;

  // Computed fields
  spent_paise?: number;
  remaining_paise?: number;
  percentage?: number;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
}

export interface SavingsGoal {
  id: string;
  title: string;
  target_amount_paise: number;
  saved_amount_paise: number;
  target_date: string; // ISO date
  color: string;
  icon: string;
  is_completed: number; // 1 or 0
  created_at: string;
}

export interface RecurringTransaction {
  id: string;
  type: TransactionType;
  amount_paise: number;
  category_id: string;
  wallet_id: string;
  description: string;
  frequency: RecurringFrequency;
  start_date: string;
  end_date?: string | null;
  next_due_date: string;
  last_processed_date?: string | null;
  is_active: number; // 1 or 0
  created_at: string;

  // Joined
  category_name?: string;
  wallet_name?: string;
}

export interface AppSettings {
  profile_name: string;
  theme_mode: 'light' | 'dark' | 'system';
  default_currency?: string;
  currency_symbol: string;
  pin_enabled: boolean;
  pin_hash?: string;
  pin_salt?: string;
  biometric_enabled: boolean;
  daily_reminder_enabled: boolean;
  daily_reminder_time: string; // "20:00"
  budget_alerts_enabled: boolean;
  recurring_reminders_enabled: boolean;
  ai_provider: 'local' | 'gemini' | 'openai';
  ai_api_key?: string;
  default_wallet_id?: string;
  last_backup_date?: string;
  last_backup_size?: number;
  last_backup_name?: string;
  auto_backup_frequency?: 'daily' | 'weekly' | 'monthly' | 'manual';
  full_settings?: any;
}

export interface NotificationHistoryItem {
  id: string;
  title: string;
  body: string;
  type: 'daily_reminder' | 'budget_warning' | 'recurring_due' | 'goal_reminder' | 'weekly_summary';
  triggered_at: string;
  is_read: number;
}

export interface FinancialSummary {
  total_balance_paise: number;
  total_assets_paise: number;
  total_liabilities_paise: number;
  monthly_income_paise: number;
  monthly_expense_paise: number;
  monthly_savings_paise: number;
  today_expense_paise: number;
  weekly_expense_paise: number;
  remaining_monthly_budget_paise: number;
  monthly_budget_limit_paise: number;
  monthly_budget_consumed_paise: number;
}

export interface CategoryBreakdownItem {
  category_id: string;
  category_name: string;
  category_color: string;
  category_icon: string;
  total_paise: number;
  percentage: number;
  count: number;
}

export interface DateGroupedTransactions {
  date: string; // formatted e.g. "Today", "Yesterday", "09 Nov 2026"
  raw_date: string; // YYYY-MM-DD
  day_total_paise: number;
  transactions: Transaction[];
}

export interface TransactionFilter {
  type?: 'all' | 'income' | 'expense';
  startDate?: string;
  endDate?: string;
  categoryIds?: string[];
  walletIds?: string[];
  paymentMethods?: string[];
  searchQuery?: string;
  sortBy?: 'newest' | 'oldest' | 'highest' | 'lowest';
}

