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
import { getAllGoals, deleteGoal } from '../../database/goalsRepo';
import { SavingsGoal } from '../../types';
import { useTheme } from '../../theme/ThemeContext';
import { Header } from '../../components/common/Header';
import { GoalProgressCard } from '../../components/goals/GoalProgressCard';
import { EmptyState } from '../../components/common/EmptyState';
import { Plus, Target } from 'lucide-react-native';

export const GoalsListModal: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  const [goals, setGoals] = useState<SavingsGoal[]>([]);

  const loadGoals = async () => {
    try {
      const list = await getAllGoals();
      setGoals(list);
    } catch (err) {
      console.warn('Error loading savings goals:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadGoals();
    }, [])
  );

  const handleDelete = (goal: SavingsGoal) => {
    Alert.alert(
      'Delete Goal',
      `Delete "${goal.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteGoal(goal.id);
            await loadGoals();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <Header
        title="Savings Goals"
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate('AddEditGoalModal')}
            style={[styles.addHeaderBtn, { backgroundColor: colors.primaryLight }]}
          >
            <Plus size={16} color={colors.primary} />
            <Text style={[styles.addHeaderText, { color: colors.primary }]}>New Goal</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {goals.length === 0 ? (
          <EmptyState
            icon={<Target size={40} color={colors.primary} />}
            title="No Savings Goals Yet"
            description="Create a goal for your dream laptop, emergency fund, or vacation and deposit funds towards it regularly."
            actionTitle="+ Create Your First Goal"
            onAction={() => navigation.navigate('AddEditGoalModal')}
          />
        ) : (
          goals.map((g) => (
            <GoalProgressCard
              key={g.id}
              goal={g}
              onPress={() =>
                Alert.alert(g.title, `Target: ${g.target_date}`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => handleDelete(g) },
                  {
                    text: 'Edit',
                    onPress: () => navigation.navigate('AddEditGoalModal', { goalId: g.id }),
                  },
                ])
              }
              onDepositPress={() =>
                navigation.navigate('DepositGoalModal', { goalId: g.id, goalTitle: g.title })
              }
            />
          ))
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
});

