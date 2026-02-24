import { supabase } from '../../utils/supabase';
import { type Workspace } from '../domain/types';

type WorkspaceRow = {
  id: string;
  name: string;
  is_default: boolean;
  created_at: string;
};

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function mapWorkspace(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    name: row.name,
    isDefault: row.is_default,
    createdAt: row.created_at,
  };
}

async function ensurePersonalWorkspace(userId: string): Promise<Workspace | null> {
  const { data, error } = await supabase
    .from('workspaces')
    .insert({
      user_id: userId,
      name: 'Personal',
      is_default: true,
    })
    .select('id, name, is_default, created_at')
    .single();

  if (error) {
    const { data: fallbackData } = await supabase
      .from('workspaces')
      .select('id, name, is_default, created_at')
      .eq('user_id', userId)
      .eq('is_default', true)
      .maybeSingle();
    return fallbackData ? mapWorkspace(fallbackData as WorkspaceRow) : null;
  }

  return mapWorkspace(data as WorkspaceRow);
}

export const WorkspaceRepository = {
  async getAll(): Promise<Workspace[]> {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from('workspaces')
      .select('id, name, is_default, created_at')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) return [];

    const workspaces = ((data ?? []) as WorkspaceRow[]).map(mapWorkspace);
    if (workspaces.length > 0) return workspaces;

    const personal = await ensurePersonalWorkspace(userId);
    return personal ? [personal] : [];
  },

  async create(name: string): Promise<Workspace> {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('No autenticado');

    const trimmedName = name.trim();
    if (!trimmedName) throw new Error('El nombre del espacio es obligatorio');

    const { data, error } = await supabase
      .from('workspaces')
      .insert({
        user_id: userId,
        name: trimmedName,
        is_default: false,
      })
      .select('id, name, is_default, created_at')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'No se pudo crear el espacio');
    }

    return mapWorkspace(data as WorkspaceRow);
  },

  async ensureDefault(): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) return;
    await ensurePersonalWorkspace(userId);
  },
};
