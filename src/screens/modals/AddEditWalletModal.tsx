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
import { createWallet, updateWallet, getWalletById } from '../../database/walletsRepo';
import { Wallet, WalletType } from '../../types';
import { rupeesToPaise, sanitizeAmountInput } from '../../utils/currency';
import { useTheme } from '../../theme/ThemeContext';
import { Header } from '../../components/common/Header';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

const WALLET_TYPES: { type: WalletType; label: string; icon: string; color: string }[] = [
  { type: 'cash', label: 'Cash', icon: 'Banknote', color: '#10B981' },
  { type: 'bank', label: 'Bank Account', icon: 'Building2', color: '#3B82F6' },
  { type: 'savings', label: 'Savings Account', icon: 'PiggyBank', color: '#8B5CF6' },
  { type: 'upi', label: 'UPI / Digital App', icon: 'QrCode', color: '#06B6D4' },
  { type: 'credit_card', label: 'Credit Card', icon: 'CreditCard', color: '#EF4444' },
  { type: 'digital_wallet', label: 'Digital Wallet', icon: 'Wallet', color: '#F59E0B' },
];

export const AddEditWalletModal: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const walletId = route.params?.walletId;

  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState<WalletType>('bank');
  const [balanceStr, setBalanceStr] = useState('0');
  const [creditLimitStr, setCreditLimitStr] = useState('50000');
  const [color, setColor] = useState('#3B82F6');
  const [icon, setIcon] = useState('Building2');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      if (walletId) {
        const w = await getWalletById(walletId);
        if (w) {
          setName(w.name);
          setSelectedType(w.type);
          setBalanceStr((w.balance_paise / 100).toString());
          if (w.credit_limit_paise) {
            setCreditLimitStr((w.credit_limit_paise / 100).toString());
          }
          setColor(w.color);
          setIcon(w.icon);
        }
      }
    }
    load();
  }, [walletId]);

  const handleSelectType = (item: (typeof WALLET_TYPES)[0]) => {
    setSelectedType(item.type);
    setColor(item.color);
    setIcon(item.icon);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter a name for the account/wallet.');
      return;
    }

    const balancePaise = rupeesToPaise(balanceStr);
    const creditLimitPaise = selectedType === 'credit_card' ? rupeesToPaise(creditLimitStr) : 0;

    setSaving(true);
    try {
      if (walletId) {
        await updateWallet({
          id: walletId,
          name: name.trim(),
          type: selectedType,
          balance_paise: balancePaise,
          credit_limit_paise: creditLimitPaise,
          color,
          icon,
          is_default: 0,
          created_at: '',
          updated_at: '',
        });
      } else {
        const newId = 'wallet_' + Date.now();
        await createWallet({
          id: newId,
          name: name.trim(),
          type: selectedType,
          balance_paise: balancePaise,
          credit_limit_paise: creditLimitPaise,
          color,
          icon,
          is_default: 0,
        });
      }
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Error occurred while saving wallet.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <Header
        title={walletId ? 'Edit Account' : 'Add New Account'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Account Type Selector */}
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>ACCOUNT TYPE</Text>
        <View style={styles.typesGrid}>
          {WALLET_TYPES.map((t) => {
            const isSelected = selectedType === t.type;
            return (
              <TouchableOpacity
                key={t.type}
                onPress={() => handleSelectType(t)}
                style={[
                  styles.typeChip,
                  {
                    backgroundColor: isSelected ? t.color : colors.surfaceVariant,
                    borderColor: isSelected ? t.color : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    { color: isSelected ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Name */}
        <Input
          label="Account / Wallet Name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. HDFC Bank, ICICI Salary, Paytm UPI..."
        />

        {/* Initial Balance */}
        <Input
          label={selectedType === 'credit_card' ? 'Current Outstanding Due (Liability)' : 'Current Balance'}
          value={balanceStr}
          onChangeText={(t) => setBalanceStr(sanitizeAmountInput(t))}
          keyboardType="decimal-pad"
          prefix="₹"
          placeholder="0.00"
        />

        {selectedType === 'credit_card' && (
          <Input
            label="Total Credit Limit"
            value={creditLimitStr}
            onChangeText={(t) => setCreditLimitStr(sanitizeAmountInput(t))}
            keyboardType="decimal-pad"
            prefix="₹"
            placeholder="50000"
          />
        )}

        <Button
          title={walletId ? 'Update Account' : 'Save Account'}
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
  },
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

