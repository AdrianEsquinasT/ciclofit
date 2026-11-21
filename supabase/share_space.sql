-- COMPARTIR espacio entre vosotros dos (ejecutar UNA vez, tras crear ambas cuentas).
-- Cambia los dos correos. La cuenta B pasa a usar el espacio de la A.
do $$
declare a uuid; b uuid; sa uuid;
begin
  select id into a from auth.users where email = 'CORREO_A@ejemplo.com';
  select id into b from auth.users where email = 'CORREO_B@ejemplo.com';
  if a is null or b is null then raise exception 'No se encuentra alguno de los correos'; end if;
  select space_id into sa from public.space_members where user_id = a;
  delete from public.spaces where id = (select space_id from public.space_members where user_id = b) and id <> sa;
  insert into public.space_members (user_id, space_id) values (b, sa)
    on conflict (user_id) do update set space_id = excluded.space_id;
end $$;
