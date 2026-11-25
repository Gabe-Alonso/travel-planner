-- =====================================================================
-- Trip Planner – Supabase schema
-- Run this whole file once in: Supabase Dashboard → SQL Editor → New query
-- It is safe to re-run (drops/recreates policies, functions and triggers).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url   text,
  email        text,
  created_at   timestamptz not null default now()
);

create table if not exists public.trips (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null check (char_length(name) between 1 and 100),
  description            text,
  start_date             date,
  end_date               date,
  invite_code            text not null unique default replace(gen_random_uuid()::text, '-', ''),
  vote_deadline          timestamptz,
  decided_destination_id uuid,
  created_by             uuid references public.profiles (id) on delete set null,
  created_at             timestamptz not null default now()
);

create table if not exists public.trip_members (
  trip_id   uuid not null references public.trips (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  role      text not null default 'member' check (role in ('leader', 'member')),
  joined_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);
create index if not exists trip_members_user_idx on public.trip_members (user_id);

create table if not exists public.destinations (
  id            uuid primary key default gen_random_uuid(),
  trip_id       uuid not null references public.trips (id) on delete cascade,
  name          text not null,
  region        text,
  country       text,
  country_code  text,
  latitude      double precision,
  longitude     double precision,
  thumbnail_url text,
  added_by      uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (id, trip_id)
);
create unique index if not exists destinations_unique_per_trip
  on public.destinations (trip_id, lower(name), coalesce(region, ''), coalesce(country, ''));

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'trips_decided_destination_fkey') then
    alter table public.trips
      add constraint trips_decided_destination_fkey
      foreign key (decided_destination_id, id) references public.destinations (id, trip_id)
      on delete set null (decided_destination_id);
  end if;
end $$;

create table if not exists public.votes (
  trip_id        uuid not null references public.trips (id) on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  destination_id uuid not null,
  created_at     timestamptz not null default now(),
  primary key (trip_id, user_id),
  foreign key (destination_id, trip_id) references public.destinations (id, trip_id) on delete cascade
);

create table if not exists public.places (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips (id) on delete cascade,
  name        text not null,
  url         text,
  image_url   text,
  site_name   text,
  category    text,
  notes       text,
  added_by    uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists places_trip_idx on public.places (trip_id);

create table if not exists public.housing (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips (id) on delete cascade,
  name        text not null,
  url         text,
  image_url   text,
  site_name   text,
  price       text,
  notes       text,
  added_by    uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists housing_trip_idx on public.housing (trip_id);

-- ---------------------------------------------------------------------
-- Profiles are created automatically when someone signs up
-- ---------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url, email)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(new.email, '@', 1)
    ),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep provider profile pictures fresh (e.g. after linking Google to an email account)
create or replace function public.handle_user_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_avatar text := coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture');
begin
  if new_avatar is not null then
    update public.profiles set avatar_url = new_avatar where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of raw_user_meta_data on auth.users
  for each row execute function public.handle_user_updated();

-- ---------------------------------------------------------------------
-- Helper functions used by row level security
-- (security definer so they can read trip_members without recursion)
-- ---------------------------------------------------------------------

create or replace function public.is_trip_member(p_trip uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from trip_members where trip_id = p_trip and user_id = auth.uid());
$$;

create or replace function public.is_trip_leader(p_trip uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from trip_members where trip_id = p_trip and user_id = auth.uid() and role = 'leader'
  );
$$;

create or replace function public.shares_trip_with(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from trip_members a
    join trip_members b on a.trip_id = b.trip_id
    where a.user_id = auth.uid() and b.user_id = p_user
  );
$$;

create or replace function public.voting_open(p_trip uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select decided_destination_id is null and (vote_deadline is null or vote_deadline > now())
     from trips where id = p_trip),
    false
  );
$$;

-- ---------------------------------------------------------------------
-- RPCs called by the app
-- ---------------------------------------------------------------------

-- Create a trip and make the creator its group leader
create or replace function public.create_trip(p_name text, p_description text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  insert into trips (name, description, created_by)
  values (trim(p_name), nullif(trim(coalesce(p_description, '')), ''), auth.uid())
  returning id into new_id;
  insert into trip_members (trip_id, user_id, role) values (new_id, auth.uid(), 'leader');
  return new_id;
end;
$$;

-- Look up a trip by invite code (so the invite page can show what you're joining)
create or replace function public.get_invite_preview(p_code text)
returns table (trip_id uuid, trip_name text, leader_name text, member_count bigint, already_member boolean)
language sql stable security definer set search_path = public as $$
  select
    t.id,
    t.name,
    (select p.display_name from trip_members m join profiles p on p.id = m.user_id
      where m.trip_id = t.id and m.role = 'leader' order by m.joined_at limit 1),
    (select count(*) from trip_members m where m.trip_id = t.id),
    exists (select 1 from trip_members m where m.trip_id = t.id and m.user_id = auth.uid())
  from trips t
  where t.invite_code = p_code and auth.uid() is not null;
$$;

-- Join a trip through its invite code
create or replace function public.join_trip(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  t_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  select id into t_id from trips where invite_code = p_code;
  if t_id is null then
    raise exception 'This invite link is invalid or has been reset';
  end if;
  insert into trip_members (trip_id, user_id, role)
  values (t_id, auth.uid(), 'member')
  on conflict do nothing;
  return t_id;
end;
$$;

-- When the voting deadline has passed, lock in the winner (unless it's a tie)
create or replace function public.finalize_vote(p_trip uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  t trips%rowtype;
  top_id uuid;
  top_count bigint;
  tie_count int;
begin
  if not is_trip_member(p_trip) then
    raise exception 'Not a member of this trip';
  end if;
  select * into t from trips where id = p_trip for update;
  if t.decided_destination_id is not null then
    return t.decided_destination_id;
  end if;
  if t.vote_deadline is null or t.vote_deadline > now() then
    return null;
  end if;

  select max(c) into top_count from (
    select count(*) c from votes where trip_id = p_trip group by destination_id
  ) s;
  if top_count is null then
    return null; -- nobody voted
  end if;

  select count(*) into tie_count from (
    select destination_id from votes where trip_id = p_trip
    group by destination_id having count(*) = top_count
  ) s;
  if tie_count > 1 then
    return null; -- tie: the group leader has to break it in settings
  end if;

  select destination_id into top_id from votes where trip_id = p_trip
  group by destination_id having count(*) = top_count;

  update trips set decided_destination_id = top_id where id = p_trip;
  return top_id;
end;
$$;

-- Every trip must always keep at least one group leader
create or replace function public.ensure_trip_has_leader()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  t_id uuid := coalesce(old.trip_id, new.trip_id);
begin
  if exists (select 1 from trips where id = t_id)
     and not exists (select 1 from trip_members where trip_id = t_id and role = 'leader') then
    raise exception 'A trip needs at least one group leader. Make someone else group leader first (or delete the trip).';
  end if;
  return null;
end;
$$;

drop trigger if exists trip_members_keep_leader on public.trip_members;
create trigger trip_members_keep_leader
  after update or delete on public.trip_members
  for each row execute function public.ensure_trip_has_leader();

-- ---------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------

alter table public.profiles     enable row level security;
alter table public.trips        enable row level security;
alter table public.trip_members enable row level security;
alter table public.destinations enable row level security;
alter table public.votes        enable row level security;
alter table public.places       enable row level security;
alter table public.housing      enable row level security;

-- profiles
drop policy if exists "profiles: read self and trip-mates" on public.profiles;
create policy "profiles: read self and trip-mates" on public.profiles
  for select to authenticated using (id = auth.uid() or public.shares_trip_with(id));
drop policy if exists "profiles: update self" on public.profiles;
create policy "profiles: update self" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- trips (creation goes through create_trip())
drop policy if exists "trips: members read" on public.trips;
create policy "trips: members read" on public.trips
  for select to authenticated using (public.is_trip_member(id));
drop policy if exists "trips: leaders update" on public.trips;
create policy "trips: leaders update" on public.trips
  for update to authenticated using (public.is_trip_leader(id)) with check (public.is_trip_leader(id));
drop policy if exists "trips: leaders delete" on public.trips;
create policy "trips: leaders delete" on public.trips
  for delete to authenticated using (public.is_trip_leader(id));

-- trip_members (joining goes through join_trip())
drop policy if exists "members: members read" on public.trip_members;
create policy "members: members read" on public.trip_members
  for select to authenticated using (public.is_trip_member(trip_id));
drop policy if exists "members: leaders change roles" on public.trip_members;
create policy "members: leaders change roles" on public.trip_members
  for update to authenticated using (public.is_trip_leader(trip_id)) with check (public.is_trip_leader(trip_id));
drop policy if exists "members: leaders remove or self leave" on public.trip_members;
create policy "members: leaders remove or self leave" on public.trip_members
  for delete to authenticated using (public.is_trip_leader(trip_id) or user_id = auth.uid());

-- destinations
drop policy if exists "destinations: members read" on public.destinations;
create policy "destinations: members read" on public.destinations
  for select to authenticated using (public.is_trip_member(trip_id));
drop policy if exists "destinations: members add while voting open" on public.destinations;
create policy "destinations: members add while voting open" on public.destinations
  for insert to authenticated with check (
    added_by = auth.uid()
    and public.is_trip_member(trip_id)
    and (public.voting_open(trip_id) or public.is_trip_leader(trip_id))
  );
drop policy if exists "destinations: adder or leader delete" on public.destinations;
create policy "destinations: adder or leader delete" on public.destinations
  for delete to authenticated using (
    (added_by = auth.uid() and public.voting_open(trip_id)) or public.is_trip_leader(trip_id)
  );

-- votes
drop policy if exists "votes: members read" on public.votes;
create policy "votes: members read" on public.votes
  for select to authenticated using (public.is_trip_member(trip_id));
drop policy if exists "votes: cast own while open" on public.votes;
create policy "votes: cast own while open" on public.votes
  for insert to authenticated with check (
    user_id = auth.uid() and public.is_trip_member(trip_id) and public.voting_open(trip_id)
  );
drop policy if exists "votes: change own while open" on public.votes;
create policy "votes: change own while open" on public.votes
  for update to authenticated
  using (user_id = auth.uid() and public.voting_open(trip_id))
  with check (user_id = auth.uid() and public.voting_open(trip_id));
drop policy if exists "votes: remove own while open" on public.votes;
create policy "votes: remove own while open" on public.votes
  for delete to authenticated using (user_id = auth.uid() and public.voting_open(trip_id));

-- places
drop policy if exists "places: members read" on public.places;
create policy "places: members read" on public.places
  for select to authenticated using (public.is_trip_member(trip_id));
drop policy if exists "places: members add" on public.places;
create policy "places: members add" on public.places
  for insert to authenticated with check (added_by = auth.uid() and public.is_trip_member(trip_id));
drop policy if exists "places: adder or leader edit" on public.places;
create policy "places: adder or leader edit" on public.places
  for update to authenticated
  using (added_by = auth.uid() or public.is_trip_leader(trip_id))
  with check (public.is_trip_member(trip_id));
drop policy if exists "places: adder or leader delete" on public.places;
create policy "places: adder or leader delete" on public.places
  for delete to authenticated using (added_by = auth.uid() or public.is_trip_leader(trip_id));

-- housing
drop policy if exists "housing: members read" on public.housing;
create policy "housing: members read" on public.housing
  for select to authenticated using (public.is_trip_member(trip_id));
drop policy if exists "housing: members add" on public.housing;
create policy "housing: members add" on public.housing
  for insert to authenticated with check (added_by = auth.uid() and public.is_trip_member(trip_id));
drop policy if exists "housing: adder or leader edit" on public.housing;
create policy "housing: adder or leader edit" on public.housing
  for update to authenticated
  using (added_by = auth.uid() or public.is_trip_leader(trip_id))
  with check (public.is_trip_member(trip_id));
drop policy if exists "housing: adder or leader delete" on public.housing;
create policy "housing: adder or leader delete" on public.housing
  for delete to authenticated using (added_by = auth.uid() or public.is_trip_leader(trip_id));

-- ---------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------
revoke execute on function public.create_trip(text, text) from public, anon;
revoke execute on function public.join_trip(text) from public, anon;
revoke execute on function public.get_invite_preview(text) from public, anon;
revoke execute on function public.finalize_vote(uuid) from public, anon;
grant execute on function public.create_trip(text, text) to authenticated;
grant execute on function public.join_trip(text) to authenticated;
grant execute on function public.get_invite_preview(text) to authenticated;
grant execute on function public.finalize_vote(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Realtime (live vote updates)
-- ---------------------------------------------------------------------
do $$
declare
  tbl text;
begin
  foreach tbl in array array['votes', 'destinations', 'places', 'housing', 'trips', 'trip_members'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    end if;
  end loop;
end $$;
