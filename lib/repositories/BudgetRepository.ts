import { supabase } from '../../utils/supabase';
import { getActiveWorkspaceId, getCurrentUserId } from './workspaceScope';
import { type Budgets } from '../domain/types';

type BudgetRow = { category: string; amount: number | string };

export const BudgetRepository = {
  async get(): Promise<Budgets> {
    const workspaceId = await getActiveWorkspaceId();
    if (!workspaceId) return {};

    try {
      const { data, error } = await supabase
        .from('budgets')
        .select('category, amount')
        .eq('workspace_id', workspaceId);
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
    const workspaceId = await getActiveWorkspaceId();
    if (!userId || !workspaceId) return;

    await supabase.from('budgets').delete().eq('user_id', userId).eq('workspace_id', workspaceId);
    const entries = Object.entries(budgets);
    if (entries.length === 0) return;

    await supabase.from('budgets').insert(
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
    await supabase.from('budgets').delete().eq('user_id', userId).eq('workspace_id', workspaceId);
  },
};
