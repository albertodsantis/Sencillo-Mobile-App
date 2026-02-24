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

    await supabase.from('pnl_categories').delete().eq('user_id', userId).eq('workspace_id', workspaceId);

    const rows = (Object.entries(pnl) as [keyof PnlStructure, string[]][]).flatMap(([segment, names]) =>
      names.map((name) => ({ user_id: userId, workspace_id: workspaceId, segment, name })),
    );

    if (rows.length === 0) return;
    await supabase.from('pnl_categories').insert(rows);
  },

  async clear(): Promise<void> {
    const userId = await getCurrentUserId();
    const workspaceId = await getActiveWorkspaceId();
    if (!userId || !workspaceId) return;
    await supabase.from('pnl_categories').delete().eq('user_id', userId).eq('workspace_id', workspaceId);
  },
};
