-- CicloFit · esquema Supabase (ejecutar una vez en SQL Editor)

-- Estado compartido: una fila por documento (settings, routine, log)
create table if not exists public.app_state (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

-- Solo usuarios autenticados (las 2 cuentas que crees; registro público desactivado)
create policy "app_state select" on public.app_state for select to authenticated using (true);
create policy "app_state insert" on public.app_state for insert to authenticated with check (true);
create policy "app_state update" on public.app_state for update to authenticated using (true) with check (true);

-- Latido para evitar la pausa por inactividad: escritura real en la BD
create table if not exists public.heartbeat (
  id int primary key default 1 check (id = 1),
  last_ping timestamptz not null default now()
);
insert into public.heartbeat default values on conflict do nothing;
alter table public.heartbeat enable row level security; -- sin políticas: nadie accede directamente

create or replace function public.ping() returns timestamptz
language sql security definer set search_path = public as $$
  update public.heartbeat set last_ping = now() where id = 1 returning last_ping;
$$;
revoke all on function public.ping() from public;
grant execute on function public.ping() to anon, authenticated;

-- Tiempo real entre móviles
alter publication supabase_realtime add table public.app_state;
