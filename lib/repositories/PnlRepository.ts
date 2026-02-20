import { supabase } from '../../utils/supabase';
import { type PnlStructure, DEFAULT_PNL } from '../domain/types';

type PnlCategoryRow = { segment: keyof PnlStructure; name: string };

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export const PnlRepository = {
  async get(): Promise<PnlStructure> {
    try {
      const { data, error } = await supabase.from('pnl_categories').select('segment, name');
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
    if (!userId) return;

    await supabase.from('pnl_categories').delete().eq('user_id', userId);

    const rows = (Object.entries(pnl) as [keyof PnlStructure, string[]][]).flatMap(([segment, names]) =>
      names.map((name) => ({ user_id: userId, segment, name })),
    );

    if (rows.length === 0) return;
    await supabase.from('pnl_categories').insert(rows);
  },

  async clear(): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) return;
    await supabase.from('pnl_categories').delete().eq('user_id', userId);
  },
};
