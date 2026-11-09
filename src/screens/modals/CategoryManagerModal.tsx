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
import {
  getAllCategories,
  createCategory,
  deleteCategory,
} from '../../database/categoriesRepo';
import { Category, TransactionType } from '../../types';
import { getCategoryIcon } from '../../utils/iconMap';
import { useTheme } from '../../theme/ThemeContext';
import { Header } from '../../components/common/Header';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Plus, Trash2 } from 'lucide-react-native';

const COLOR_OPTIONS = [
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#10B981',
  '#06B6D4',
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#64748B',
];

export const CategoryManagerModal: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<TransactionType>('expense');
  const [newCatName, setNewCatName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#6366F1');
  const [isAdding, setIsAdding] = useState(false);

  const loadCategories = async () => {
    try {
      const list = await getAllCategories(activeTab);
      setCategories(list);
    } catch (err) {
      console.warn('Error loading categories:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [activeTab])
  );

  const handleCreate = async () => {
    if (!newCatName.trim()) {
      Alert.alert('Name Required', 'Please enter a name for the custom category.');
      return;
    }

    const newId = 'cat_custom_' + Date.now();
    await createCategory({
      id: newId,
      name: newCatName.trim(),
      type: activeTab,
      icon: 'MoreHorizontal',
      color: selectedColor,
      is_custom: 1,
    });

    setNewCatName('');
    setIsAdding(false);
    await loadCategories();
  };

  const handleDelete = (c: Category) => {
    if (c.is_custom === 0) {
      Alert.alert('Default Category', 'Default categories cannot be deleted.');
      return;
    }

    Alert.alert(
      'Delete Category',
      `Delete custom category "${c.name}"? Note: categories with existing transactions cannot be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteCategory(c.id);
            if (!res.success) {
              Alert.alert('Cannot Delete', res.error || 'Category is in use.');
            } else {
              await loadCategories();
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <Header
        title="Manage Categories"
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => setIsAdding(!isAdding)}
            style={[styles.addBtn, { backgroundColor: colors.primaryLight }]}
          >
            <Plus size={16} color={colors.primary} />
            <Text style={[styles.addBtnText, { color: colors.primary }]}>
              {isAdding ? 'Close' : 'Add Custom'}
            </Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Type Selector */}
        <View style={[styles.typeToggle, { backgroundColor: colors.surfaceVariant }]}>
          <TouchableOpacity
            onPress={() => setActiveTab('expense')}
            style={[styles.typeBtn, activeTab === 'expense' && { backgroundColor: colors.expense }]}
          >
            <Text style={[styles.typeBtnText, { color: activeTab === 'expense' ? '#FFFFFF' : colors.text }]}>
              EXPENSE CATEGORIES
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('income')}
            style={[styles.typeBtn, activeTab === 'income' && { backgroundColor: colors.income }]}
          >
            <Text style={[styles.typeBtnText, { color: activeTab === 'income' ? '#FFFFFF' : colors.text }]}>
              INCOME CATEGORIES
            </Text>
          </TouchableOpacity>
        </View>

        {/* Add Form */}
        {isAdding && (
          <Card style={[styles.addCard, { borderColor: colors.primary }]}>
            <Text style={[styles.addTitle, { color: colors.text }]}>Create Custom Category</Text>

            <Input
              label="Category Name"
              value={newCatName}
              onChangeText={setNewCatName}
              placeholder="e.g. Pet Care, Gym, Coffee..."
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>CHOOSE COLOR</Text>
            <View style={styles.colorsRow}>
              {COLOR_OPTIONS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setSelectedColor(c)}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c },
                    selectedColor === c && styles.selectedColorCircle,
                  ]}
                />
              ))}
            </View>

            <Button
              title="Save Custom Category"
              onPress={handleCreate}
              style={{ marginTop: 14 }}
            />
          </Card>
        )}

        {/* Category List */}
        <Card style={styles.listCard}>
          {categories.map((c) => (
            <View
              key={c.id}
              style={[styles.categoryRow, { borderBottomColor: colors.borderLight }]}
            >
              <View style={styles.categoryLeft}>
                <View style={[styles.catIconBox, { backgroundColor: c.color }]}>
                  {getCategoryIcon(c.icon, 18, '#FFFFFF')}
                </View>
                <View>
                  <Text style={[styles.catName, { color: colors.text }]}>{c.name}</Text>
                  <Text style={[styles.catTag, { color: colors.textSecondary }]}>
                    {c.is_custom === 1 ? 'Custom Category' : 'Standard'}
                  </Text>
                </View>
              </View>

              {c.is_custom === 1 && (
                <TouchableOpacity onPress={() => handleDelete(c)} style={styles.deleteBtn}>
                  <Trash2 size={16} color={colors.expense} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </Card>
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  typeToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  typeBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  addCard: {
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  addTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  colorsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  colorCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  selectedColorCircle: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  listCard: {
    padding: 0,
    overflow: 'hidden',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  catName: {
    fontSize: 14,
    fontWeight: '600',
  },
  catTag: {
    fontSize: 11,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 6,
  },
});

