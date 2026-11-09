import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  getAllRecurring,
  toggleRecurringActive,
  deleteRecurring,
  processDueRecurringTransactions,
} from '../../database/recurringRepo';
import { RecurringTransaction } from '../../types';
import { formatINR } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { useTheme } from '../../theme/ThemeContext';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { Plus, Repeat, Calendar, Play, Pause } from 'lucide-react-native';

export const RecurringListModal: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  const [recurringList, setRecurringList] = useState<RecurringTransaction[]>([]);

  const loadRecurring = async () => {
    try {
      await processDueRecurringTransactions();
      const list = await getAllRecurring();
      setRecurringList(list);
    } catch (err) {
      console.warn('Error loading recurring items:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadRecurring();
    }, [])
  );

  const handleToggle = async (item: RecurringTransaction) => {
    const newActive = item.is_active === 1 ? 0 : 1;
    await toggleRecurringActive(item.id, newActive === 1);
    await loadRecurring();
  };

  const handleDelete = (item: RecurringTransaction) => {
    Alert.alert(
      'Cancel Recurring Schedule',
      `Cancel recurring schedule for "${item.description}"?`,
      [
        { text: 'Back', style: 'cancel' },
        {
          text: 'Cancel Schedule',
          style: 'destructive',
          onPress: async () => {
            await deleteRecurring(item.id);
            await loadRecurring();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <Header
        title="Recurring Transactions"
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('AddEditRecurringModal')}
            style={[styles.addHeaderBtn, { backgroundColor: colors.primaryLight }]}
          >
            <Plus size={16} color={colors.primary} />
            <Text style={[styles.addHeaderText, { color: colors.primary }]}>New Rule</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {recurringList.length === 0 ? (
          <EmptyState
            icon={<Repeat size={40} color={colors.primary} />}
            title="No Recurring Rules Set"
            description="Automate your fixed bills, salaries, electricity, internet, or Netflix subscriptions so you never miss an entry."
            actionTitle="+ Create Recurring Rule"
            onAction={() => navigation.navigate('AddEditRecurringModal')}
          />
        ) : (
          recurringList.map((item) => {
            const isIncome = item.type === 'income';
            const isActive = item.is_active === 1;

            return (
              <Card key={item.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.left}>
                    <View
                      style={[
                        styles.iconBox,
                        { backgroundColor: isIncome ? colors.incomeBg : colors.expenseBg },
                      ]}
                    >
                      <Repeat size={18} color={isIncome ? colors.income : colors.expense} />
                    </View>
                    <View>
                      <Text style={[styles.title, { color: colors.text }]}>{item.description}</Text>
                      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        {item.category_name || 'Category'} • {item.wallet_name || 'Wallet'}
                      </Text>
                    </View>
                  </View>

                  <Switch
                    value={isActive}
                    onValueChange={() => handleToggle(item)}
                    trackColor={{ false: colors.border, true: colors.primary }}
                  />
                </View>

                <View style={styles.footerRow}>
                  <View>
                    <Text style={[styles.freqTag, { color: colors.primary }]}>
                      {item.frequency.toUpperCase()}
                    </Text>
                    <Text style={[styles.nextDue, { color: colors.textSecondary }]}>
                      Next Due: {formatDate(item.next_due_date)}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={[
                        styles.amount,
                        { color: isIncome ? colors.income : colors.expense },
                      ]}
                    >
                      {isIncome ? '+' : '-'}
                      {formatINR(item.amount_paise)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleDelete(item)}
                      style={styles.cancelBtn}
                    >
                      <Text style={[styles.cancelBtnText, { color: colors.expense }]}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            );
          })
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
    padding: 16,
    paddingBottom: 40,
  },
  addHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  addHeaderText: {
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    marginBottom: 12,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  freqTag: {
    fontSize: 11,
    fontWeight: '700',
  },
  nextDue: {
    fontSize: 11,
    marginTop: 2,
  },
  amount: {
    fontSize: 16,
    fontWeight: '800',
  },
  cancelBtn: {
    marginTop: 4,
  },
  cancelBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

