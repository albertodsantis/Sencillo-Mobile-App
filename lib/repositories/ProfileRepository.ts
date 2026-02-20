import { supabase } from '../../utils/supabase';
import { type UserProfile, DEFAULT_PROFILE } from '../domain/types';

type ProfileRow = {
  first_name: string;
  last_name: string;
  phone_prefix: string;
  phone_number: string;
  email: string;
  password: string;
};

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function mapProfile(row: ProfileRow): UserProfile {
  return {
    firstName: row.first_name,
    lastName: row.last_name,
    phonePrefix: row.phone_prefix,
    phoneNumber: row.phone_number,
    email: row.email,
    password: row.password,
  };
}

export const ProfileRepository = {
  async get(): Promise<UserProfile> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone_prefix, phone_number, email, password')
        .maybeSingle();

      if (error || !data) return DEFAULT_PROFILE;
      return mapProfile(data as ProfileRow);
    } catch {
      return DEFAULT_PROFILE;
    }
  },

  async save(profile: UserProfile): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) return;

    await supabase.from('profiles').upsert(
      {
        user_id: userId,
        first_name: profile.firstName,
        last_name: profile.lastName,
        phone_prefix: profile.phonePrefix,
        phone_number: profile.phoneNumber,
        email: profile.email,
        password: profile.password,
      },
      { onConflict: 'user_id' },
    );
  },

  async clear(): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) return;
    await supabase.from('profiles').delete().eq('user_id', userId);
  },
};
