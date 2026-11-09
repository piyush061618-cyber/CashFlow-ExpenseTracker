import { Category, Wallet, AppSettings } from '../types';

export const DEFAULT_INCOME_CATEGORIES: Omit<Category, 'created_at'>[] = [
  { id: 'cat_inc_1', name: 'Salary', type: 'income', icon: 'Briefcase', color: '#10B981', is_custom: 0 },
  { id: 'cat_inc_2', name: 'Freelancing', type: 'income', icon: 'Laptop', color: '#06B6D4', is_custom: 0 },
  { id: 'cat_inc_3', name: 'Business', type: 'income', icon: 'TrendingUp', color: '#3B82F6', is_custom: 0 },
  { id: 'cat_inc_4', name: 'Investments', type: 'income', icon: 'PieChart', color: '#8B5CF6', is_custom: 0 },
  { id: 'cat_inc_5', name: 'Interest', type: 'income', icon: 'Percent', color: '#EC4899', is_custom: 0 },
  { id: 'cat_inc_6', name: 'Gifts', type: 'income', icon: 'Gift', color: '#F59E0B', is_custom: 0 },
  { id: 'cat_inc_7', name: 'Other', type: 'income', icon: 'MoreHorizontal', color: '#6B7280', is_custom: 0 },
];

export const DEFAULT_EXPENSE_CATEGORIES: Omit<Category, 'created_at'>[] = [
  { id: 'cat_exp_1', name: 'Food', type: 'expense', icon: 'Utensils', color: '#EF4444', is_custom: 0 },
  { id: 'cat_exp_2', name: 'Shopping', type: 'expense', icon: 'ShoppingBag', color: '#F97316', is_custom: 0 },
  { id: 'cat_exp_3', name: 'Travel', type: 'expense', icon: 'Plane', color: '#F59E0B', is_custom: 0 },
  { id: 'cat_exp_4', name: 'Transportation', type: 'expense', icon: 'Car', color: '#EAB308', is_custom: 0 },
  { id: 'cat_exp_5', name: 'Education', type: 'expense', icon: 'GraduationCap', color: '#84CC16', is_custom: 0 },
  { id: 'cat_exp_6', name: 'Entertainment', type: 'expense', icon: 'Film', color: '#10B981', is_custom: 0 },
  { id: 'cat_exp_7', name: 'Healthcare', type: 'expense', icon: 'HeartPulse', color: '#06B6D4', is_custom: 0 },
  { id: 'cat_exp_8', name: 'Rent', type: 'expense', icon: 'Home', color: '#3B82F6', is_custom: 0 },
  { id: 'cat_exp_9', name: 'Electricity', type: 'expense', icon: 'Zap', color: '#6366F1', is_custom: 0 },
  { id: 'cat_exp_10', name: 'Groceries', type: 'expense', icon: 'ShoppingCart', color: '#8B5CF6', is_custom: 0 },
  { id: 'cat_exp_11', name: 'Mobile Recharge', type: 'expense', icon: 'Smartphone', color: '#A855F7', is_custom: 0 },
  { id: 'cat_exp_12', name: 'Subscriptions', type: 'expense', icon: 'Calendar', color: '#D946EF', is_custom: 0 },
  { id: 'cat_exp_13', name: 'Personal Care', type: 'expense', icon: 'Smile', color: '#EC4899', is_custom: 0 },
  { id: 'cat_exp_14', name: 'Other', type: 'expense', icon: 'MoreHorizontal', color: '#64748B', is_custom: 0 },
];

export const DEFAULT_WALLETS: Omit<Wallet, 'created_at' | 'updated_at'>[] = [
  {
    id: 'wallet_cash',
    name: 'Cash in Hand',
    type: 'cash',
    balance_paise: 0,
    credit_limit_paise: 0,
    color: '#10B981',
    icon: 'Banknote',
    is_default: 1,
  },
  {
    id: 'wallet_bank',
    name: 'Primary Bank Account',
    type: 'bank',
    balance_paise: 0,
    credit_limit_paise: 0,
    color: '#3B82F6',
    icon: 'Building2',
    is_default: 0,
  },
  {
    id: 'wallet_savings',
    name: 'Savings Account',
    type: 'savings',
    balance_paise: 0,
    credit_limit_paise: 0,
    color: '#8B5CF6',
    icon: 'PiggyBank',
    is_default: 0,
  },
  {
    id: 'wallet_upi',
    name: 'UPI / Google Pay',
    type: 'upi',
    balance_paise: 0,
    credit_limit_paise: 0,
    color: '#06B6D4',
    icon: 'QrCode',
    is_default: 0,
  },
  {
    id: 'wallet_cc',
    name: 'Credit Card',
    type: 'credit_card',
    balance_paise: 0, // Current outstanding liability in paise
    credit_limit_paise: 5000000, // ₹50,000 credit limit in paise
    color: '#EF4444',
    icon: 'CreditCard',
    is_default: 0,
  },
];

export const PAYMENT_METHODS = [
  'Cash',
  'UPI',
  'Debit Card',
  'Credit Card',
  'Net Banking',
  'Digital Wallet',
  'Cheque',
  'Other',
];

export const DEFAULT_APP_SETTINGS: AppSettings = {
  profile_name: 'CashFlow User',
  theme_mode: 'system',
  currency_symbol: '₹',
  pin_enabled: false,
  biometric_enabled: false,
  daily_reminder_enabled: true,
  daily_reminder_time: '20:30',
  budget_alerts_enabled: true,
  recurring_reminders_enabled: true,
  ai_provider: 'local',
  default_wallet_id: 'wallet_cash',
};

