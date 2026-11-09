import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  getBudgetsWithProgress,
  deleteBudget,
  updateBudgetNotifiedThreshold,
} from '../database/budgetsRepo';
import { checkBudgetThresholdAlert } from '../services/notificationService';
import { subscribeDataChanged } from '../utils/dataEvents';
import { Budget, BudgetPeriod } from '../types';
import { formatINR } from '../utils/currency';
import { getMonthKey, getWeekKey } from '../utils/date';
import { useTheme } from '../theme/ThemeContext';
import { BudgetProgressCard } from '../components/budgets/BudgetProgressCard';
import { EmptyState } from '../components/common/EmptyState';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { PieChart, Plus, AlertCircle, ShieldAlert } from 'lucide-react-native';

export const BudgetsScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  const [period, setPeriod] = useState<BudgetPeriod>('monthly');
  const [budgets, setBudgets] = useState<Budget[]>([]);

  const loadBudgets = async () => {
    try {
      const currentKey = period === 'monthly' ? getMonthKey() : getWeekKey();
      const list = await getBudgetsWithProgress(period, currentKey);
      setBudgets(list);

      // Check threshold alerts for each budget
      for (const b of list) {
        if (b.amount_paise > 0 && b.spent_paise !== undefined) {
          await checkBudgetThresholdAlert(
            b.id,
            b.category_name || 'Overall Budget',
            b.spent_paise,
            b.amount_paise,
            b.notified_threshold,
            async (newThreshold) => {
              await updateBudgetNotifiedThreshold(b.id, newThreshold);
            }
          );
        }
      }
    } catch (err) {
      console.warn('Error loading budgets:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadBudgets();
    }, [period])
  );

  const handleDelete = (budget: Budget) => {
    Alert.alert(
      'Delete Budget',
      `Delete budget for "${budget.category_name || 'Overall Spending'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteBudget(budget.id);
            await loadBudgets();
          },
        },
      ]
    );
  };

  const insets = useSafeAreaInsets();

  useEffect(() => {
    const unsub = subscribeDataChanged(() => {
      loadBudgets();
    });
    return unsub;
  }, []);

  const overallBudget = budgets.find((b) => b.category_id === null);
  const categoryBudgets = budgets.filter((b) => b.category_id !== null);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Period Selector Tabs */}
      <View style={[styles.periodTabs, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          onPress={() => setPeriod('monthly')}
          style={[
            styles.periodTab,
            period === 'monthly' && { backgroundColor: colors.primary },
          ]}
        >
          <Text
            style={[
              styles.periodTabText,
              { color: period === 'monthly' ? '#FFFFFF' : colors.textSecondary },
            ]}
          >
            MONTHLY BUDGETS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setPeriod('weekly')}
          style={[
            styles.periodTab,
            period === 'weekly' && { backgroundColor: colors.primary },
          ]}
        >
          <Text
            style={[
              styles.periodTabText,
              { color: period === 'weekly' ? '#FFFFFF' : colors.textSecondary },
            ]}
          >
            WEEKLY BUDGETS
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 90 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Overall Limit Card */}
        {overallBudget && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Overall Spending Cap</Text>
            <BudgetProgressCard
              budget={overallBudget}
              onPress={() => handleDelete(overallBudget)}
            />
          </View>
        )}

        {/* Category-Specific Budgets */}
        <View style={styles.section}>
          <View style={styles.headerRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Category Budgets</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('AddEditBudgetModal', { defaultPeriod: period })}
              style={[styles.addButton, { backgroundColor: colors.primaryLight }]}
            >
              <Plus size={16} color={colors.primary} />
              <Text style={[styles.addButtonText, { color: colors.primary }]}>Set Budget</Text>
            </TouchableOpacity>
          </View>

          {categoryBudgets.length === 0 && !overallBudget ? (
            <EmptyState
              icon={<PieChart size={40} color={colors.primary} />}
              title="No Active Budgets"
              description="Establish monthly or weekly limits to keep your expenses controlled and receive warnings at 75%, 90% and 100%."
              actionTitle="+ Create Your First Budget"
              onAction={() => navigation.navigate('AddEditBudgetModal', { defaultPeriod: period })}
            />
          ) : (
            categoryBudgets.map((b) => (
              <BudgetProgressCard
                key={b.id}
                budget={b}
                onPress={() => handleDelete(b)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  periodTabs: {
    flexDirection: 'row',
    padding: 8,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    gap: 8,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  periodTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 90,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

