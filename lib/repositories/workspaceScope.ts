import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../utils/supabase';

export const ACTIVE_WORKSPACE_STORAGE_KEY = '@sencillo/active_workspace_id';

export async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function getActiveWorkspaceId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY);
  } catch {
    return null;
  }
}
