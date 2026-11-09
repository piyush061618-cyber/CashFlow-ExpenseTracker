import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getFilteredTransactions, deleteTransaction } from '../database/transactionsRepo';
import { getAllCategories } from '../database/categoriesRepo';
import { getAllWallets } from '../database/walletsRepo';
import { subscribeDataChanged } from '../utils/dataEvents';
import { Transaction, Category, Wallet, TransactionFilter } from '../types';
import { formatINR } from '../utils/currency';
import { getDateGroupHeader } from '../utils/date';
import { useTheme } from '../theme/ThemeContext';
import { TransactionItem } from '../components/transactions/TransactionItem';
import { EmptyState } from '../components/common/EmptyState';
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  Plus,
  Receipt,
  Trash2,
} from 'lucide-react-native';

export const TransactionsScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  const loadData = async () => {
    try {
      const [txs, cats, wls] = await Promise.all([
        getFilteredTransactions({
          type: selectedType,
          searchQuery,
          sortBy,
        }),
        getAllCategories(),
        getAllWallets(),
      ]);
      setTransactions(txs);
      setCategories(cats);
      setWallets(wls);
    } catch (err) {
      console.warn('Error loading transactions:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [selectedType, searchQuery, sortBy])
  );

  const handleDelete = (id: string, description: string) => {
    Alert.alert(
      'Delete Transaction',
      `Are you sure you want to delete "${description}"? This will automatically restore your wallet balance.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTransaction(id);
            await loadData();
          },
        },
      ]
    );
  };

  // Group transactions by date
  const groupedData = useMemo(() => {
    const groups: { [header: string]: { dateStr: string; items: Transaction[]; totalPaise: number } } = {};

    transactions.forEach((tx) => {
      const header = getDateGroupHeader(tx.date);
      if (!groups[header]) {
        groups[header] = { dateStr: header, items: [], totalPaise: 0 };
      }
      groups[header].items.push(tx);
      if (tx.type === 'expense') {
        groups[header].totalPaise += tx.amount_paise;
      }
    });

    return Object.keys(groups).map((header) => ({
      header,
      items: groups[header].items,
      totalPaise: groups[header].totalPaise,
    }));
  }, [transactions]);

  const insets = useSafeAreaInsets();

  useEffect(() => {
    const unsub = subscribeDataChanged(() => {
      loadData();
    });
    return unsub;
  }, []);

  const cycleSortOrder = () => {
    if (sortBy === 'newest') setSortBy('highest');
    else if (sortBy === 'highest') setSortBy('lowest');
    else if (sortBy === 'lowest') setSortBy('oldest');
    else setSortBy('newest');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Search and Filter Bar */}
      <View style={[styles.searchSection, { backgroundColor: colors.surface }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}>
          <Search size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search notes, categories..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={cycleSortOrder}
          style={[styles.sortButton, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
        >
          <ArrowUpDown size={16} color={colors.primary} />
          <Text style={[styles.sortButtonText, { color: colors.primary }]}>
            {sortBy.toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Type Selector Tabs */}
      <View style={[styles.tabsRow, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        {(['all', 'expense', 'income'] as const).map((t) => {
          const isSelected = selectedType === t;
          return (
            <TouchableOpacity
              key={t}
              onPress={() => setSelectedType(t)}
              style={[
                styles.tabButton,
                isSelected && { borderBottomColor: colors.primary, borderBottomWidth: 3 },
              ]}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  {
                    color: isSelected ? colors.primary : colors.textSecondary,
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}
              >
                {t.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Transaction List */}
      <FlatList
        data={groupedData}
        keyExtractor={(item) => item.header}
        contentContainerStyle={[styles.listContent, { paddingBottom: 90 + insets.bottom }]}
        ListEmptyComponent={
          <EmptyState
            icon={<Receipt size={40} color={colors.primary} />}
            title="No Transactions Found"
            description="No transactions match your current search and filter criteria."
            actionTitle="+ New Transaction"
            onAction={() => navigation.navigate('AddEditTransactionModal')}
          />
        }
        renderItem={({ item: group }) => (
          <View style={styles.groupContainer}>
            {/* Date Group Header */}
            <View style={styles.groupHeaderRow}>
              <Text style={[styles.groupDateText, { color: colors.textSecondary }]}>
                {group.header}
              </Text>
              {group.totalPaise > 0 && (
                <Text style={[styles.groupTotalText, { color: colors.expense }]}>
                  Spent: {formatINR(group.totalPaise)}
                </Text>
              )}
            </View>

            {/* Group Transactions */}
            <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {group.items.map((tx) => (
                <TransactionItem
                  key={tx.id}
                  transaction={tx}
                  onPress={() =>
                    Alert.alert(
                      tx.description || tx.category_name || 'Transaction Details',
                      `Amount: ${formatINR(tx.amount_paise)}\nCategory: ${tx.category_name}\nWallet: ${tx.wallet_name}\nDate: ${tx.date.substring(0, 10)}`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => handleDelete(tx.id, tx.description || tx.category_name || ''),
                        },
                        {
                          text: 'Edit',
                          onPress: () =>
                            navigation.navigate('AddEditTransactionModal', { transactionId: tx.id }),
                        },
                      ]
                    )
                  }
                />
              ))}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    height: 42,
  },
  sortButtonText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  tabButtonText: {
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 90,
  },
  groupContainer: {
    marginBottom: 16,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  groupDateText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  groupTotalText: {
    fontSize: 12,
    fontWeight: '600',
  },
  groupCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
});

