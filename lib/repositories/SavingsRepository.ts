import { supabase } from '../../utils/supabase';
import { type SavingsGoals } from '../domain/types';

type SavingsGoalRow = { category: string; amount: number | string };

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export const SavingsRepository = {
  async get(): Promise<SavingsGoals> {
    try {
      const { data, error } = await supabase.from('savings_goals').select('category, amount');
      if (error || !data) return {};

      return (data as SavingsGoalRow[]).reduce<SavingsGoals>((acc, row) => {
        acc[row.category] = Number(row.amount);
        return acc;
      }, {});
    } catch {
      return {};
    }
  },

  async save(goals: SavingsGoals): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) return;

    await supabase.from('savings_goals').delete().eq('user_id', userId);
    const entries = Object.entries(goals);
    if (entries.length === 0) return;

    await supabase.from('savings_goals').insert(
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
    await supabase.from('savings_goals').delete().eq('user_id', userId);
  },
};
