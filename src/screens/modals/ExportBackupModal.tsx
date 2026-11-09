import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import {
  createBackupArchive,
  exportBackupToExternal,
  listLocalBackups,
  deleteLocalBackup,
  validateBackupPayload,
  restoreFromValidatedPayload,
  BackupHistoryItem,
  BackupRecordCounts,
} from '../../services/backupService';
import { getSetting, setSetting } from '../../database/settingsRepo';
import { getFilteredTransactions, getFinancialSummary, getCategoryBreakdown } from '../../database/transactionsRepo';
import { exportTransactionsToCSV, exportFinancialReportToPDF } from '../../utils/export';
import { getMonthRange, formatDisplayDate } from '../../utils/date';
import { notifyDataChanged } from '../../utils/dataEvents';
import { useTheme } from '../../theme/ThemeContext';
import { Header } from '../../components/common/Header';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import {
  Download,
  Upload,
  FileText,
  Database,
  Trash2,
  Share2,
  Lock,
  ShieldCheck,
  Clock,
  HardDrive,
  CheckCircle2,
  RefreshCw,
  FolderOpen,
} from 'lucide-react-native';

export const ExportBackupModal: React.FC = () => {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [loading, setLoading] = useState(false);
  const [backups, setBackups] = useState<BackupHistoryItem[]>([]);
  const [lastBackupDate, setLastBackupDate] = useState<string>('');
  const [lastBackupSize, setLastBackupSize] = useState<number>(0);
  const [autoFrequency, setAutoFrequency] = useState<string>('manual');

  // Encryption modal state for creating backup
  const [showEncryptModal, setShowEncryptModal] = useState(false);
  const [encryptPassword, setEncryptPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [encryptEnabled, setEncryptEnabled] = useState(false);

  // Decryption password prompt modal for restoration
  const [showDecryptModal, setShowDecryptModal] = useState(false);
  const [decryptPassword, setDecryptPassword] = useState('');
  const [pendingRestoreUri, setPendingRestoreUri] = useState<string | null>(null);

  // Restore preview confirmation modal
  const [restorePreview, setRestorePreview] = useState<{
    counts: BackupRecordCounts;
    createdAt: string;
    payloadData: any;
  } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [list, lastDate, lastSize, freq] = await Promise.all([
        listLocalBackups(),
        getSetting<string>('last_backup_date', ''),
        getSetting<number>('last_backup_size', 0),
        getSetting<string>('auto_backup_frequency', 'manual'),
      ]);
      setBackups(list);
      setLastBackupDate(lastDate);
      setLastBackupSize(lastSize);
      setAutoFrequency(freq);
    } catch (err) {
      console.warn('Error loading backup settings:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Export CSV
  const handleExportCSV = async () => {
    setLoading(true);
    try {
      const txs = await getFilteredTransactions();
      await exportTransactionsToCSV(txs);
    } catch (err: any) {
      Alert.alert('CSV Export Error', err.message || 'Failed to export CSV.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Export PDF
  const handleExportPDF = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const monthRange = getMonthRange(now);
      const [sum, cats, txs] = await Promise.all([
        getFinancialSummary(now),
        getCategoryBreakdown(monthRange.start, monthRange.end, 'expense'),
        getFilteredTransactions({ startDate: monthRange.start, endDate: monthRange.end }),
      ]);
      await exportFinancialReportToPDF({
        reportTitle: 'Monthly Financial Audit Statement',
        periodLabel: 'Current Month',
        summary: sum,
        categories: cats,
        transactions: txs,
      });
    } catch (err: any) {
      Alert.alert('PDF Export Error', err.message || 'Failed to generate PDF report.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Create Backup
  const handleStartCreateBackup = () => {
    setEncryptEnabled(false);
    setEncryptPassword('');
    setConfirmPassword('');
    setShowEncryptModal(true);
  };

  const handleConfirmCreateBackup = async () => {
    if (encryptEnabled) {
      if (!encryptPassword.trim()) {
        Alert.alert('Password Required', 'Please enter a password for the encrypted backup.');
        return;
      }
      if (encryptPassword !== confirmPassword) {
        Alert.alert('Password Mismatch', 'The passwords you entered do not match. Please verify.');
        return;
      }
    }

    setShowEncryptModal(false);
    setLoading(true);

    try {
      const res = await createBackupArchive({
        password: encryptEnabled ? encryptPassword.trim() : undefined,
      });

      await loadData();

      Alert.alert(
        'Backup Created Successfully 🎉',
        `File: ${res.fileName}\nSize: ${(res.fileSize / 1024).toFixed(1)} KB\n\nWould you like to export this backup outside the app (Downloads, Google Drive, etc.)?`,
        [
          { text: 'Keep Locally Only', style: 'cancel' },
          {
            text: 'Export / Share Now',
            onPress: async () => {
              try {
                await exportBackupToExternal(res.filePath);
              } catch (e: any) {
                Alert.alert('Export Error', e.message);
              }
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Backup Error', err.message || 'Failed to generate backup.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Pick & Restore from File Picker
  const handlePickDocumentAndRestore = async () => {
    try {
      const doc = await DocumentPicker.getDocumentAsync({
        type: ['application/json', '*/*'],
        copyToCacheDirectory: true,
      });

      if (doc.canceled || !doc.assets || doc.assets.length === 0) {
        return;
      }

      const fileUri = doc.assets[0].uri;
      await processRestoreFile(fileUri);
    } catch (err: any) {
      Alert.alert('File Picker Error', err.message || 'Could not access selected file.');
    }
  };

  // Process restore file (verifies if password is required)
  const processRestoreFile = async (fileUri: string, passwordAttempt?: string) => {
    setLoading(true);
    try {
      const val = await validateBackupPayload(fileUri, passwordAttempt);

      if (val.isEncrypted && !val.isValid && val.error === 'PASSWORD_REQUIRED') {
        // Show Decrypt Password Modal
        setPendingRestoreUri(fileUri);
        setDecryptPassword('');
        setShowDecryptModal(true);
        setLoading(false);
        return;
      }

      if (!val.isValid || !val.payloadData) {
        Alert.alert('Invalid Backup', val.error || 'The selected file could not be verified.');
        setLoading(false);
        return;
      }

      // Valid backup verified! Open confirmation preview
      setRestorePreview({
        counts: val.manifest?.recordCounts || {
          transactions: val.payloadData.transactions?.length || 0,
          wallets: val.payloadData.wallets?.length || 0,
          categories: val.payloadData.categories?.length || 0,
          transfers: val.payloadData.transfers?.length || 0,
          budgets: val.payloadData.budgets?.length || 0,
          savings_goals: val.payloadData.savings_goals?.length || 0,
          recurring_transactions: val.payloadData.recurring_transactions?.length || 0,
          receipt_images: Object.keys(val.payloadData.receiptImages || {}).length,
        },
        createdAt: val.manifest?.createdAt || new Date().toISOString(),
        payloadData: val.payloadData,
      });
    } catch (err: any) {
      Alert.alert('Validation Error', err.message || 'Could not validate backup file.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDecrypt = async () => {
    if (!pendingRestoreUri) return;
    setShowDecryptModal(false);
    await processRestoreFile(pendingRestoreUri, decryptPassword);
  };

  // Execute actual restoration from preview
  const handleExecuteRestore = async () => {
    if (!restorePreview) return;
    const payload = restorePreview.payloadData;
    setRestorePreview(null);
    setLoading(true);

    try {
      const res = await restoreFromValidatedPayload(payload);
      if (res.success) {
        notifyDataChanged();
        await loadData();
        Alert.alert(
          'Restoration Complete 🎉',
          `Restored:\n• ${res.recordCounts?.transactions || 0} Transactions\n• ${res.recordCounts?.wallets || 0} Wallets\n• ${res.recordCounts?.categories || 0} Categories\n• ${res.recordCounts?.budgets || 0} Budgets\n• ${res.recordCounts?.savings_goals || 0} Savings Goals\n• ${res.recordCounts?.receipt_images || 0} Receipt Images\n\nAll financial figures and balances have been refreshed.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Restore Failed', res.message);
      }
    } catch (err: any) {
      Alert.alert('Restore Error', err.message || 'Failed to restore data.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Share Backup from history
  const handleShareHistoryItem = async (item: BackupHistoryItem) => {
    try {
      await exportBackupToExternal(item.uri);
    } catch (e: any) {
      Alert.alert('Export Error', e.message);
    }
  };

  // Handle Delete Backup from history
  const handleDeleteHistoryItem = (item: BackupHistoryItem) => {
    Alert.alert(
      'Delete Backup File',
      `Are you sure you want to delete ${item.filename}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteLocalBackup(item.filename);
            await loadData();
          },
        },
      ]
    );
  };

  // Handle Automatic Backup Frequency change
  const handleChangeAutoFrequency = async (freq: string) => {
    setAutoFrequency(freq);
    await setSetting('auto_backup_frequency', freq);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <Header title="Backup & Restore Hub" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={[styles.statusIconBox, { backgroundColor: lastBackupDate ? '#ECFDF5' : '#FEF3C7' }]}>
              {lastBackupDate ? (
                <CheckCircle2 size={24} color="#10B981" />
              ) : (
                <Clock size={24} color="#F59E0B" />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusTitle, { color: colors.text }]}>
                {lastBackupDate ? 'Protected by Local Backup' : 'No Recent Backup Found'}
              </Text>
              <Text style={[styles.statusSub, { color: colors.textSecondary }]}>
                {lastBackupDate
                  ? `Last created: ${formatDisplayDate(lastBackupDate)} (${(lastBackupSize / 1024).toFixed(1)} KB)`
                  : 'Create a backup to protect your financial records before reinstalling.'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Primary Actions */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>BACKUP & RESTORE ACTIONS</Text>
        <Card style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Save & Recover Financial Data</Text>
          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
            Backups include all income, expenses, custom categories, wallets, transfers, budgets, goals, recurring rules, and receipt photos.
          </Text>

          <Button
            title="Create Backup Now"
            icon={<Database size={18} color="#FFFFFF" />}
            onPress={handleStartCreateBackup}
            loading={loading}
            style={{ marginBottom: 12 }}
          />

          <Button
            title="Restore from File (Picker)"
            variant="outline"
            icon={<FolderOpen size={18} color={colors.primary} />}
            onPress={handlePickDocumentAndRestore}
            loading={loading}
          />
        </Card>

        {/* Automatic Backup Configuration */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>AUTOMATIC BACKUP SCHEDULE</Text>
        <Card style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Schedule Frequency</Text>
          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
            CashFlow can automatically take local snapshots of your data in the background.
          </Text>

          <View style={styles.freqRow}>
            {[
              { id: 'manual', label: 'Manual' },
              { id: 'daily', label: 'Daily' },
              { id: 'weekly', label: 'Weekly' },
              { id: 'monthly', label: 'Monthly' },
            ].map((f) => {
              const isSelected = autoFrequency === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  activeOpacity={0.7}
                  onPress={() => handleChangeAutoFrequency(f.id)}
                  style={[
                    styles.freqButton,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surfaceVariant,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.freqButtonText,
                      { color: isSelected ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Backup History */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          BACKUP HISTORY ({backups.length})
        </Text>
        {backups.length === 0 ? (
          <Card style={styles.emptyCard}>
            <HardDrive size={32} color={colors.textMuted} style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No previous backups stored locally.
            </Text>
          </Card>
        ) : (
          backups.map((b) => (
            <Card key={b.filename} style={styles.historyCard}>
              <View style={styles.historyTopRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.historyFileName, { color: colors.text }]} numberOfLines={1}>
                      {b.filename}
                    </Text>
                    {b.isEncrypted && (
                      <Badge
                        label="AES Encrypted"
                        color={colors.primary}
                        backgroundColor={colors.primaryLight}
                        style={{ marginLeft: 6 }}
                      />
                    )}
                  </View>
                  <Text style={[styles.historyMeta, { color: colors.textSecondary }]}>
                    {formatDisplayDate(b.createdAt)} • {(b.sizeBytes / 1024).toFixed(1)} KB
                  </Text>
                  {b.recordCounts && (
                    <Text style={[styles.historyCounts, { color: colors.textMuted }]}>
                      {b.recordCounts.transactions} txs • {b.recordCounts.wallets} wallets • {b.recordCounts.receipt_images} receipts
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.historyActionsRow}>
                <TouchableOpacity
                  style={[styles.historyActionBtn, { backgroundColor: colors.primaryLight }]}
                  onPress={() => processRestoreFile(b.uri)}
                >
                  <Upload size={14} color={colors.primary} />
                  <Text style={[styles.historyActionText, { color: colors.primary }]}>Restore</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.historyActionBtn, { backgroundColor: colors.surfaceVariant }]}
                  onPress={() => handleShareHistoryItem(b)}
                >
                  <Share2 size={14} color={colors.text} />
                  <Text style={[styles.historyActionText, { color: colors.text }]}>Export</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.historyActionBtn, { backgroundColor: '#FEE2E2' }]}
                  onPress={() => handleDeleteHistoryItem(b)}
                >
                  <Trash2 size={14} color={colors.expense} />
                  <Text style={[styles.historyActionText, { color: colors.expense }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}

        {/* Financial Statements (CSV / PDF) */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 12 }]}>
          EXPORT FINANCIAL STATEMENTS
        </Text>
        <Card style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Spreadsheets & PDF Reports</Text>
          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
            Export your transaction ledger to CSV for Excel / Google Sheets, or generate a formatted audit statement in PDF format.
          </Text>

          <View style={styles.buttonsRow}>
            <Button
              title="Export CSV"
              icon={<Download size={16} color="#FFFFFF" />}
              onPress={handleExportCSV}
              loading={loading}
              style={{ flex: 1 }}
            />
            <Button
              title="Generate PDF"
              variant="outline"
              icon={<FileText size={16} color={colors.primary} />}
              onPress={handleExportPDF}
              loading={loading}
              style={{ flex: 1 }}
            />
          </View>
        </Card>
      </ScrollView>

      {/* CREATE BACKUP / ENCRYPTION MODAL */}
      <Modal visible={showEncryptModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Create Database Backup</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              All transactions, wallets, budgets, and receipts will be bundled into a portable archive.
            </Text>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setEncryptEnabled(!encryptEnabled)}
              style={styles.checkboxRow}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: encryptEnabled ? colors.primary : 'transparent',
                    borderColor: encryptEnabled ? colors.primary : colors.border,
                  },
                ]}
              >
                {encryptEnabled && <Lock size={12} color="#FFFFFF" />}
              </View>
              <Text style={[styles.checkboxLabel, { color: colors.text }]}>
                Protect with password (AES-256-GCM Encryption)
              </Text>
            </TouchableOpacity>

            {encryptEnabled && (
              <View style={styles.passwordFieldsBox}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>BACKUP PASSWORD</Text>
                <TextInput
                  secureTextEntry
                  value={encryptPassword}
                  onChangeText={setEncryptPassword}
                  placeholder="Enter strong password"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                />

                <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 8 }]}>
                  CONFIRM PASSWORD
                </Text>
                <TextInput
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter password"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                />
                <Text style={[styles.warningNote, { color: colors.warning }]}>
                  ⚠️ If you forget this password, the backup file cannot be decrypted or restored.
                </Text>
              </View>
            )}

            <View style={styles.modalButtonsRow}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setShowEncryptModal(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Create Now"
                onPress={handleConfirmCreateBackup}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </View>
      </Modal>

      {/* DECRYPTION PASSWORD PROMPT MODAL */}
      <Modal visible={showDecryptModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.lockIconCircle, { backgroundColor: '#EFF6FF' }]}>
              <Lock size={24} color={colors.primary} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Encrypted Backup</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              This backup file is encrypted with AES-256-GCM. Please enter the password you set during creation.
            </Text>

            <TextInput
              secureTextEntry
              value={decryptPassword}
              onChangeText={setDecryptPassword}
              placeholder="Enter backup password"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text, borderColor: colors.border, marginBottom: 16 }]}
            />

            <View style={styles.modalButtonsRow}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setShowDecryptModal(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Unlock & Verify"
                onPress={handleConfirmDecrypt}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </View>
      </Modal>

      {/* RESTORE CONFIRMATION PREVIEW MODAL */}
      <Modal visible={!!restorePreview} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.lockIconCircle, { backgroundColor: '#ECFDF5' }]}>
              <ShieldCheck size={28} color="#10B981" />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Confirm Database Restore</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Created on: {restorePreview ? formatDisplayDate(restorePreview.createdAt) : ''}
            </Text>

            <View style={[styles.previewStatsBox, { backgroundColor: colors.surfaceVariant }]}>
              <Text style={[styles.previewStatsTitle, { color: colors.textSecondary }]}>
                ITEMS IN THIS BACKUP:
              </Text>
              <Text style={[styles.previewStatLine, { color: colors.text }]}>
                • Transactions: <Text style={{ fontWeight: '700' }}>{restorePreview?.counts.transactions}</Text>
              </Text>
              <Text style={[styles.previewStatLine, { color: colors.text }]}>
                • Wallets & Accounts: <Text style={{ fontWeight: '700' }}>{restorePreview?.counts.wallets}</Text>
              </Text>
              <Text style={[styles.previewStatLine, { color: colors.text }]}>
                • Categories: <Text style={{ fontWeight: '700' }}>{restorePreview?.counts.categories}</Text>
              </Text>
              <Text style={[styles.previewStatLine, { color: colors.text }]}>
                • Budgets & Goals: <Text style={{ fontWeight: '700' }}>{(restorePreview?.counts.budgets || 0) + (restorePreview?.counts.savings_goals || 0)}</Text>
              </Text>
              <Text style={[styles.previewStatLine, { color: colors.text }]}>
                • Receipt Photos: <Text style={{ fontWeight: '700' }}>{restorePreview?.counts.receipt_images}</Text>
              </Text>
            </View>

            <Text style={[styles.warningNote, { color: colors.expense, marginBottom: 16 }]}>
              ⚠️ Warning: Restoring will replace current records with this backup. A safety snapshot will be taken before restoring.
            </Text>

            <View style={styles.modalButtonsRow}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setRestorePreview(null)}
                style={{ flex: 1 }}
              />
              <Button
                title="Restore Data"
                variant="danger"
                onPress={handleExecuteRestore}
                loading={loading}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  statusCard: {
    padding: 16,
    marginBottom: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  statusIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  card: {
    padding: 16,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardSub: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  freqRow: {
    flexDirection: 'row',
    gap: 8,
  },
  freqButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  freqButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
  },
  historyCard: {
    padding: 14,
    marginBottom: 10,
  },
  historyTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyFileName: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  historyMeta: {
    fontSize: 12,
    marginBottom: 2,
  },
  historyCounts: {
    fontSize: 11,
  },
  historyActionsRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
    paddingTop: 10,
  },
  historyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  historyActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    padding: 20,
    borderRadius: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalSub: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  lockIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  passwordFieldsBox: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
  },
  warningNote: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 8,
    fontWeight: '600',
  },
  previewStatsBox: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  previewStatsTitle: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  previewStatLine: {
    fontSize: 13,
    lineHeight: 20,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
});
