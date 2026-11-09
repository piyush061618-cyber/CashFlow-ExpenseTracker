import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  getFinancialSummary,
  getFilteredTransactions,
  getCategoryBreakdown,
  getDailyExpenseTotals,
} from '../database/transactionsRepo';
import { processDueRecurringTransactions } from '../database/recurringRepo';
import { subscribeDataChanged } from '../utils/dataEvents';
import { FinancialSummary, Transaction, CategoryBreakdownItem } from '../types';
import { formatINR } from '../utils/currency';
import { getMonthRange, getLast7Days, formatDate } from '../utils/date';
import { useTheme } from '../theme/ThemeContext';
import { StatCard } from '../components/common/StatCard';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { TransactionItem } from '../components/transactions/TransactionItem';
import { CategoryPieChart } from '../components/charts/CategoryPieChart';
import { WeeklyBarChart } from '../components/charts/WeeklyBarChart';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PlusCircle,
  MinusCircle,
  Sparkles,
  ArrowRight,
  PiggyBank,
  Receipt,
  Calendar,
} from 'lucide-react-native';

export const HomeScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();

  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<FinancialSummary>({
    total_balance_paise: 0,
    total_assets_paise: 0,
    total_liabilities_paise: 0,
    monthly_income_paise: 0,
    monthly_expense_paise: 0,
    monthly_savings_paise: 0,
    today_expense_paise: 0,
    weekly_expense_paise: 0,
    remaining_monthly_budget_paise: 0,
    monthly_budget_limit_paise: 0,
    monthly_budget_consumed_paise: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdownItem[]>([]);
  const [weeklyBarData, setWeeklyBarData] = useState<{ label: string; totalPaise: number; dateStr: string }[]>([]);

  const loadDashboardData = async () => {
    try {
      // Process any due recurring transactions first
      await processDueRecurringTransactions();

      const now = new Date();
      const monthRange = getMonthRange(now);
      const days7 = getLast7Days();

      const [sum, recents, breakdown, dailyTotals] = await Promise.all([
        getFinancialSummary(now),
        getFilteredTransactions({ sortBy: 'newest' }),
        getCategoryBreakdown(monthRange.start, monthRange.end, 'expense'),
        getDailyExpenseTotals(days7[0].start, days7[days7.length - 1].end),
      ]);

      setSummary(sum);
      setRecentTransactions(recents.slice(0, 5));
      setCategoryBreakdown(breakdown);

      // Map daily totals to last 7 days
      const barData = days7.map((d) => {
        const found = dailyTotals.find((t) => t.dateStr === d.dateStr);
        return {
          label: d.label,
          totalPaise: found?.total_paise || 0,
          dateStr: d.dateStr,
        };
      });
      setWeeklyBarData(barData);
    } catch (err) {
      console.warn('Dashboard load error:', err);
    }
  };

  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  useEffect(() => {
    const unsub = subscribeDataChanged(() => {
      loadDashboardData();
    });
    return unsub;
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 90 + insets.bottom },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.topHeader}>
          <View>
            <Text style={[styles.greetingText, { color: colors.textSecondary }]}>Welcome Back</Text>
            <Text style={[styles.appName, { color: colors.text }]}>CashFlow</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('AIAssistantModal')}
              style={[styles.aiButton, { backgroundColor: colors.primaryLight }]}
            >
              <Sparkles size={18} color={colors.primary} />
              <Text style={[styles.aiButtonText, { color: colors.primary }]}>AI Advisor</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Available Balance Hero Card */}
        <Card style={[styles.heroCard, { backgroundColor: colors.primary }]}>
          <View style={styles.heroHeader}>
            <Text style={styles.heroLabel}>Total Available Balance</Text>
            <Wallet size={20} color="#FFFFFF" opacity={0.8} />
          </View>
          <Text style={styles.heroAmount}>{formatINR(summary.total_balance_paise)}</Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatLabel}>Cash Assets</Text>
              <Text style={styles.heroStatValue}>{formatINR(summary.total_assets_paise)}</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatLabel}>Credit Due</Text>
              <Text style={styles.heroStatValue}>{formatINR(summary.total_liabilities_paise)}</Text>
            </View>
          </View>
        </Card>

        {/* Quick Add Actions */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('AddEditTransactionModal', { defaultType: 'income' })}
            style={[styles.quickButton, { backgroundColor: colors.incomeBg, borderColor: colors.incomeBorder }]}
          >
            <PlusCircle size={20} color={colors.income} />
            <Text style={[styles.quickButtonText, { color: colors.income }]}>+ Add Income</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('AddEditTransactionModal', { defaultType: 'expense' })}
            style={[styles.quickButton, { backgroundColor: colors.expenseBg, borderColor: colors.expenseBorder }]}
          >
            <MinusCircle size={20} color={colors.expense} />
            <Text style={[styles.quickButtonText, { color: colors.expense }]}>- Add Expense</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ReceiptScannerModal')}
            style={[styles.scannerButton, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
          >
            <Receipt size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Monthly Performance Stats Grid */}
        <Text style={[styles.sectionHeading, { color: colors.text }]}>This Month</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Income"
            amount={formatINR(summary.monthly_income_paise)}
            color={colors.income}
            icon={<TrendingUp size={16} color={colors.income} />}
            style={styles.gridItem}
          />
          <StatCard
            title="Expenses"
            amount={formatINR(summary.monthly_expense_paise)}
            color={colors.expense}
            icon={<TrendingDown size={16} color={colors.expense} />}
            style={styles.gridItem}
          />
          <StatCard
            title="Net Savings"
            amount={formatINR(summary.monthly_savings_paise)}
            color={summary.monthly_savings_paise >= 0 ? colors.income : colors.expense}
            icon={<PiggyBank size={16} color={colors.primary} />}
            style={styles.gridItem}
          />
          <StatCard
            title="Today's Spend"
            amount={formatINR(summary.today_expense_paise)}
            color={colors.text}
            icon={<Calendar size={16} color={colors.textSecondary} />}
            style={styles.gridItem}
          />
        </View>

        {/* Weekly Spending Trend */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Last 7 Days Spending</Text>
        </View>
        <Card style={styles.chartCard}>
          <WeeklyBarChart data={weeklyBarData} />
        </Card>

        {/* Category Breakdown Donut */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Expense Breakdown</Text>
        </View>
        <Card style={styles.chartCard}>
          <CategoryPieChart
            data={categoryBreakdown}
            totalPaise={summary.monthly_expense_paise}
          />
        </Card>

        {/* Recent Transactions List */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Recent Transactions</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Transactions')}
            style={styles.seeAllButton}
          >
            <Text style={[styles.seeAllText, { color: colors.primary }]}>View All</Text>
            <ArrowRight size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {recentTransactions.length === 0 ? (
          <EmptyState
            icon={<Receipt size={40} color={colors.primary} />}
            title="No Transactions Yet"
            description="Start tracking by adding your first income or expense transaction!"
            actionTitle="+ Add Transaction"
            onAction={() => navigation.navigate('AddEditTransactionModal')}
          />
        ) : (
          <Card style={styles.transactionsCard}>
            {recentTransactions.map((tx) => (
              <TransactionItem
                key={tx.id}
                transaction={tx}
                showDate={true}
                onPress={() => navigation.navigate('AddEditTransactionModal', { transactionId: tx.id })}
              />
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 90,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greetingText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  appName: {
    fontSize: 24,
    fontWeight: '800',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },
  aiButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  heroCard: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroLabel: {
    color: '#E0E7FF',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  heroAmount: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 16,
  },
  heroStatsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 12,
    padding: 10,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  heroStatItem: {
    alignItems: 'center',
  },
  heroStatLabel: {
    color: '#CBD5E1',
    fontSize: 11,
    marginBottom: 2,
  },
  heroStatValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  quickButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  quickButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  scannerButton: {
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  gridItem: {
    flex: 1,
    minWidth: '47%',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  chartCard: {
    padding: 12,
    marginBottom: 16,
  },
  transactionsCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: 20,
  },
});

