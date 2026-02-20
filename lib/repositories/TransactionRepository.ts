import { supabase } from '../../utils/supabase';
import { type Transaction } from '../domain/types';

type TransactionRow = {
  id: string;
  type: Transaction['type'];
  segment: Transaction['segment'];
  amount: number | string;
  currency: Transaction['currency'];
  original_rate: number | string;
  amount_usd: number | string;
  category: string;
  description: string | null;
  date: string;
  profile_id: string | null;
};

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function mapTransactionRow(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type,
    segment: row.segment,
    amount: Number(row.amount),
    currency: row.currency,
    originalRate: Number(row.original_rate),
    amountUSD: Number(row.amount_usd),
    category: row.category,
    description: row.description ?? '',
    date: row.date,
    profileId: row.profile_id ?? '',
  };
}

export const TransactionRepository = {
  async getAll(): Promise<Transaction[]> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, type, segment, amount, currency, original_rate, amount_usd, category, description, date, profile_id')
        .order('date', { ascending: false });

      if (error || !data) return [];
      return (data as TransactionRow[]).map(mapTransactionRow);
    } catch {
      return [];
    }
  },

  async save(transactions: Transaction[]): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) return;

    await supabase.from('transactions').delete().eq('user_id', userId);
    if (transactions.length === 0) return;

    const rows = transactions.map((tx) => ({
      id: tx.id,
      user_id: userId,
      type: tx.type,
      segment: tx.segment,
      amount: tx.amount,
      currency: tx.currency,
      original_rate: tx.originalRate,
      amount_usd: tx.amountUSD,
      category: tx.category,
      description: tx.description || null,
      date: tx.date,
      profile_id: tx.profileId || null,
    }));

    await supabase.from('transactions').insert(rows);
  },

  async add(tx: Omit<Transaction, 'id'>): Promise<Transaction> {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { ...tx, id: '' };
    }

    const { data } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: tx.type,
        segment: tx.segment,
        amount: tx.amount,
        currency: tx.currency,
        original_rate: tx.originalRate,
        amount_usd: tx.amountUSD,
        category: tx.category,
        description: tx.description || null,
        date: tx.date,
        profile_id: tx.profileId || null,
      })
      .select('id, type, segment, amount, currency, original_rate, amount_usd, category, description, date, profile_id')
      .single();

    if (!data) {
      return { ...tx, id: '' };
    }

    return mapTransactionRow(data as TransactionRow);
  },

  async addMany(txList: Omit<Transaction, 'id'>[]): Promise<Transaction[]> {
    const userId = await getCurrentUserId();
    if (!userId || txList.length === 0) return [];

    const payload = txList.map((tx) => ({
      user_id: userId,
      type: tx.type,
      segment: tx.segment,
      amount: tx.amount,
      currency: tx.currency,
      original_rate: tx.originalRate,
      amount_usd: tx.amountUSD,
      category: tx.category,
      description: tx.description || null,
      date: tx.date,
      profile_id: tx.profileId || null,
    }));

    const { data, error } = await supabase
      .from('transactions')
      .insert(payload)
      .select('id, type, segment, amount, currency, original_rate, amount_usd, category, description, date, profile_id');

    if (error || !data) return [];
    return (data as TransactionRow[]).map(mapTransactionRow);
  },

  async update(tx: Transaction): Promise<void> {
    await supabase
      .from('transactions')
      .update({
        type: tx.type,
        segment: tx.segment,
        amount: tx.amount,
        currency: tx.currency,
        original_rate: tx.originalRate,
        amount_usd: tx.amountUSD,
        category: tx.category,
        description: tx.description || null,
        date: tx.date,
        profile_id: tx.profileId || null,
      })
      .eq('id', tx.id);
  },

  async remove(id: string): Promise<void> {
    await supabase.from('transactions').delete().eq('id', id);
  },

  async removeAll(): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) return;
    await supabase.from('transactions').delete().eq('user_id', userId);
  },

  async clear(): Promise<void> {
    await this.removeAll();
  },
};
