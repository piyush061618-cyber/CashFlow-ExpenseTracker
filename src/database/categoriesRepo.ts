import { getDB } from './db';
import { Category, TransactionType } from '../types';
import { nowISO } from '../utils/date';

export async function getAllCategories(type?: TransactionType): Promise<Category[]> {
  const db = await getDB();
  if (type) {
    return await db.getAllAsync<Category>(
      'SELECT * FROM categories WHERE type = ? ORDER BY is_custom ASC, name ASC',
      [type]
    );
  }
  return await db.getAllAsync<Category>('SELECT * FROM categories ORDER BY type ASC, name ASC');
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const db = await getDB();
  const cat = await db.getFirstAsync<Category>('SELECT * FROM categories WHERE id = ?', [id]);
  return cat || null;
}

export async function createCategory(
  category: Omit<Category, 'created_at'>
): Promise<Category> {
  const db = await getDB();
  const now = nowISO();
  await db.runAsync(
    'INSERT INTO categories (id, name, type, icon, color, is_custom, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [category.id, category.name, category.type, category.icon, category.color, category.is_custom, now]
  );
  return { ...category, created_at: now };
}

export async function updateCategory(category: Category): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    'UPDATE categories SET name = ?, icon = ?, color = ? WHERE id = ?',
    [category.name, category.icon, category.color, category.id]
  );
}

export async function deleteCategory(id: string): Promise<{ success: boolean; error?: string }> {
  const db = await getDB();

  // Check if transactions exist
  const tx = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM transactions WHERE category_id = ?',
    [id]
  );
  if (tx && tx.count > 0) {
    return { success: false, error: 'Cannot delete category with associated transactions.' };
  }

  // Check if budgets exist
  const b = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM budgets WHERE category_id = ?',
    [id]
  );
  if (b && b.count > 0) {
    return { success: false, error: 'Cannot delete category used in active budgets.' };
  }

  await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
  return { success: true };
}

