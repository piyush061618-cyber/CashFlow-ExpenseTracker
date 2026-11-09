import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Budget } from '../../types';
import { formatINR } from '../../utils/currency';
import { getCategoryIcon } from '../../utils/iconMap';
import { Card } from '../common/Card';
import { useTheme } from '../../theme/ThemeContext';
import { AlertTriangle } from 'lucide-react-native';

interface Props {
  budget: Budget;
  onPress?: () => void;
}

export const BudgetProgressCard: React.FC<Props> = ({ budget, onPress }) => {
  const { colors } = useTheme();

  const spent = budget.spent_paise || 0;
  const limit = budget.amount_paise || 1;
  const percentage = Math.min(Math.round((spent / limit) * 100), 100);
  const remaining = budget.remaining_paise !== undefined ? budget.remaining_paise : limit - spent;
  const isOver = spent > limit;

  // Bar color based on threshold
  let barColor = colors.income;
  if (spent >= limit) {
    barColor = colors.expense;
  } else if (percentage >= 90) {
    barColor = colors.expense;
  } else if (percentage >= 75) {
    barColor = colors.warning;
  }

  const categoryName = budget.category_name || 'Overall Spending Limit';
  const iconName = budget.category_icon || 'PieChart';

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.leftHeader}>
          <View
            style={[
              styles.iconBox,
              { backgroundColor: budget.category_color || colors.primary },
            ]}
          >
            {getCategoryIcon(iconName, 18, '#FFFFFF')}
          </View>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>{categoryName}</Text>
            <Text style={[styles.periodText, { color: colors.textSecondary }]}>
              {budget.period.toUpperCase()} • {budget.period_key}
            </Text>
          </View>
        </View>

        {isOver && (
          <View style={[styles.warningBadge, { backgroundColor: colors.expenseBg }]}>
            <AlertTriangle size={14} color={colors.expense} />
            <Text style={[styles.warningText, { color: colors.expense }]}>Exceeded</Text>
          </View>
        )}
      </View>

      {/* Progress Track */}
      <View style={[styles.track, { backgroundColor: colors.surfaceVariant }]}>
        <View
          style={[
            styles.progress,
            { width: `${percentage}%`, backgroundColor: barColor },
          ]}
        />
      </View>

      {/* Footer Metrics */}
      <View style={styles.footer}>
        <Text style={[styles.spentText, { color: colors.text }]}>
          Spent: <Text style={{ fontWeight: '700' }}>{formatINR(spent)}</Text>
        </Text>
        <Text style={[styles.remainingText, { color: isOver ? colors.expense : colors.textSecondary }]}>
          {isOver ? `Over by ${formatINR(Math.abs(remaining))}` : `${formatINR(remaining)} left`}
        </Text>
        <Text style={[styles.limitText, { color: colors.textSecondary }]}>
          Limit: {formatINR(limit)}
        </Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  leftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  periodText: {
    fontSize: 11,
    marginTop: 2,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  warningText: {
    fontSize: 11,
    fontWeight: '700',
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progress: {
    height: '100%',
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spentText: {
    fontSize: 12,
  },
  remainingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  limitText: {
    fontSize: 12,
  },
});

