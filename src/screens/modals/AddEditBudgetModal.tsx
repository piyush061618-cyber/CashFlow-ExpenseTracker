import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { upsertBudget } from '../../database/budgetsRepo';
import { getAllCategories } from '../../database/categoriesRepo';
import { Category, BudgetPeriod } from '../../types';
import { rupeesToPaise, sanitizeAmountInput } from '../../utils/currency';
import { getMonthKey, getWeekKey } from '../../utils/date';
import { getCategoryIcon } from '../../utils/iconMap';
import { useTheme } from '../../theme/ThemeContext';
import { Header } from '../../components/common/Header';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

export const AddEditBudgetModal: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const defaultPeriod: BudgetPeriod = route.params?.defaultPeriod || 'monthly';
  const [period, setPeriod] = useState<BudgetPeriod>(defaultPeriod);
  const [isOverall, setIsOverall] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [amountStr, setAmountStr] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const cats = await getAllCategories('expense');
      setCategories(cats);
    }
    load();
  }, []);

  const handleSave = async () => {
    const paise = rupeesToPaise(amountStr);
    if (paise <= 0) {
      Alert.alert('Invalid Limit', 'Please enter a valid budget limit greater than zero.');
      return;
    }
    if (!isOverall && !selectedCategoryId) {
      Alert.alert('Category Required', 'Please select a category for this budget.');
      return;
    }

    const periodKey = period === 'monthly' ? getMonthKey() : getWeekKey();
    const budgetId = `b_${period}_${isOverall ? 'overall' : selectedCategoryId}_${periodKey}`;

    setSaving(true);
    try {
      await upsertBudget({
        id: budgetId,
        category_id: isOverall ? null : selectedCategoryId,
        amount_paise: paise,
        period,
        period_key: periodKey,
        notify_75: 1,
        notify_90: 1,
        notify_100: 1,
        notified_threshold: 0,
      });
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Could not save budget.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <Header title="Set Budget Limit" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>BUDGET CYCLE</Text>
        <View style={[styles.periodToggle, { backgroundColor: colors.surfaceVariant }]}>
          <TouchableOpacity
            onPress={() => setPeriod('monthly')}
            style={[styles.periodBtn, period === 'monthly' && { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.periodBtnText, { color: period === 'monthly' ? '#FFFFFF' : colors.text }]}>
              MONTHLY (Calendar Month)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setPeriod('weekly')}
            style={[styles.periodBtn, period === 'weekly' && { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.periodBtnText, { color: period === 'weekly' ? '#FFFFFF' : colors.text }]}>
              WEEKLY (Mon - Sun)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Scope Selector: Overall vs Category */}
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>BUDGET TARGET</Text>
        <View style={styles.scopeRow}>
          <TouchableOpacity
            onPress={() => {
              setIsOverall(true);
              setSelectedCategoryId(null);
            }}
            style={[
              styles.scopeChip,
              {
                backgroundColor: isOverall ? colors.primary : colors.surfaceVariant,
                borderColor: isOverall ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={[styles.scopeChipText, { color: isOverall ? '#FFFFFF' : colors.text }]}>
              Overall Monthly Limit
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsOverall(false)}
            style={[
              styles.scopeChip,
              {
                backgroundColor: !isOverall ? colors.primary : colors.surfaceVariant,
                borderColor: !isOverall ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={[styles.scopeChipText, { color: !isOverall ? '#FFFFFF' : colors.text }]}>
              Category Specific
            </Text>
          </TouchableOpacity>
        </View>

        {/* Category List if Category Specific */}
        {!isOverall && (
          <>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>SELECT EXPENSE CATEGORY</Text>
            <View style={styles.categoriesGrid}>
              {categories.map((c) => {
                const isSelected = selectedCategoryId === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setSelectedCategoryId(c.id)}
                    style={[
                      styles.categoryItem,
                      {
                        backgroundColor: isSelected ? c.color : colors.surfaceVariant,
                        borderColor: isSelected ? c.color : colors.border,
                      },
                    ]}
                  >
                    {getCategoryIcon(c.icon, 18, isSelected ? '#FFFFFF' : c.color)}
                    <Text
                      style={[
                        styles.categoryItemText,
                        { color: isSelected ? '#FFFFFF' : colors.text },
                      ]}
                      numberOfLines={1}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Amount Input */}
        <Input
          label="Spending Limit (INR ₹)"
          value={amountStr}
          onChangeText={(t) => setAmountStr(sanitizeAmountInput(t))}
          keyboardType="decimal-pad"
          prefix="₹"
          placeholder="e.g. 25000"
          containerStyle={{ marginTop: 12 }}
        />

        <Button
          title="Save Budget Limit"
          onPress={handleSave}
          loading={saving}
          style={{ marginTop: 16 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 6,
  },
  periodToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  periodBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scopeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  scopeChip: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  scopeChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryItem: {
    width: '31%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  categoryItemText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

