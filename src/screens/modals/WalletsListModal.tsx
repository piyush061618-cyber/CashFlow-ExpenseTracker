import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getAllWallets, deleteWallet, getNetAvailableBalance } from '../../database/walletsRepo';
import { Wallet } from '../../types';
import { formatINR } from '../../utils/currency';
import { useTheme } from '../../theme/ThemeContext';
import { Header } from '../../components/common/Header';
import { Button } from '../../components/common/Button';
import { WalletCard } from '../../components/wallets/WalletCard';
import { Card } from '../../components/common/Card';
import { Plus, ArrowRightLeft, ShieldAlert } from 'lucide-react-native';

export const WalletsListModal: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [balanceSummary, setBalanceSummary] = useState({
    totalAvailablePaise: 0,
    totalAssetsPaise: 0,
    totalLiabilitiesPaise: 0,
  });

  const loadWallets = async () => {
    try {
      const [list, sum] = await Promise.all([
        getAllWallets(),
        getNetAvailableBalance(),
      ]);
      setWallets(list);
      setBalanceSummary(sum);
    } catch (err) {
      console.warn('Error loading wallets:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadWallets();
    }, [])
  );

  const handleDelete = (wallet: Wallet) => {
    Alert.alert(
      'Delete Wallet',
      `Are you sure you want to delete "${wallet.name}"? Note: Wallets with existing transaction or transfer records cannot be deleted to preserve financial audit integrity.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteWallet(wallet.id);
            if (!res.success) {
              Alert.alert('Cannot Delete', res.error || 'Wallet is in use.');
            } else {
              await loadWallets();
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <Header
        title="Wallets & Accounts"
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('AddEditWalletModal')}
            style={[styles.addHeaderBtn, { backgroundColor: colors.primaryLight }]}
          >
            <Plus size={16} color={colors.primary} />
            <Text style={[styles.addHeaderText, { color: colors.primary }]}>New Wallet</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Balance Overview Card */}
        <Card style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>NET AVAILABLE CASH</Text>
          <Text style={[styles.summaryAmount, { color: colors.text }]}>
            {formatINR(balanceSummary.totalAvailablePaise)}
          </Text>

          <View style={styles.breakdownRow}>
            <View>
              <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Cash Assets</Text>
              <Text style={[styles.breakdownValue, { color: colors.income }]}>
                {formatINR(balanceSummary.totalAssetsPaise)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View>
              <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Credit Liabilities</Text>
              <Text style={[styles.breakdownValue, { color: colors.expense }]}>
                {formatINR(balanceSummary.totalLiabilitiesPaise)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Transfer Funds Action Button */}
        <Button
          title="Transfer Money Between Wallets"
          variant="outline"
          icon={<ArrowRightLeft size={16} color={colors.primary} />}
          onPress={() => navigation.navigate('TransferModal')}
          style={{ marginBottom: 16 }}
        />

        {/* Wallets List */}
        <Text style={[styles.sectionHeading, { color: colors.text }]}>Your Accounts</Text>
        {wallets.map((w) => (
          <WalletCard
            key={w.id}
            wallet={w}
            onPress={() =>
              Alert.alert(
                w.name,
                `Balance: ${formatINR(w.balance_paise)}\nType: ${w.type.toUpperCase()}`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => handleDelete(w) },
                  {
                    text: 'Edit',
                    onPress: () => navigation.navigate('AddEditWalletModal', { walletId: w.id }),
                  },
                ]
              )
            }
          />
        ))}
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
  summaryCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  summaryAmount: {
    fontSize: 26,
    fontWeight: '800',
    marginVertical: 6,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  breakdownLabel: {
    fontSize: 11,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
});

