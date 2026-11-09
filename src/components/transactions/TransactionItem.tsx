import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Transaction } from '../../types';
import { formatINR } from '../../utils/currency';
import { formatTime, formatDate } from '../../utils/date';
import { getCategoryIcon } from '../../utils/iconMap';
import { Receipt } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  transaction: Transaction;
  onPress?: () => void;
  showDate?: boolean;
}

export const TransactionItem: React.FC<Props> = ({
  transaction,
  onPress,
  showDate = false,
}) => {
  const { colors } = useTheme();

  const isIncome = transaction.type === 'income';
  const amountColor = isIncome ? colors.income : colors.expense;
  const sign = isIncome ? '+' : '-';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.container, { borderBottomColor: colors.borderLight }]}
    >
      {/* Category Icon */}
      <View
        style={[
          styles.iconBox,
          { backgroundColor: transaction.category_color || colors.primary },
        ]}
      >
        {getCategoryIcon(transaction.category_icon || 'MoreHorizontal', 18, '#FFFFFF')}
      </View>

      {/* Main Details */}
      <View style={styles.detailsBox}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, { color: colors.text }]}
            numberOfLines={1}
          >
            {transaction.description || transaction.category_name || 'Transaction'}
          </Text>
          {transaction.receipt_uri && (
            <View style={styles.receiptIndicator}>
              <Receipt size={12} color={colors.textSecondary} />
            </View>
          )}
        </View>

        <View style={styles.subRow}>
          <Text style={[styles.subText, { color: colors.textSecondary }]}>
            {transaction.category_name || 'General'} • {transaction.wallet_name || 'Wallet'}
          </Text>
        </View>
      </View>

      {/* Amount and Time */}
      <View style={styles.amountBox}>
        <Text style={[styles.amount, { color: amountColor }]}>
          {sign}
          {formatINR(transaction.amount_paise)}
        </Text>
        <Text style={[styles.time, { color: colors.textSecondary }]}>
          {showDate ? formatDate(transaction.date) : formatTime(transaction.date)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailsBox: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  receiptIndicator: {
    marginLeft: 6,
    padding: 2,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  subText: {
    fontSize: 12,
  },
  amountBox: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
  },
  time: {
    fontSize: 11,
    marginTop: 2,
  },
});

