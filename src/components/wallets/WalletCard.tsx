import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Wallet } from '../../types';
import { formatINR } from '../../utils/currency';
import { getCategoryIcon } from '../../utils/iconMap';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  wallet: Wallet;
  onPress?: () => void;
  isSelected?: boolean;
}

export const WalletCard: React.FC<Props> = ({
  wallet,
  onPress,
  isSelected = false,
}) => {
  const { colors } = useTheme();

  const isCreditCard = wallet.type === 'credit_card';
  const balanceLabel = isCreditCard ? 'Outstanding Due' : 'Balance';
  const balanceColor = isCreditCard
    ? colors.expense
    : wallet.balance_paise >= 0
    ? colors.income
    : colors.expense;

  return (
    <Card
      onPress={onPress}
      style={[
        styles.card,
        isSelected && { borderColor: colors.primary, borderWidth: 2 },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.left}>
          <View
            style={[
              styles.iconBox,
              { backgroundColor: wallet.color || colors.primary },
            ]}
          >
            {getCategoryIcon(wallet.icon || 'Wallet', 18, '#FFFFFF')}
          </View>
          <View>
            <Text style={[styles.name, { color: colors.text }]}>{wallet.name}</Text>
            <Text style={[styles.type, { color: colors.textSecondary }]}>
              {wallet.type.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        {wallet.is_default === 1 && (
          <Badge
            label="Default"
            backgroundColor={colors.primaryLight}
            color={colors.primary}
          />
        )}
      </View>

      <View style={styles.bottomRow}>
        <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>
          {balanceLabel}
        </Text>
        <Text style={[styles.balance, { color: balanceColor }]}>
          {formatINR(wallet.balance_paise)}
        </Text>
      </View>

      {isCreditCard && wallet.credit_limit_paise ? (
        <View style={styles.limitRow}>
          <Text style={[styles.limitText, { color: colors.textSecondary }]}>
            Credit Limit: {formatINR(wallet.credit_limit_paise)}
          </Text>
          <Text style={[styles.limitText, { color: colors.textSecondary }]}>
            Available:{' '}
            {formatINR(Math.max(0, wallet.credit_limit_paise - wallet.balance_paise))}
          </Text>
        </View>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
  },
  type: {
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  balanceLabel: {
    fontSize: 12,
  },
  balance: {
    fontSize: 17,
    fontWeight: '800',
  },
  limitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  limitText: {
    fontSize: 11,
  },
});

