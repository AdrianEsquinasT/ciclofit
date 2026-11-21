import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabaseConfig';

export const cloudEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const sb: SupabaseClient | null = cloudEnabled
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

export type DocKey = 'settings' | 'routine' | 'log';
export interface Row {
  space_id?: string;
  key: DocKey;
  value: unknown;
  updated_at: string;
}

export const ts = (s?: string) => (s ? Date.parse(s) || 0 : 0);

export async function getSpaceId(): Promise<string> {
  const { data, error } = await sb!.from('space_members').select('space_id').limit(1).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Tu cuenta no tiene espacio asignado (ejecuta supabase/schema.sql)');
  return data.space_id as string;
}

export async function pullAll(spaceId: string): Promise<Row[]> {
  const { data, error } = await sb!.from('app_state').select('key,value,updated_at').eq('space_id', spaceId);
  if (error) throw error;
  return (data ?? []) as Row[];
}

export async function pushDoc(spaceId: string, key: DocKey, value: unknown, updated_at: string) {
  const { error } = await sb!.from('app_state').upsert({ space_id: spaceId, key, value, updated_at });
  if (error) throw error;
}
