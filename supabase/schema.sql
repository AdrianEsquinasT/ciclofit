-- CicloFit · esquema Supabase (ejecutar una vez en SQL Editor)
-- Modelo: cada usuario pertenece a UN espacio. Un espacio puede tener varios usuarios
-- (vosotros dos comparten uno) o uno solo (cada amiga tiene el suyo, aislado).

create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.space_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete cascade
);

create table if not exists public.app_state (
  space_id uuid not null references public.spaces(id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (space_id, key)
);

alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.app_state enable row level security;

-- Cada usuario ve solo su pertenencia y los datos de su espacio
create policy "member self" on public.space_members for select to authenticated using (user_id = auth.uid());

create policy "state select" on public.app_state for select to authenticated
  using (space_id in (select space_id from public.space_members where user_id = auth.uid()));
create policy "state insert" on public.app_state for insert to authenticated
  with check (space_id in (select space_id from public.space_members where user_id = auth.uid()));
create policy "state update" on public.app_state for update to authenticated
  using (space_id in (select space_id from public.space_members where user_id = auth.uid()))
  with check (space_id in (select space_id from public.space_members where user_id = auth.uid()));

-- Cada usuario nuevo recibe automáticamente su propio espacio
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  insert into public.spaces default values returning id into sid;
  insert into public.space_members (user_id, space_id) values (new.id, sid);
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Usuarios que ya existan sin espacio (por si los creaste antes de ejecutar este script)
do $$
declare u record; sid uuid;
begin
  for u in select id from auth.users where id not in (select user_id from public.space_members) loop
    insert into public.spaces default values returning id into sid;
    insert into public.space_members (user_id, space_id) values (u.id, sid);
  end loop;
end $$;

-- Latido anti-pausa: escritura real en la BD
create table if not exists public.heartbeat (
  id int primary key default 1 check (id = 1),
  last_ping timestamptz not null default now()
);
insert into public.heartbeat default values on conflict do nothing;
alter table public.heartbeat enable row level security;

create or replace function public.ping() returns timestamptz
language sql security definer set search_path = public as $$
  update public.heartbeat set last_ping = now() where id = 1 returning last_ping;
$$;
revoke all on function public.ping() from public;
grant execute on function public.ping() to anon, authenticated;

-- Tiempo real
alter publication supabase_realtime add table public.app_state;
