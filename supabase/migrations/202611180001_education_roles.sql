-- Apply to the existing BOX database before deploying the educational version.
-- Existing users choose their role once on /definir-perfil.
-- New users choose their role at signup. The stored role is authoritative.
begin;

create table if not exists public.box_account_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('teacher', 'student')),
  created_at timestamptz not null default now()
);

alter table public.box_account_roles enable row level security;
revoke all on table public.box_account_roles from public, anon, authenticated;
grant select on table public.box_account_roles to authenticated;
grant select, insert, update, delete on table public.box_account_roles to service_role;

drop policy if exists box_read_own_account_role on public.box_account_roles;
create policy box_read_own_account_role on public.box_account_roles
  for select to authenticated using (user_id = (select auth.uid()));

-- Capture the self-declared role only at account creation, never on metadata updates.
create or replace function public.box_initialize_account_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.box_account_roles (user_id, role)
  values (new.id, case when new.raw_user_meta_data ->> 'box_role' = 'teacher'
                       then 'teacher' else 'student' end)
  on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function public.box_initialize_account_role() from public, anon, authenticated;

drop trigger if exists box_initialize_account_role on auth.users;
create trigger box_initialize_account_role
  after insert on auth.users
  for each row execute function public.box_initialize_account_role();

-- Legacy accounts have no role row. A signed-in user may choose exactly once.
create or replace function public.box_choose_account_role(p_role text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if p_role is null or p_role not in ('teacher', 'student') then
    raise exception 'INVALID_ACCOUNT_ROLE';
  end if;
  insert into public.box_account_roles (user_id, role)
  values (v_user_id, p_role)
  on conflict (user_id) do nothing
  returning role into v_role;
  if v_role is null then
    raise exception 'ACCOUNT_ROLE_ALREADY_DEFINED';
  end if;
  return v_role;
end;
$$;
revoke all on function public.box_choose_account_role(text) from public, anon, authenticated;
grant execute on function public.box_choose_account_role(text) to authenticated;

-- Protect the existing create_room RPC AND direct table inserts, even when the
-- RPC runs as SECURITY DEFINER. Preserve its existing room-code/session logic.
create or replace function public.box_guard_room_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if tg_op = 'UPDATE' then
    if new.owner_id is distinct from old.owner_id then
      raise exception 'ROOM_OWNER_CHANGE_FORBIDDEN' using errcode = '42501';
    end if;
    return new;
  end if;
  if v_user_id is null or new.owner_id is distinct from v_user_id then
    raise exception 'ROOM_OWNER_MISMATCH' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.box_account_roles r
    where r.user_id = v_user_id and r.role = 'teacher'
  ) then
    raise exception 'TEACHER_ONLY' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.box_guard_room_owner() from public, anon, authenticated;

drop trigger if exists box_guard_room_owner on public.rooms;
create trigger box_guard_room_owner
  before insert or update of owner_id on public.rooms
  for each row execute function public.box_guard_room_owner();

-- Room members may read account roles of fellow members. No role is taken
-- from mutable Realtime Presence metadata. This also checks membership.
create or replace function public.box_classroom_roles(p_room_code text)
returns table (user_id uuid, role text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_room_id public.rooms.id%type;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '42501';
  end if;
  select r.id into v_room_id from public.rooms r where r.code = p_room_code;
  if not found or not exists (
    select 1 from public.room_members m
    where m.room_id = v_room_id and m.user_id = auth.uid()
  ) then
    raise exception 'ROOM_ACCESS_DENIED' using errcode = '42501';
  end if;
  return query
    select ar.user_id, ar.role
    from public.box_account_roles ar
    where exists (
      select 1 from public.room_members m
      where m.room_id = v_room_id and m.user_id = ar.user_id
    );
end;
$$;
revoke all on function public.box_classroom_roles(text) from public, anon, authenticated;
grant execute on function public.box_classroom_roles(text) to authenticated;

commit;
