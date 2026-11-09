import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { createGoal, updateGoal, getGoalById } from '../../database/goalsRepo';
import { rupeesToPaise, sanitizeAmountInput } from '../../utils/currency';
import { nowISO } from '../../utils/date';
import { addMonths } from 'date-fns';
import { useTheme } from '../../theme/ThemeContext';
import { Header } from '../../components/common/Header';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

export const AddEditGoalModal: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const goalId = route.params?.goalId;

  const [title, setTitle] = useState('');
  const [targetAmountStr, setTargetAmountStr] = useState('');
  const [targetDateStr, setTargetDateStr] = useState(
    addMonths(new Date(), 6).toISOString().substring(0, 10)
  );
  const [color, setColor] = useState('#10B981');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      if (goalId) {
        const g = await getGoalById(goalId);
        if (g) {
          setTitle(g.title);
          setTargetAmountStr((g.target_amount_paise / 100).toString());
          setTargetDateStr(g.target_date.substring(0, 10));
          setColor(g.color);
        }
      }
    }
    load();
  }, [goalId]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Title Required', 'Please enter a goal title.');
      return;
    }
    const targetPaise = rupeesToPaise(targetAmountStr);
    if (targetPaise <= 0) {
      Alert.alert('Invalid Target', 'Please enter a target amount greater than zero.');
      return;
    }

    setSaving(true);
    try {
      if (goalId) {
        const existing = await getGoalById(goalId);
        if (existing) {
          await updateGoal({
            ...existing,
            title: title.trim(),
            target_amount_paise: targetPaise,
            target_date: targetDateStr,
            color,
          });
        }
      } else {
        const newId = 'goal_' + Date.now();
        await createGoal({
          id: newId,
          title: title.trim(),
          target_amount_paise: targetPaise,
          target_date: targetDateStr,
          color,
          icon: 'Target',
        });
      }
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Save Error', err.message || 'Failed to save goal.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <Header
        title={goalId ? 'Edit Savings Goal' : 'New Savings Goal'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Input
          label="Goal Name"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. MacBook Pro M3, Emergency Reserve, Japan Vacation"
        />

        <Input
          label="Target Amount (INR ₹)"
          value={targetAmountStr}
          onChangeText={(t) => setTargetAmountStr(sanitizeAmountInput(t))}
          keyboardType="decimal-pad"
          prefix="₹"
          placeholder="e.g. 150000"
        />

        <Input
          label="Target Date (YYYY-MM-DD)"
          value={targetDateStr}
          onChangeText={setTargetDateStr}
          placeholder="2027-01-31"
        />

        <Button
          title={goalId ? 'Update Goal' : 'Create Goal'}
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
});

