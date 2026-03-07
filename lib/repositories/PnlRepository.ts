import { supabase } from '../../utils/supabase';
import { getActiveWorkspaceId, getCurrentUserId } from './workspaceScope';
import { type PnlStructure, DEFAULT_PNL } from '../domain/types';

type PnlCategoryRow = { segment: keyof PnlStructure; name: string };

export const PnlRepository = {
  async get(): Promise<PnlStructure> {
    const workspaceId = await getActiveWorkspaceId();
    if (!workspaceId) return DEFAULT_PNL;

    try {
      const { data, error } = await supabase
        .from('pnl_categories')
        .select('segment, name')
        .eq('workspace_id', workspaceId);
      if (error || !data || data.length === 0) return DEFAULT_PNL;

      return (data as PnlCategoryRow[]).reduce<PnlStructure>(
        (acc, row) => {
          acc[row.segment].push(row.name);
          return acc;
        },
        { ingresos: [], gastos_fijos: [], gastos_variables: [], ahorro: [] },
      );
    } catch {
      return DEFAULT_PNL;
    }
  },

  async save(pnl: PnlStructure): Promise<void> {
    const userId = await getCurrentUserId();
    const workspaceId = await getActiveWorkspaceId();
    if (!userId || !workspaceId) return;

    const rows = (Object.entries(pnl) as [keyof PnlStructure, string[]][]).flatMap(([segment, names]) =>
      names.map((name) => ({ user_id: userId, workspace_id: workspaceId, segment, name })),
    );
    const nextKeys = new Set(rows.map((row) => `${row.segment}::${row.name}`));
    const { data: existingRows } = await supabase
      .from('pnl_categories')
      .select('segment, name')
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId);

    if (rows.length > 0) {
      await supabase.from('pnl_categories').upsert(rows, {
        onConflict: 'user_id,workspace_id,segment,name',
      });
    }

    const staleRows = ((existingRows ?? []) as PnlCategoryRow[])
      .filter((row) => !nextKeys.has(`${row.segment}::${row.name}`));

    if (staleRows.length > 0) {
      const staleSegments = [...new Set(staleRows.map((row) => row.segment))];

      for (const segment of staleSegments) {
        const staleNames = staleRows
          .filter((row) => row.segment === segment)
          .map((row) => row.name);

        if (staleNames.length === 0) continue;

        await supabase
          .from('pnl_categories')
          .delete()
          .eq('user_id', userId)
          .eq('workspace_id', workspaceId)
          .eq('segment', segment)
          .in('name', staleNames);
      }
    }
  },

  async clear(): Promise<void> {
    const userId = await getCurrentUserId();
    const workspaceId = await getActiveWorkspaceId();
    if (!userId || !workspaceId) return;
    await supabase.from('pnl_categories').delete().eq('user_id', userId).eq('workspace_id', workspaceId);
  },
};
