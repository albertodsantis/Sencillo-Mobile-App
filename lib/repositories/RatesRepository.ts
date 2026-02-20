import { supabase } from '../../utils/supabase';
import { type Rates } from '../domain/types';

type RatesRow = {
  bcv: number | string;
  parallel: number | string;
  eur: number | string;
  eur_cross: number | string;
  rates_timestamp: string;
};

export const RatesRepository = {
  async get(): Promise<Rates | null> {
    try {
      const { data, error } = await supabase
        .from('rates')
        .select('bcv, parallel, eur, eur_cross, rates_timestamp')
        .maybeSingle();

      if (error || !data) return null;

      const row = data as RatesRow;
      return {
        bcv: Number(row.bcv),
        parallel: Number(row.parallel),
        eur: Number(row.eur),
        eurCross: Number(row.eur_cross),
      };
    } catch {
      return null;
    }
  },

  async save(rates: Rates): Promise<void> {
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) return;

    await supabase.from('rates').upsert(
      {
        user_id: userId,
        bcv: rates.bcv,
        parallel: rates.parallel,
        eur: rates.eur,
        eur_cross: rates.eurCross,
        rates_timestamp: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
  },

  async getAge(): Promise<number> {
    try {
      const timestamp = await this.getTimestamp();
      if (!timestamp) return Infinity;
      return Date.now() - timestamp;
    } catch {
      return Infinity;
    }
  },

  async getTimestamp(): Promise<number | null> {
    try {
      const { data, error } = await supabase.from('rates').select('rates_timestamp').maybeSingle();
      if (error || !data?.rates_timestamp) return null;

      const parsed = Date.parse(data.rates_timestamp as string);
      return Number.isNaN(parsed) ? null : parsed;
    } catch {
      return null;
    }
  },

  async clear(): Promise<void> {
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) return;
    await supabase.from('rates').delete().eq('user_id', userId);
  },
};
