import { supabase } from '../../utils/supabase';
import { type UserProfile, DEFAULT_PROFILE } from '../domain/types';

type ProfileRow = {
  first_name: string;
  last_name: string;
  phone_prefix: string;
  phone_number: string;
  email: string;
  onboarding_completed: boolean | null;
};

async function getCurrentUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session?.user?.id ?? null;
}

function mapProfile(row: ProfileRow): UserProfile {
  return {
    firstName: row.first_name,
    lastName: row.last_name,
    phonePrefix: row.phone_prefix,
    phoneNumber: row.phone_number,
    email: row.email,
    onboardingCompleted: row.onboarding_completed ?? false,
  };
}

export const ProfileRepository = {
  async get(): Promise<UserProfile> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return DEFAULT_PROFILE;

      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone_prefix, phone_number, email, onboarding_completed')
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data) return DEFAULT_PROFILE;
      return mapProfile(data as ProfileRow);
    } catch {
      return DEFAULT_PROFILE;
    }
  },

  async save(profile: UserProfile): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('No autenticado');
    }

    const { error } = await supabase.from('profiles').upsert(
      {
        user_id: userId,
        first_name: profile.firstName,
        last_name: profile.lastName,
        phone_prefix: profile.phonePrefix,
        phone_number: profile.phoneNumber,
        email: profile.email,
        onboarding_completed: profile.onboardingCompleted,
      },
      { onConflict: 'user_id' },
    );

    if (error) {
      throw new Error(error.message || 'No se pudo guardar el perfil');
    }
  },

  async clear(): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new Error('No autenticado');
    }

    const { error } = await supabase.from('profiles').delete().eq('user_id', userId);
    if (error) {
      throw new Error(error.message || 'No se pudo limpiar el perfil');
    }
  },
};
