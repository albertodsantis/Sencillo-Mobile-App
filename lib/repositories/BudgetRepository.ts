import { supabase } from '../../utils/supabase';
import { type Budgets } from '../domain/types';

type BudgetRow = { category: string; amount: number | string };

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export const BudgetRepository = {
  async get(): Promise<Budgets> {
    try {
      const { data, error } = await supabase.from('budgets').select('category, amount');
      if (error || !data) return {};

      return (data as BudgetRow[]).reduce<Budgets>((acc, row) => {
        acc[row.category] = Number(row.amount);
        return acc;
      }, {});
    } catch {
      return {};
    }
  },

  async save(budgets: Budgets): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) return;

    await supabase.from('budgets').delete().eq('user_id', userId);
    const entries = Object.entries(budgets);
    if (entries.length === 0) return;

    await supabase.from('budgets').insert(
      entries.map(([category, amount]) => ({
        user_id: userId,
        category,
        amount,
      })),
    );
  },

  async clear(): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) return;
    await supabase.from('budgets').delete().eq('user_id', userId);
  },
};
