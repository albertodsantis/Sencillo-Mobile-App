import { supabase } from '../../utils/supabase';
import { getActiveWorkspaceId, getCurrentUserId } from './workspaceScope';
import { type SavingsGoals } from '../domain/types';

type SavingsGoalRow = { category: string; amount: number | string };

export const SavingsRepository = {
  async get(): Promise<SavingsGoals> {
    const workspaceId = await getActiveWorkspaceId();
    if (!workspaceId) return {};

    try {
      const { data, error } = await supabase
        .from('savings_goals')
        .select('category, amount')
        .eq('workspace_id', workspaceId);
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
    const workspaceId = await getActiveWorkspaceId();
    if (!userId || !workspaceId) return;

    await supabase.from('savings_goals').delete().eq('user_id', userId).eq('workspace_id', workspaceId);
    const entries = Object.entries(goals);
    if (entries.length === 0) return;

    await supabase.from('savings_goals').insert(
      entries.map(([category, amount]) => ({
        user_id: userId,
        workspace_id: workspaceId,
        category,
        amount,
      })),
    );
  },

  async clear(): Promise<void> {
    const userId = await getCurrentUserId();
    const workspaceId = await getActiveWorkspaceId();
    if (!userId || !workspaceId) return;
    await supabase.from('savings_goals').delete().eq('user_id', userId).eq('workspace_id', workspaceId);
  },
};
