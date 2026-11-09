import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatINR } from '../../utils/currency';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  incomePaise: number;
  expensePaise: number;
}

export const IncomeExpenseComparisonBar: React.FC<Props> = ({ incomePaise, expensePaise }) => {
  const { colors } = useTheme();

  const total = incomePaise + expensePaise;
  const incomePercent = total > 0 ? (incomePaise / total) * 100 : 50;
  const expensePercent = total > 0 ? (expensePaise / total) * 100 : 50;
  const netSavings = incomePaise - expensePaise;
  const savingsRate = incomePaise > 0 ? (netSavings / incomePaise) * 100 : 0;

  return (
    <View style={styles.container}>
      {/* Values header */}
      <View style={styles.valuesRow}>
        <View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Total Income</Text>
          <Text style={[styles.amount, { color: colors.income }]}>{formatINR(incomePaise)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Total Expenses</Text>
          <Text style={[styles.amount, { color: colors.expense }]}>{formatINR(expensePaise)}</Text>
        </View>
      </View>

      {/* Stacked comparison bar */}
      <View style={[styles.barTrack, { backgroundColor: colors.surfaceVariant }]}>
        <View
          style={[
            styles.incomeBar,
            { width: `${incomePercent}%`, backgroundColor: colors.income },
          ]}
        />
        <View
          style={[
            styles.expenseBar,
            { width: `${expensePercent}%`, backgroundColor: colors.expense },
          ]}
        />
      </View>

      {/* Savings rate badge */}
      <View style={styles.footerRow}>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          Net Savings:{' '}
          <Text
            style={{
              fontWeight: '700',
              color: netSavings >= 0 ? colors.income : colors.expense,
            }}
          >
            {formatINR(netSavings)} ({savingsRate.toFixed(1)}%)
          </Text>
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 10,
  },
  valuesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
  },
  barTrack: {
    height: 12,
    borderRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  incomeBar: {
    height: '100%',
  },
  expenseBar: {
    height: '100%',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  footerText: {
    fontSize: 13,
  },
});

