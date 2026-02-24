import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../utils/supabase';

export const ACTIVE_WORKSPACE_STORAGE_KEY = '@sencillo/active_workspace_id';

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function getActiveWorkspaceId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY);
  } catch {
    return null;
  }
}
