// CashFlow Theme Color Palettes

export interface ColorPalette {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  background: string;
  surface: string;
  surfaceVariant: string;
  card: string;
  cardSecondary: string;
  border: string;
  borderLight: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // Financial Semantics
  income: string;
  incomeBg: string;
  incomeBorder: string;
  expense: string;
  expenseBg: string;
  expenseBorder: string;
  warning: string;
  warningBg: string;
  info: string;
  infoBg: string;

  // Accents
  accentPurple: string;
  accentCyan: string;
  accentPink: string;

  // Overlays
  overlay: string;
  shimmer: string;
}

export const lightColors: ColorPalette = {
  primary: '#4F46E5', // Indigo 600
  primaryLight: '#EEF2FF',
  primaryDark: '#3730A3',
  background: '#F8FAFC', // Slate 50
  surface: '#FFFFFF',
  surfaceVariant: '#F1F5F9',
  card: '#FFFFFF',
  cardSecondary: '#F8FAFC',
  border: '#E2E8F0', // Slate 200
  borderLight: '#F1F5F9',
  text: '#0F172A', // Slate 900
  textSecondary: '#64748B', // Slate 500
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  income: '#10B981', // Emerald 500
  incomeBg: '#ECFDF5',
  incomeBorder: '#A7F3D0',
  expense: '#EF4444', // Red 500
  expenseBg: '#FEF2F2',
  expenseBorder: '#FECACA',
  warning: '#F59E0B', // Amber 500
  warningBg: '#FFFBEB',
  info: '#3B82F6', // Blue 500
  infoBg: '#EFF6FF',

  accentPurple: '#8B5CF6',
  accentCyan: '#06B6D4',
  accentPink: '#EC4899',

  overlay: 'rgba(15, 23, 42, 0.5)',
  shimmer: '#E2E8F0',
};

export const darkColors: ColorPalette = {
  primary: '#6366F1', // Indigo 500
  primaryLight: '#1E1B4B',
  primaryDark: '#4338CA',
  background: '#0B0F19', // Deep navy black
  surface: '#111827', // Gray 900
  surfaceVariant: '#1E293B', // Slate 800
  card: '#182032', // Elevated navy
  cardSecondary: '#111827',
  border: '#27354A',
  borderLight: '#1E293B',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0F172A',

  income: '#10B981',
  incomeBg: '#064E3B',
  incomeBorder: '#065F46',
  expense: '#F87171',
  expenseBg: '#451010',
  expenseBorder: '#7F1D1D',
  warning: '#FBBF24',
  warningBg: '#451A03',
  info: '#60A5FA',
  infoBg: '#1E3A8A',

  accentPurple: '#A78BFA',
  accentCyan: '#22D3EE',
  accentPink: '#F472B6',

  overlay: 'rgba(0, 0, 0, 0.75)',
  shimmer: '#1E293B',
};

