-- =====================================================================
-- Migration 002: configurable number of votes per person
-- Run once in Supabase → SQL Editor (safe to re-run).
-- Fresh installs get this from schema.sql already.
-- =====================================================================

-- How many votes each member gets (Group Leader setting)
alter table public.trips add column if not exists votes_per_person int not null default 1;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'trips_votes_per_person_range') then
    alter table public.trips
      add constraint trips_votes_per_person_range check (votes_per_person between 1 and 10);
  end if;
end $$;

-- Votes: one row per (person, destination) instead of one row per person
do $$
begin
  if (select array_length(conkey, 1) from pg_constraint
      where conname = 'votes_pkey' and conrelid = 'public.votes'::regclass) = 2 then
    alter table public.votes drop constraint votes_pkey;
    alter table public.votes add primary key (trip_id, user_id, destination_id);
  end if;
end $$;

-- Block votes beyond the trip's limit
create or replace function public.enforce_vote_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  lim int;
  used int;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.trip_id::text || new.user_id::text, 0));
  select votes_per_person into lim from trips where id = new.trip_id;
  select count(*) into used from votes where trip_id = new.trip_id and user_id = new.user_id;
  if used >= coalesce(lim, 1) then
    raise exception 'You''ve used all % of your votes. Remove one first.', coalesce(lim, 1);
  end if;
  return new;
end;
$$;

drop trigger if exists votes_enforce_limit on public.votes;
create trigger votes_enforce_limit
  before insert on public.votes
  for each row execute function public.enforce_vote_limit();

-- When the leader lowers the limit, drop each person's most recent extra votes
create or replace function public.trim_votes_to_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.votes_per_person < old.votes_per_person then
    delete from votes v
    using (
      select user_id, destination_id,
             row_number() over (partition by user_id order by created_at, destination_id) as rn
      from votes
      where trip_id = new.id
    ) r
    where v.trip_id = new.id
      and v.user_id = r.user_id
      and v.destination_id = r.destination_id
      and r.rn > new.votes_per_person;
  end if;
  return new;
end;
$$;

drop trigger if exists trips_trim_votes on public.trips;
create trigger trips_trim_votes
  after update of votes_per_person on public.trips
  for each row execute function public.trim_votes_to_limit();
