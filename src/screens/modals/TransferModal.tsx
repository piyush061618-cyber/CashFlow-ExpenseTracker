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
import { getAllWallets, transferFunds } from '../../database/walletsRepo';
import { Wallet } from '../../types';
import { formatINR, rupeesToPaise, sanitizeAmountInput } from '../../utils/currency';
import { useTheme } from '../../theme/ThemeContext';
import { Header } from '../../components/common/Header';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { ArrowDown, ArrowRightLeft, ShieldCheck } from 'lucide-react-native';

export const TransferModal: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [fromWalletId, setFromWalletId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [notes, setNotes] = useState('');
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    async function load() {
      const list = await getAllWallets();
      setWallets(list);
      if (list.length >= 2) {
        setFromWalletId(list[0].id);
        setToWalletId(list[1].id);
      }
    }
    load();
  }, []);

  const handleTransfer = async () => {
    const paise = rupeesToPaise(amountStr);
    if (paise <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a transfer amount greater than zero.');
      return;
    }
    if (fromWalletId === toWalletId) {
      Alert.alert('Select Different Wallets', 'Source and destination wallets must be different.');
      return;
    }

    setTransferring(true);
    try {
      await transferFunds(fromWalletId, toWalletId, paise, notes.trim());
      Alert.alert(
        'Transfer Complete',
        `Transferred ${formatINR(paise)} successfully! (Transfers do not affect income or expense totals).`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      Alert.alert('Transfer Error', err.message || 'Failed to complete transfer.');
    } finally {
      setTransferring(false);
    }
  };

  const fromWallet = wallets.find((w) => w.id === fromWalletId);
  const toWallet = wallets.find((w) => w.id === toWalletId);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <Header title="Transfer Between Wallets" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Accounting Rule Notice */}
        <View style={[styles.noticeBox, { backgroundColor: colors.infoBg, borderColor: colors.info }]}>
          <ShieldCheck size={18} color={colors.info} />
          <Text style={[styles.noticeText, { color: colors.text }]}>
            Transfers between your own wallets correctly move funds between accounts without altering your income or expense reports.
          </Text>
        </View>

        {/* Source Wallet (From) */}
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>SOURCE WALLET (FROM)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.walletsScroll}>
          {wallets.map((w) => {
            const isSelected = fromWalletId === w.id;
            return (
              <TouchableOpacity
                key={w.id}
                onPress={() => setFromWalletId(w.id)}
                style={[
                  styles.walletChip,
                  {
                    backgroundColor: isSelected ? colors.expense : colors.card,
                    borderColor: isSelected ? colors.expense : colors.border,
                  },
                ]}
              >
                <Text style={[styles.walletName, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                  {w.name}
                </Text>
                <Text style={[styles.walletBalance, { color: isSelected ? '#FEE2E2' : colors.textSecondary }]}>
                  {formatINR(w.balance_paise)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Visual Transfer Arrow */}
        <View style={styles.arrowContainer}>
          <View style={[styles.arrowCircle, { backgroundColor: colors.surfaceVariant }]}>
            <ArrowDown size={20} color={colors.primary} />
          </View>
        </View>

        {/* Destination Wallet (To) */}
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>DESTINATION WALLET (TO)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.walletsScroll}>
          {wallets.map((w) => {
            const isSelected = toWalletId === w.id;
            return (
              <TouchableOpacity
                key={w.id}
                onPress={() => setToWalletId(w.id)}
                style={[
                  styles.walletChip,
                  {
                    backgroundColor: isSelected ? colors.income : colors.card,
                    borderColor: isSelected ? colors.income : colors.border,
                  },
                ]}
              >
                <Text style={[styles.walletName, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                  {w.name}
                </Text>
                <Text style={[styles.walletBalance, { color: isSelected ? '#DCFCE7' : colors.textSecondary }]}>
                  {formatINR(w.balance_paise)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Amount Input */}
        <Input
          label="Transfer Amount"
          value={amountStr}
          onChangeText={(t) => setAmountStr(sanitizeAmountInput(t))}
          keyboardType="decimal-pad"
          prefix="₹"
          placeholder="0.00"
          containerStyle={{ marginTop: 12 }}
        />

        {/* Notes */}
        <Input
          label="Transfer Note (Optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="e.g. ATM withdrawal, Credit card payment, Moving to savings"
        />

        <Button
          title="Confirm & Execute Transfer"
          onPress={handleTransfer}
          loading={transferring}
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
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginBottom: 20,
  },
  noticeText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  walletsScroll: {
    marginBottom: 10,
  },
  walletChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 10,
  },
  walletName: {
    fontSize: 14,
    fontWeight: '700',
  },
  walletBalance: {
    fontSize: 12,
    marginTop: 2,
  },
  arrowContainer: {
    alignItems: 'center',
    marginVertical: 4,
  },
  arrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

