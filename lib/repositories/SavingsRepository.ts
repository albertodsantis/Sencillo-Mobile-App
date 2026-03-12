import { supabase } from '../../utils/supabase';
import { getActiveWorkspaceId, getCurrentUserId } from './workspaceScope';
import { type SavingsGoals } from '../domain/types';

type SavingsGoalRow = { category: string; amount: number | string };

export const SavingsRepository = {
  async get(): Promise<SavingsGoals> {
    const userId = await getCurrentUserId();
    const workspaceId = await getActiveWorkspaceId();
    if (!userId || !workspaceId) return {};

    try {
      const { data, error } = await supabase
        .from('savings_goals')
        .select('category, amount')
        .eq('user_id', userId)
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
    if (!userId || !workspaceId) {
      throw new Error('No hay una sesion activa para guardar metas');
    }

    const entries = Object.entries(goals);
    const nextCategories = new Set(entries.map(([category]) => category));
    const { data: existingRows, error: existingRowsError } = await supabase
      .from('savings_goals')
      .select('category')
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId);

    if (existingRowsError) {
      throw new Error(existingRowsError.message || 'No se pudieron leer las metas actuales');
    }

    if (entries.length > 0) {
      const { error } = await supabase.from('savings_goals').upsert(
        entries.map(([category, amount]) => ({
          user_id: userId,
          workspace_id: workspaceId,
          category,
          amount,
        })),
        { onConflict: 'user_id,workspace_id,category' },
      );

      if (error) {
        throw new Error(error.message || 'No se pudieron guardar las metas');
      }
    }

    const staleCategories = ((existingRows ?? []) as { category: string }[])
      .map((row) => row.category)
      .filter((category) => !nextCategories.has(category));

    if (staleCategories.length > 0) {
      const { error } = await supabase
        .from('savings_goals')
        .delete()
        .eq('user_id', userId)
        .eq('workspace_id', workspaceId)
        .in('category', staleCategories);

      if (error) {
        throw new Error(error.message || 'No se pudieron eliminar las metas obsoletas');
      }
    }
  },

  async clear(): Promise<void> {
    const userId = await getCurrentUserId();
    const workspaceId = await getActiveWorkspaceId();
    if (!userId || !workspaceId) {
      throw new Error('No hay una sesion activa para limpiar metas');
    }

    const { error } = await supabase
      .from('savings_goals')
      .delete()
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId);

    if (error) {
      throw new Error(error.message || 'No se pudieron limpiar las metas');
    }
  },
};
