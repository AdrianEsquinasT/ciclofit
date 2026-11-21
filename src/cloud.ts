import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabaseConfig';

export const cloudEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const sb: SupabaseClient | null = cloudEnabled
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

export type DocKey = 'settings' | 'routine' | 'log';
export interface Row {
  key: DocKey;
  value: unknown;
  updated_at: string;
}

export const ts = (s?: string) => (s ? Date.parse(s) || 0 : 0);

export async function pullAll(): Promise<Row[]> {
  const { data, error } = await sb!.from('app_state').select('key,value,updated_at');
  if (error) throw error;
  return (data ?? []) as Row[];
}

export async function pushDoc(key: DocKey, value: unknown, updated_at: string) {
  const { error } = await sb!.from('app_state').upsert({ key, value, updated_at });
  if (error) throw error;
}
