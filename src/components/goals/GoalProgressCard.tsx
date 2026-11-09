import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SavingsGoal } from '../../types';
import { formatINR } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { useTheme } from '../../theme/ThemeContext';
import { CheckCircle2, Target } from 'lucide-react-native';

interface Props {
  goal: SavingsGoal;
  onPress?: () => void;
  onDepositPress?: () => void;
}

export const GoalProgressCard: React.FC<Props> = ({
  goal,
  onPress,
  onDepositPress,
}) => {
  const { colors } = useTheme();

  const target = goal.target_amount_paise || 1;
  const saved = goal.saved_amount_paise || 0;
  const percentage = Math.min(Math.round((saved / target) * 100), 100);
  const remaining = Math.max(0, target - saved);
  const isCompleted = goal.is_completed === 1 || saved >= target;

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.left}>
          <View
            style={[
              styles.iconBox,
              { backgroundColor: goal.color || colors.primary },
            ]}
          >
            <Target size={20} color="#FFFFFF" />
          </View>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>{goal.title}</Text>
            <Text style={[styles.targetDate, { color: colors.textSecondary }]}>
              Target: {formatDate(goal.target_date)}
            </Text>
          </View>
        </View>

        {isCompleted ? (
          <View style={[styles.completedBadge, { backgroundColor: colors.incomeBg }]}>
            <CheckCircle2 size={14} color={colors.income} />
            <Text style={[styles.completedText, { color: colors.income }]}>Achieved</Text>
          </View>
        ) : (
          <Text style={[styles.percentText, { color: colors.primary }]}>{percentage}%</Text>
        )}
      </View>

      {/* Progress Track */}
      <View style={[styles.track, { backgroundColor: colors.surfaceVariant }]}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${percentage}%`,
              backgroundColor: isCompleted ? colors.income : colors.primary,
            },
          ]}
        />
      </View>

      {/* Figures */}
      <View style={styles.figuresRow}>
        <View>
          <Text style={[styles.figureLabel, { color: colors.textSecondary }]}>Saved</Text>
          <Text style={[styles.figureValue, { color: colors.income }]}>{formatINR(saved)}</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.figureLabel, { color: colors.textSecondary }]}>Remaining</Text>
          <Text style={[styles.figureValue, { color: colors.text }]}>{formatINR(remaining)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.figureLabel, { color: colors.textSecondary }]}>Target</Text>
          <Text style={[styles.figureValue, { color: colors.text }]}>{formatINR(target)}</Text>
        </View>
      </View>

      {!isCompleted && onDepositPress && (
        <View style={styles.actionRow}>
          <Button
            title="+ Add Money"
            variant="outline"
            size="sm"
            onPress={onDepositPress}
            style={{ width: '100%', marginTop: 10 }}
          />
        </View>
      )}
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
  left: {
    flexDirection: 'row',
    alignItems: 'center',
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
  targetDate: {
    fontSize: 11,
    marginTop: 2,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  completedText: {
    fontSize: 11,
    fontWeight: '700',
  },
  percentText: {
    fontSize: 16,
    fontWeight: '800',
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  figuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  figureLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  figureValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionRow: {
    marginTop: 4,
  },
});

