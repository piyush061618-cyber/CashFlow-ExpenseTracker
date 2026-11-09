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
import { useNavigation } from '@react-navigation/native';
import { createRecurring } from '../../database/recurringRepo';
import { getAllCategories } from '../../database/categoriesRepo';
import { getAllWallets } from '../../database/walletsRepo';
import { Category, Wallet, RecurringFrequency, TransactionType } from '../../types';
import { rupeesToPaise, sanitizeAmountInput } from '../../utils/currency';
import { nowISO } from '../../utils/date';
import { getCategoryIcon } from '../../utils/iconMap';
import { useTheme } from '../../theme/ThemeContext';
import { Header } from '../../components/common/Header';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

export const AddEditRecurringModal: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  const [type, setType] = useState<TransactionType>('expense');
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [categoryId, setCategoryId] = useState('');
  const [walletId, setWalletId] = useState('');
  const [startDate, setStartDate] = useState(nowISO().substring(0, 10));
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [cats, wls] = await Promise.all([
        getAllCategories(),
        getAllWallets(),
      ]);
      setCategories(cats);
      setWallets(wls);
      const filtered = cats.filter((c) => c.type === type);
      if (filtered.length > 0) setCategoryId(filtered[0].id);
      if (wls.length > 0) setWalletId(wls[0].id);
    }
    load();
  }, [type]);

  const handleSave = async () => {
    if (!description.trim()) {
      Alert.alert('Description Required', 'Please enter a description for this recurring rule.');
      return;
    }
    const paise = rupeesToPaise(amountStr);
    if (paise <= 0) {
      Alert.alert('Invalid Amount', 'Please enter an amount greater than zero.');
      return;
    }
    if (!categoryId) {
      Alert.alert('Category Required', 'Please select a category.');
      return;
    }
    if (!walletId) {
      Alert.alert('Wallet Required', 'Please select a wallet.');
      return;
    }

    setSaving(true);
    try {
      const newId = 'rec_' + Date.now();
      const startIso = `${startDate}T10:00:00.000`;
      await createRecurring({
        id: newId,
        type,
        amount_paise: paise,
        category_id: categoryId,
        wallet_id: walletId,
        description: description.trim(),
        frequency,
        start_date: startIso,
        next_due_date: startIso,
        is_active: 1,
      });
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Error occurred while saving recurring rule.');
    } finally {
      setSaving(false);
    }
  };

  const activeCategories = categories.filter((c) => c.type === type);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <Header title="New Recurring Rule" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Type Toggle */}
        <View style={[styles.typeToggle, { backgroundColor: colors.surfaceVariant }]}>
          <TouchableOpacity
            onPress={() => setType('expense')}
            style={[styles.typeBtn, type === 'expense' && { backgroundColor: colors.expense }]}
          >
            <Text style={[styles.typeBtnText, { color: type === 'expense' ? '#FFFFFF' : colors.text }]}>
              RECURRING EXPENSE
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setType('income')}
            style={[styles.typeBtn, type === 'income' && { backgroundColor: colors.income }]}
          >
            <Text style={[styles.typeBtnText, { color: type === 'income' ? '#FFFFFF' : colors.text }]}>
              RECURRING INCOME
            </Text>
          </TouchableOpacity>
        </View>

        <Input
          label="Rule Description / Title"
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. Monthly House Rent, Netflix 4K, Internet Bill"
        />

        <Input
          label="Amount (INR ₹)"
          value={amountStr}
          onChangeText={(t) => setAmountStr(sanitizeAmountInput(t))}
          keyboardType="decimal-pad"
          prefix="₹"
          placeholder="0.00"
        />

        {/* Frequency Chips */}
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>FREQUENCY</Text>
        <View style={styles.freqRow}>
          {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((f) => {
            const isSelected = frequency === f;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setFrequency(f)}
                style={[
                  styles.freqChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surfaceVariant,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.freqChipText,
                    { color: isSelected ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {f.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Start Date */}
        <Input
          label="Start Date (YYYY-MM-DD)"
          value={startDate}
          onChangeText={setStartDate}
          placeholder="2026-11-09"
        />

        {/* Categories */}
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>SELECT CATEGORY</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          {activeCategories.map((c) => {
            const isSelected = categoryId === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => setCategoryId(c.id)}
                style={[
                  styles.catChip,
                  {
                    backgroundColor: isSelected ? c.color : colors.card,
                    borderColor: isSelected ? c.color : colors.border,
                  },
                ]}
              >
                {getCategoryIcon(c.icon, 16, isSelected ? '#FFFFFF' : c.color)}
                <Text style={[styles.catChipText, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Wallets */}
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>SELECT WALLET</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          {wallets.map((w) => {
            const isSelected = walletId === w.id;
            return (
              <TouchableOpacity
                key={w.id}
                onPress={() => setWalletId(w.id)}
                style={[
                  styles.walletChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.walletChipText, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                  {w.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Button
          title="Save Recurring Rule"
          onPress={handleSave}
          loading={saving}
          style={{ marginTop: 20 }}
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
  typeToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  typeBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 6,
  },
  freqRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  freqChip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  freqChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  horizontalScroll: {
    marginBottom: 14,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
    marginRight: 8,
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  walletChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
  },
  walletChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

