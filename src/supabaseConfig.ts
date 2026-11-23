// URL y clave "anon" del proyecto Supabase. La clave anon es pública por diseño:
// la seguridad la dan las políticas RLS de supabase/schema.sql. NUNCA pongas aquí la service_role.
export const SUPABASE_URL = 'https://wkzlfkhxcqweidjinbgk.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_dlyBbNRUrAqq0-VuAfsmoQ_Hnv78LFj';

// Dominio que se añade si el usuario escribe solo la parte izquierda del correo (p. ej. "prueba").
// Si escribe un correo completo (con @), se usa tal cual.
export const LOGIN_DOMAIN = 'gmail.com';
