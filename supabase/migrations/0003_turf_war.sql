-- Turf War: reference content (turf_war_challenges) + per-game-instance state.
-- Everything here is keyed off games.id (via turf_war_zones.game_id) except
-- turf_war_challenges, which is static content authored once per neighborhood
-- and reused by every Turf War session, same tier as the map_regions data.

create table turf_war_challenges (
  region_id uuid primary key references map_regions (id) on delete cascade,
  prompt text not null,
  created_at timestamptz not null default now()
);

create table turf_war_zones (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games (id) on delete cascade,
  region_id uuid not null references map_regions (id),
  status text not null default 'locked'
    check (status in ('locked', 'open', 'claimed', 'discarded')),
  owning_team_id uuid references teams (id),
  draw_position int not null,
  opened_at timestamptz,
  claimed_at timestamptz,
  discarded_at timestamptz,
  unique (game_id, region_id),
  unique (game_id, draw_position)
);
-- One row per neighborhood per game, all created 'locked' at game start.
-- Challenge text comes from joining turf_war_challenges on region_id.

create table turf_war_captures (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games (id) on delete cascade,
  zone_id uuid not null references turf_war_zones (id),
  team_id uuid not null references teams (id),
  player_id uuid not null references players (id),
  verification_mode text not null check (verification_mode in ('none', 'gps', 'gps_photo')),
  submitted_lat double precision,
  submitted_lng double precision,
  distance_meters double precision,
  photo_url text,
  created_at timestamptz not null default now()
);
-- The audit / paper-trail record -- one row per successful claim, public or secret.

create table turf_war_discard_proposals (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games (id) on delete cascade,
  capture_id uuid not null references turf_war_captures (id),
  target_zone_id uuid not null references turf_war_zones (id),
  status text not null default 'pending'
    check (status in ('pending', 'vetoed', 'applied')),
  proposed_at timestamptz not null default now(),
  expires_at timestamptz not null,
  resolved_at timestamptz,
  veto_by_player_id uuid references players (id)
);
-- One row per discard attempt tied to the capture that earned it. If a
-- sibling row for the same capture_id is already 'vetoed', the edge function
-- applies a new proposal immediately instead of opening another veto window --
-- veto is spent once per capture, not once per proposal.

create table turf_war_secret_zones (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games (id) on delete cascade,
  team_id uuid not null references teams (id),
  zone_id uuid not null references turf_war_zones (id),
  assigned_at timestamptz not null default now(),
  claimed_at timestamptz
);
-- Secrecy lives ONLY here. turf_war_zones.status for a secretly-targeted
-- neighborhood stays 'locked' publicly and never changes when a secret is
-- assigned, so the shared board can't leak it even at the raw-query level.

create table turf_war_game_state (
  game_id uuid primary key references games (id) on delete cascade,
  open_slot_target int not null,
  secret_interval_minutes int not null,
  verification_mode text not null check (verification_mode in ('none', 'gps', 'gps_photo')),
  gps_threshold_meters int,
  round_ends_at timestamptz not null,
  last_secret_tick_at timestamptz not null default now()
);
-- Host-configured values (X, Y, duration, verification) are copied here from
-- games.settings at start-game time, alongside the two mutable runtime fields.

create index turf_war_zones_game_id_idx on turf_war_zones (game_id);
create index turf_war_zones_status_idx on turf_war_zones (game_id, status);
create index turf_war_captures_game_id_idx on turf_war_captures (game_id);
create index turf_war_discard_proposals_game_id_idx on turf_war_discard_proposals (game_id);
create index turf_war_discard_proposals_capture_id_idx on turf_war_discard_proposals (capture_id);
create index turf_war_secret_zones_game_team_idx on turf_war_secret_zones (game_id, team_id);

alter table turf_war_challenges enable row level security;
alter table turf_war_zones enable row level security;
alter table turf_war_captures enable row level security;
alter table turf_war_discard_proposals enable row level security;
alter table turf_war_secret_zones enable row level security;
alter table turf_war_game_state enable row level security;

create policy "turf_war_challenges are publicly readable"
  on turf_war_challenges for select using (true);

create policy "turf_war_zones are publicly readable"
  on turf_war_zones for select using (true);

create policy "turf_war_captures are publicly readable"
  on turf_war_captures for select using (true);

create policy "turf_war_discard_proposals are publicly readable"
  on turf_war_discard_proposals for select using (true);

create policy "turf_war_game_state is publicly readable"
  on turf_war_game_state for select using (true);

-- The one confidential table: only players on the owning team can read their
-- team's secret zone assignments. Requires the player to be signed in via
-- Supabase anonymous auth and linked to their players row (auth_user_id).
create policy "team members can read only their own secret zones"
  on turf_war_secret_zones for select
  using (
    exists (
      select 1 from players p
      where p.auth_user_id = auth.uid()
        and p.game_id = turf_war_secret_zones.game_id
        and p.team_id = turf_war_secret_zones.team_id
    )
  );

-- Largest connected cluster per team, for the live scoreboard. Single source
-- of truth in Postgres rather than duplicating graph logic client-side.
create or replace function turf_war_team_standings(p_game_id uuid)
returns table (team_id uuid, claimed_count int, largest_cluster_size int)
language sql
stable
as $$
  with recursive
  claimed as (
    select z.id as zone_id, z.region_id, z.owning_team_id
    from turf_war_zones z
    where z.game_id = p_game_id and z.status = 'claimed'
  ),
  same_team_edges as (
    select c1.zone_id as zone_id, c2.zone_id as neighbor_zone_id
    from claimed c1
    join map_region_adjacency adj on adj.region_id = c1.region_id
    join claimed c2
      on c2.region_id = adj.neighbor_id
     and c2.owning_team_id = c1.owning_team_id
  ),
  reachable (start_zone_id, reached_zone_id) as (
    select zone_id, zone_id from claimed
    union
    select r.start_zone_id, e.neighbor_zone_id
    from reachable r
    join same_team_edges e on e.zone_id = r.reached_zone_id
  ),
  cluster_sizes as (
    select start_zone_id, count(distinct reached_zone_id) as cluster_size
    from reachable
    group by start_zone_id
  ),
  per_team_max as (
    select c.owning_team_id as team_id, max(cs.cluster_size) as largest_cluster_size
    from cluster_sizes cs
    join claimed c on c.zone_id = cs.start_zone_id
    group by c.owning_team_id
  ),
  counts as (
    select owning_team_id as team_id, count(*) as claimed_count
    from claimed
    group by owning_team_id
  )
  select t.id as team_id,
         coalesce(co.claimed_count, 0)::int as claimed_count,
         coalesce(pm.largest_cluster_size, 0)::int as largest_cluster_size
  from teams t
  left join counts co on co.team_id = t.id
  left join per_team_max pm on pm.team_id = t.id
  where t.game_id = p_game_id;
$$;

-- Automation ("no host"): called every minute by pg_cron once the extension
-- is enabled (Database -> Extensions in the dashboard) and the job scheduled
-- -- see supabase/README.md for the one-time `cron.schedule(...)` snippet.
-- This function has no dependency on pg_cron itself, so it's safe to create
-- here regardless of whether the extension/schedule is set up yet.
create or replace function turf_war_tick()
returns void
language plpgsql
as $$
declare
  gs record;
  t record;
  target_zone_id uuid;
begin
  -- 1) Assign a new secret zone per team for every game whose interval elapsed.
  for gs in
    select gs.*
    from turf_war_game_state gs
    join games g on g.id = gs.game_id
    where g.status = 'active'
      and now() - gs.last_secret_tick_at >= make_interval(mins => gs.secret_interval_minutes)
  loop
    for t in select id from teams where game_id = gs.game_id loop
      select z.id into target_zone_id
      from turf_war_zones z
      where z.game_id = gs.game_id and z.status = 'locked'
      order by random()
      limit 1;

      if target_zone_id is not null then
        insert into turf_war_secret_zones (game_id, team_id, zone_id)
        values (gs.game_id, t.id, target_zone_id);
      end if;
    end loop;

    update turf_war_game_state
    set last_secret_tick_at = now()
    where game_id = gs.game_id;
  end loop;

  -- 2) Safety-net sweep: apply any discard proposals nobody's client resolved
  -- in time (the fast path is the opposing team's own client resolving it the
  -- instant their countdown hits zero).
  update turf_war_zones z
  set status = 'discarded', discarded_at = now()
  from turf_war_discard_proposals p
  where p.target_zone_id = z.id
    and p.status = 'pending'
    and p.expires_at <= now();

  update turf_war_discard_proposals
  set status = 'applied', resolved_at = now()
  where status = 'pending'
    and expires_at <= now();

  -- 3) End games whose round has elapsed.
  update games
  set status = 'completed', ended_at = now()
  where status = 'active'
    and id in (
      select game_id from turf_war_game_state where round_ends_at <= now()
    );
end;
$$;
