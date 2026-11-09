import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import {
  addTransaction,
  updateTransaction,
  getTransactionById,
} from '../../database/transactionsRepo';
import { getAllCategories } from '../../database/categoriesRepo';
import { getAllWallets } from '../../database/walletsRepo';
import { Category, Wallet, TransactionType, Transaction } from '../../types';
import { formatINR, rupeesToPaise, paiseToRupees, sanitizeAmountInput } from '../../utils/currency';
import { nowISO, formatDate } from '../../utils/date';
import { getCategoryIcon } from '../../utils/iconMap';
import { PAYMENT_METHODS } from '../../constants/defaultData';
import { useTheme } from '../../theme/ThemeContext';
import { Header } from '../../components/common/Header';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import {
  Camera,
  Image as ImageIcon,
  Check,
  Calendar,
  X,
  Sparkles,
} from 'lucide-react-native';

export const AddEditTransactionModal: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const transactionId = route.params?.transactionId;
  const defaultType = route.params?.defaultType || 'expense';
  const prefilledReceipt = route.params?.prefilledReceipt;

  const [type, setType] = useState<TransactionType>(defaultType);
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [walletId, setWalletId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [dateStr, setDateStr] = useState(nowISO());
  const [receiptUri, setReceiptUri] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function init() {
      const [cats, wls] = await Promise.all([
        getAllCategories(),
        getAllWallets(),
      ]);
      setCategories(cats);
      setWallets(wls);

      if (transactionId) {
        const tx = await getTransactionById(transactionId);
        if (tx) {
          setType(tx.type);
          setAmountStr((tx.amount_paise / 100).toString());
          setDescription(tx.description || '');
          setCategoryId(tx.category_id);
          setWalletId(tx.wallet_id);
          setPaymentMethod(tx.payment_method);
          setDateStr(tx.date);
          setReceiptUri(tx.receipt_uri || null);
        }
      } else if (prefilledReceipt) {
        setType('expense');
        setAmountStr(prefilledReceipt.amountRupeesStr || '');
        setDescription(prefilledReceipt.description || '');
        if (prefilledReceipt.suggestedCategoryId) {
          setCategoryId(prefilledReceipt.suggestedCategoryId);
        }
        if (prefilledReceipt.dateStr) {
          setDateStr(prefilledReceipt.dateStr);
        }
        if (prefilledReceipt.receiptUri) {
          setReceiptUri(prefilledReceipt.receiptUri);
        }
        const defaultW = wls.find((w) => w.is_default === 1) || wls[0];
        if (defaultW) setWalletId(defaultW.id);
      } else {
        const defaultW = wls.find((w) => w.is_default === 1) || wls[0];
        if (defaultW) setWalletId(defaultW.id);
        const filteredCats = cats.filter((c) => c.type === defaultType);
        if (filteredCats.length > 0) setCategoryId(filteredCats[0].id);
      }
    }
    init();
  }, [transactionId, prefilledReceipt]);

  const activeCategories = categories.filter((c) => c.type === type);

  const handleQuickAddAmount = (addRupees: number) => {
    const current = parseFloat(amountStr) || 0;
    setAmountStr((current + addRupees).toString());
  };

  const handlePickReceipt = async (fromCamera: boolean) => {
    try {
      let result;
      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera permission is required to capture receipts.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          quality: 0.8,
          allowsEditing: true,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Gallery permission is required to select receipts.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          quality: 0.8,
          allowsEditing: true,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setReceiptUri(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('Image Error', err.message || 'Failed to select image.');
    }
  };

  const handleSave = async () => {
    const paise = rupeesToPaise(amountStr);
    if (paise <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than zero.');
      return;
    }
    if (!categoryId) {
      Alert.alert('Category Required', 'Please select a category for this transaction.');
      return;
    }
    if (!walletId) {
      Alert.alert('Wallet Required', 'Please select a wallet.');
      return;
    }

    setSaving(true);
    try {
      if (transactionId) {
        await updateTransaction({
          id: transactionId,
          type,
          amount_paise: paise,
          category_id: categoryId,
          wallet_id: walletId,
          date: dateStr,
          description: description.trim(),
          payment_method: paymentMethod,
          receipt_uri: receiptUri,
          created_at: '',
          updated_at: '',
        });
      } else {
        const newId = 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        await addTransaction({
          id: newId,
          type,
          amount_paise: paise,
          category_id: categoryId,
          wallet_id: walletId,
          date: dateStr,
          description: description.trim(),
          payment_method: paymentMethod,
          receipt_uri: receiptUri,
        });
      }
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Error occurred while saving transaction.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={transactionId ? 'Edit Transaction' : 'Add Transaction'}
        onBack={() => navigation.goBack()}
        rightAction={
          !transactionId && (
            <TouchableOpacity
              onPress={() => navigation.navigate('ReceiptScannerModal')}
              style={[styles.scanReceiptHeaderBtn, { backgroundColor: colors.primaryLight }]}
            >
              <Sparkles size={16} color={colors.primary} />
              <Text style={[styles.scanReceiptText, { color: colors.primary }]}>Scan Receipt</Text>
            </TouchableOpacity>
          )
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Income / Expense Toggle */}
        <View style={[styles.typeToggle, { backgroundColor: colors.surfaceVariant }]}>
          <TouchableOpacity
            onPress={() => {
              setType('expense');
              const exCats = categories.filter((c) => c.type === 'expense');
              if (exCats.length > 0) setCategoryId(exCats[0].id);
            }}
            style={[
              styles.typeButton,
              type === 'expense' && { backgroundColor: colors.expense },
            ]}
          >
            <Text
              style={[
                styles.typeButtonText,
                { color: type === 'expense' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              EXPENSE
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setType('income');
              const incCats = categories.filter((c) => c.type === 'income');
              if (incCats.length > 0) setCategoryId(incCats[0].id);
            }}
            style={[
              styles.typeButton,
              type === 'income' && { backgroundColor: colors.income },
            ]}
          >
            <Text
              style={[
                styles.typeButtonText,
                { color: type === 'income' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              INCOME
            </Text>
          </TouchableOpacity>
        </View>

        {/* Amount Input */}
        <View style={[styles.amountCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>ENTER AMOUNT</Text>
          <View style={styles.amountInputRow}>
            <Text style={[styles.currencyPrefix, { color: type === 'income' ? colors.income : colors.expense }]}>
              ₹
            </Text>
            <Input
              value={amountStr}
              onChangeText={(t) => setAmountStr(sanitizeAmountInput(t))}
              keyboardType="decimal-pad"
              placeholder="0.00"
              style={[styles.bigAmountInput, { color: colors.text }]}
              containerStyle={{ marginBottom: 0, flex: 1 }}
            />
          </View>

          {/* Quick Amount Increment Chips */}
          <View style={styles.quickChipsRow}>
            {[100, 500, 1000, 2000, 5000].map((val) => (
              <TouchableOpacity
                key={val}
                onPress={() => handleQuickAddAmount(val)}
                style={[styles.quickChip, { backgroundColor: colors.surfaceVariant }]}
              >
                <Text style={[styles.quickChipText, { color: colors.text }]}>+₹{val}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Category Selector Grid */}
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>SELECT CATEGORY</Text>
        <View style={styles.categoriesGrid}>
          {activeCategories.map((c) => {
            const isSelected = categoryId === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => setCategoryId(c.id)}
                style={[
                  styles.categoryItem,
                  {
                    backgroundColor: isSelected ? c.color : colors.surfaceVariant,
                    borderColor: isSelected ? c.color : colors.border,
                  },
                ]}
              >
                {getCategoryIcon(c.icon, 20, isSelected ? '#FFFFFF' : c.color)}
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

        {/* Wallet Selector */}
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>SELECT WALLET / ACCOUNT</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.walletsScroll}>
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
                <Text
                  style={[
                    styles.walletChipText,
                    { color: isSelected ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {w.name}
                </Text>
                <Text
                  style={[
                    styles.walletChipSub,
                    { color: isSelected ? '#E0E7FF' : colors.textSecondary },
                  ]}
                >
                  {formatINR(w.balance_paise)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Payment Method */}
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>PAYMENT METHOD</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.walletsScroll}>
          {PAYMENT_METHODS.map((pm) => {
            const isSelected = paymentMethod === pm;
            return (
              <TouchableOpacity
                key={pm}
                onPress={() => setPaymentMethod(pm)}
                style={[
                  styles.pmChip,
                  {
                    backgroundColor: isSelected ? colors.primaryLight : colors.surfaceVariant,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pmChipText,
                    { color: isSelected ? colors.primary : colors.text },
                  ]}
                >
                  {pm}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Description Input */}
        <Input
          label="Description / Note"
          placeholder="e.g. Dinner with team, Grocery shopping..."
          value={description}
          onChangeText={setDescription}
        />

        {/* Receipt Attachment Preview */}
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>ATTACH RECEIPT (OPTIONAL)</Text>
        {receiptUri ? (
          <View style={styles.receiptPreviewContainer}>
            <Image source={{ uri: receiptUri }} style={styles.receiptPreviewImage} />
            <TouchableOpacity
              onPress={() => setReceiptUri(null)}
              style={styles.removeReceiptBtn}
            >
              <X size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.receiptButtonsRow}>
            <Button
              title="Camera"
              variant="outline"
              size="sm"
              icon={<Camera size={16} color={colors.primary} />}
              onPress={() => handlePickReceipt(true)}
              style={{ flex: 1 }}
            />
            <Button
              title="Gallery"
              variant="outline"
              size="sm"
              icon={<ImageIcon size={16} color={colors.primary} />}
              onPress={() => handlePickReceipt(false)}
              style={{ flex: 1 }}
            />
          </View>
        )}

        {/* Save Button */}
        <Button
          title={transactionId ? 'Update Transaction' : 'Save Transaction'}
          onPress={handleSave}
          loading={saving}
          style={{ marginTop: 20, marginBottom: 40 }}
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
  scanReceiptHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  scanReceiptText: {
    fontSize: 12,
    fontWeight: '700',
  },
  typeToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  amountCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyPrefix: {
    fontSize: 28,
    fontWeight: '800',
    marginRight: 6,
  },
  bigAmountInput: {
    fontSize: 28,
    fontWeight: '800',
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingVertical: 4,
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 6,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  categoryItem: {
    width: '31%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  categoryItemText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  walletsScroll: {
    marginBottom: 14,
  },
  walletChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
  },
  walletChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  walletChipSub: {
    fontSize: 11,
    marginTop: 2,
  },
  pmChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
  },
  pmChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  receiptButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  receiptPreviewContainer: {
    position: 'relative',
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 14,
  },
  receiptPreviewImage: {
    width: '100%',
    height: '100%',
  },
  removeReceiptBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 14,
    padding: 6,
  },
});

