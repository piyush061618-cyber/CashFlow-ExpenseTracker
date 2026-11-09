import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  getFilteredTransactions,
  getCategoryBreakdown,
  getDailyExpenseTotals,
  getMonthlyTrend,
  getFinancialSummary,
} from '../database/transactionsRepo';
import { subscribeDataChanged } from '../utils/dataEvents';
import {
  Transaction,
  CategoryBreakdownItem,
  FinancialSummary,
} from '../types';
import { formatINR } from '../utils/currency';
import {
  getMonthRange,
  getWeekRange,
  getYearRange,
  getStartOfDay,
  getEndOfDay,
  getLast7Days,
  getMonthsOfYear,
  formatDate,
} from '../utils/date';
import { exportFinancialReportToPDF, exportTransactionsToCSV } from '../utils/export';
import { useTheme } from '../theme/ThemeContext';
import { Card } from '../components/common/Card';
import { StatCard } from '../components/common/StatCard';
import { Button } from '../components/common/Button';
import { CategoryPieChart } from '../components/charts/CategoryPieChart';
import { WeeklyBarChart } from '../components/charts/WeeklyBarChart';
import { TrendLineChart } from '../components/charts/TrendLineChart';
import { IncomeExpenseComparisonBar } from '../components/charts/IncomeExpenseComparisonBar';
import {
  Download,
  FileText,
  Share2,
  Calendar,
  TrendingUp,
  TrendingDown,
  Award,
  Zap,
} from 'lucide-react-native';
import { subMonths } from 'date-fns';

type TimeRange = 'week' | 'month' | 'year';

export const AnalyticsScreen: React.FC = () => {
  const { colors } = useTheme();

  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [incomePaise, setIncomePaise] = useState(0);
  const [expensePaise, setExpensePaise] = useState(0);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdownItem[]>([]);
  const [barData, setBarData] = useState<{ label: string; totalPaise: number; dateStr: string }[]>([]);
  const [trendData, setTrendData] = useState<{ label: string; amountPaise: number }[]>([]);
  const [rawTransactions, setRawTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let startStr = '';
      let endStr = '';

      if (timeRange === 'week') {
        const r = getWeekRange(now);
        startStr = r.start;
        endStr = r.end;
      } else if (timeRange === 'month') {
        const r = getMonthRange(now);
        startStr = r.start;
        endStr = r.end;
      } else {
        const r = getYearRange(now);
        startStr = r.start;
        endStr = r.end;
      }

      const [txs, cats, sum] = await Promise.all([
        getFilteredTransactions({ startDate: startStr, endDate: endStr }),
        getCategoryBreakdown(startStr, endStr, 'expense'),
        getFinancialSummary(now),
      ]);

      setRawTransactions(txs);
      setCategoryBreakdown(cats);
      setSummary(sum);

      let inc = 0;
      let exp = 0;
      txs.forEach((t) => {
        if (t.type === 'income') inc += t.amount_paise;
        else exp += t.amount_paise;
      });
      setIncomePaise(inc);
      setExpensePaise(exp);

      // Bar data (last 7 days)
      const days7 = getLast7Days();
      const dailyTotals = await getDailyExpenseTotals(days7[0].start, days7[days7.length - 1].end);
      const bData = days7.map((d) => {
        const found = dailyTotals.find((t) => t.dateStr === d.dateStr);
        return {
          label: d.label,
          totalPaise: found?.total_paise || 0,
          dateStr: d.dateStr,
        };
      });
      setBarData(bData);

      // Trend data (12 months of current year)
      const months = getMonthsOfYear(now.getFullYear());
      const monthlyTrends = await getMonthlyTrend(now.getFullYear());
      const tData = months.map((m) => {
        const found = monthlyTrends.find((t) => t.monthKey === m.monthKey);
        return {
          label: m.label,
          amountPaise: found?.expense_paise || 0,
        };
      });
      setTrendData(tData);
    } catch (err) {
      console.warn('Analytics loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAnalytics();
    }, [timeRange])
  );

  const handleExportPDF = async () => {
    if (!summary) return;
    setExporting(true);
    try {
      await exportFinancialReportToPDF({
        reportTitle: `${timeRange.toUpperCase()} Financial Statement`,
        periodLabel: timeRange === 'month' ? 'Current Month' : timeRange === 'week' ? 'Current Week' : 'Current Year',
        summary,
        categories: categoryBreakdown,
        transactions: rawTransactions,
      });
    } catch (err: any) {
      Alert.alert('Export Error', err.message || 'Failed to export PDF.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      await exportTransactionsToCSV(rawTransactions);
    } catch (err: any) {
      Alert.alert('Export Error', err.message || 'Failed to export CSV.');
    } finally {
      setExporting(false);
    }
  };

  const insets = useSafeAreaInsets();

  useEffect(() => {
    const unsub = subscribeDataChanged(() => {
      loadAnalytics();
    });
    return unsub;
  }, []);

  const topCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0] : null;
  const netSavings = incomePaise - expensePaise;
  const avgDailySpend =
    timeRange === 'week'
      ? Math.round(expensePaise / 7)
      : timeRange === 'month'
      ? Math.round(expensePaise / Math.max(1, new Date().getDate()))
      : Math.round(expensePaise / 365);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Time Range Selector */}
      <View style={[styles.rangeTabs, { backgroundColor: colors.surface }]}>
        {(['week', 'month', 'year'] as const).map((r) => {
          const isSelected = timeRange === r;
          return (
            <TouchableOpacity
              key={r}
              onPress={() => setTimeRange(r)}
              style={[
                styles.rangeTab,
                isSelected && { backgroundColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.rangeTabText,
                  { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                {r === 'week' ? 'THIS WEEK' : r === 'month' ? 'THIS MONTH' : 'THIS YEAR'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 90 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Income vs Expense Comparison Bar */}
            <Card style={styles.card}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Income vs Expenses</Text>
              <IncomeExpenseComparisonBar
                incomePaise={incomePaise}
                expensePaise={expensePaise}
              />
            </Card>

            {/* Key Analytics Metrics */}
            <View style={styles.metricsRow}>
              <StatCard
                title="Top Category"
                amount={topCategory ? topCategory.category_name : 'None'}
                subtitle={topCategory ? formatINR(topCategory.total_paise) : 'No spend'}
                color={topCategory ? topCategory.category_color : colors.text}
                icon={<Award size={16} color={colors.primary} />}
                style={styles.metricItem}
              />
              <StatCard
                title="Daily Average"
                amount={formatINR(avgDailySpend, { showDecimals: false })}
                subtitle="Average spend / day"
                icon={<Zap size={16} color={colors.warning} />}
                style={styles.metricItem}
              />
            </View>

            {/* Expense Breakdown Donut Chart */}
            <Card style={styles.card}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Category Distribution</Text>
              <CategoryPieChart
                data={categoryBreakdown}
                totalPaise={expensePaise}
                size={190}
              />
            </Card>

            {/* 7-Day Spending Breakdown */}
            <Card style={styles.card}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Daily Spending Pattern</Text>
              <WeeklyBarChart data={barData} />
            </Card>

            {/* Annual Spending Trend */}
            <Card style={styles.card}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Annual Monthly Trend ({new Date().getFullYear()})</Text>
              <TrendLineChart data={trendData} />
            </Card>

            {/* Export Actions */}
            <View style={styles.exportSection}>
              <Text style={[styles.exportHeading, { color: colors.text }]}>Export Financial Statements</Text>
              <View style={styles.exportButtonsRow}>
                <Button
                  title="Export PDF Report"
                  icon={<FileText size={16} color="#FFFFFF" />}
                  onPress={handleExportPDF}
                  loading={exporting}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Export CSV"
                  variant="outline"
                  icon={<Download size={16} color={colors.primary} />}
                  onPress={handleExportCSV}
                  loading={exporting}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  rangeTabs: {
    flexDirection: 'row',
    padding: 8,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    gap: 6,
  },
  rangeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  rangeTabText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 90,
  },
  card: {
    marginBottom: 14,
    padding: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  metricItem: {
    flex: 1,
  },
  exportSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  exportHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  exportButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
});

