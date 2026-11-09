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
import { depositToGoal } from '../../database/goalsRepo';
import { getAllWallets } from '../../database/walletsRepo';
import { Wallet } from '../../types';
import { formatINR, rupeesToPaise, sanitizeAmountInput } from '../../utils/currency';
import { useTheme } from '../../theme/ThemeContext';
import { Header } from '../../components/common/Header';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { ShieldCheck } from 'lucide-react-native';

export const DepositGoalModal: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const goalId = route.params?.goalId;
  const goalTitle = route.params?.goalTitle || 'Savings Goal';

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [depositing, setDepositing] = useState(false);

  useEffect(() => {
    async function load() {
      const list = await getAllWallets();
      // Filter out credit cards as savings source
      const validWallets = list.filter((w) => w.type !== 'credit_card');
      setWallets(validWallets);
      if (validWallets.length > 0) {
        setSelectedWalletId(validWallets[0].id);
      }
    }
    load();
  }, []);

  const handleDeposit = async () => {
    const paise = rupeesToPaise(amountStr);
    if (paise <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid deposit amount.');
      return;
    }
    if (!selectedWalletId) {
      Alert.alert('Wallet Required', 'Please select a source wallet to fund this goal.');
      return;
    }

    setDepositing(true);
    try {
      const res = await depositToGoal(goalId, selectedWalletId, paise);
      Alert.alert(
        res.isCompleted ? '🎉 Goal Achieved!' : 'Deposit Successful',
        `Allocated ${formatINR(paise)} from your wallet towards "${goalTitle}". Balance updated atomically.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      Alert.alert('Deposit Failed', err.message || 'Error occurred during deposit.');
    } finally {
      setDepositing(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <Header title={`Add to: ${goalTitle}`} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.infoBox, { backgroundColor: colors.infoBg, borderColor: colors.info }]}>
          <ShieldCheck size={18} color={colors.info} />
          <Text style={[styles.infoText, { color: colors.text }]}>
            Depositing funds will deduct from your selected account and credit your goal progress without double-counting your net worth.
          </Text>
        </View>

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>SELECT FUNDING WALLET</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.walletsScroll}>
          {wallets.map((w) => {
            const isSelected = selectedWalletId === w.id;
            return (
              <TouchableOpacity
                key={w.id}
                onPress={() => setSelectedWalletId(w.id)}
                style={[
                  styles.walletChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.walletName, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                  {w.name}
                </Text>
                <Text style={[styles.walletBalance, { color: isSelected ? '#E0E7FF' : colors.textSecondary }]}>
                  {formatINR(w.balance_paise)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Input
          label="Deposit Amount (INR ₹)"
          value={amountStr}
          onChangeText={(t) => setAmountStr(sanitizeAmountInput(t))}
          keyboardType="decimal-pad"
          prefix="₹"
          placeholder="e.g. 5000"
          containerStyle={{ marginTop: 12 }}
        />

        <Button
          title="Confirm Deposit"
          onPress={handleDeposit}
          loading={depositing}
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginBottom: 20,
  },
  infoText: {
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
});

