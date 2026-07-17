-- Generic lobby/matchmaking layer shared by every game (turf war, hide & seek,
-- scavenger hunt, lockout, ...). Per-game state (e.g. turf war zones) lives in
-- its own migration once that game is built, keyed off games.id.

create table game_types (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table games (
  id uuid primary key default gen_random_uuid(),
  game_type_id uuid not null references game_types (id),
  join_code text unique not null,
  status text not null default 'lobby'
    check (status in ('lobby', 'active', 'completed', 'cancelled')),
  host_id uuid,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz
);

create table teams (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games (id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now()
);

create table players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games (id) on delete cascade,
  team_id uuid references teams (id) on delete set null,
  display_name text not null,
  is_host boolean not null default false,
  auth_user_id uuid references auth.users (id),
  joined_at timestamptz not null default now()
);

create index games_join_code_idx on games (join_code);
create index teams_game_id_idx on teams (game_id);
create index players_game_id_idx on players (game_id);

alter table game_types enable row level security;
alter table games enable row level security;
alter table teams enable row level security;
alter table players enable row level security;

-- Every table is readable by anyone with the anon key: the client renders
-- lobby/game state directly off Postgres. All writes (create game, join,
-- claim a zone, etc.) go through edge functions using the service role key,
-- so game logic and race conditions are handled server-side, not via RLS.
create policy "game_types are publicly readable"
  on game_types for select using (true);

create policy "games are publicly readable"
  on games for select using (true);

create policy "teams are publicly readable"
  on teams for select using (true);

create policy "players are publicly readable"
  on players for select using (true);
