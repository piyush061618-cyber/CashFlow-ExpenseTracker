import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Card } from './Card';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  title: string;
  amount: string;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export const StatCard: React.FC<Props> = ({
  title,
  amount,
  subtitle,
  icon,
  color,
  style,
}) => {
  const { colors } = useTheme();

  return (
    <Card style={[styles.card, style]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.textSecondary }]}>
          {title}
        </Text>
        {icon && <View style={styles.iconBox}>{icon}</View>}
      </View>
      <Text
        style={[styles.amount, { color: color || colors.text }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {amount}
      </Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {subtitle}
        </Text>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 14,
    minWidth: 140,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  iconBox: {
    padding: 4,
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    marginVertical: 2,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
});
