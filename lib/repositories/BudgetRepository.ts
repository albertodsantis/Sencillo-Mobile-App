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

    const entries = Object.entries(budgets);
    const nextCategories = new Set(entries.map(([category]) => category));
    const { data: existingRows, error: existingRowsError } = await supabase
      .from('budgets')
      .select('category')
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId);

    if (existingRowsError) {
      throw new Error(existingRowsError.message || 'No se pudieron leer los presupuestos actuales');
    }

    if (entries.length > 0) {
      const { error } = await supabase.from('budgets').upsert(
        entries.map(([category, amount]) => ({
          user_id: userId,
          workspace_id: workspaceId,
          category,
          amount,
        })),
        { onConflict: 'user_id,workspace_id,category' },
      );

      if (error) {
        throw new Error(error.message || 'No se pudieron guardar los presupuestos');
      }
    }

    const staleCategories = ((existingRows ?? []) as { category: string }[])
      .map((row) => row.category)
      .filter((category) => !nextCategories.has(category));

    if (staleCategories.length > 0) {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('user_id', userId)
        .eq('workspace_id', workspaceId)
        .in('category', staleCategories);

      if (error) {
        throw new Error(error.message || 'No se pudieron eliminar los presupuestos obsoletos');
      }
    }
  },

  async clear(): Promise<void> {
    const userId = await getCurrentUserId();
    const workspaceId = await getActiveWorkspaceId();
    if (!userId || !workspaceId) return;

    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId);

    if (error) {
      throw new Error(error.message || 'No se pudieron limpiar los presupuestos');
    }
  },
};
