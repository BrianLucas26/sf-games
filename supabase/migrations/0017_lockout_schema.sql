-- Lockout: a simple shared NxN challenge board, no map/geography involved.
-- lockout_challenges is reference content (same tier as turf_war_challenges);
-- lockout_cells/lockout_game_state are per-game-instance state.

create table lockout_challenges (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table lockout_cells (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games (id) on delete cascade,
  position int not null, -- 0-indexed, row-major: row = position / board_size, col = position % board_size
  challenge_id uuid not null references lockout_challenges (id),
  claimed_by_team_id uuid references teams (id),
  claimed_by_player_id uuid references players (id),
  claimed_at timestamptz,
  unique (game_id, position)
);
-- Both teams see the same grid -- no secrecy layer at all, unlike Turf War.

create table lockout_game_state (
  game_id uuid primary key references games (id) on delete cascade,
  board_size int not null check (board_size in (3, 4, 5)),
  game_mode text not null check (game_mode in ('bingo', 'majority')),
  tie_breaker text not null check (tie_breaker in ('tie', 'sudden_death', 'first_to_score')),
  round_ends_at timestamptz not null,
  sudden_death_active boolean not null default false,
  winner_team_id uuid references teams (id),
  ended_reason text check (ended_reason in
    ('bingo', 'majority', 'time_limit', 'time_limit_tie', 'time_limit_tiebreak', 'sudden_death'))
);

create index lockout_cells_game_id_idx on lockout_cells (game_id);

alter table lockout_challenges enable row level security;
alter table lockout_cells enable row level security;
alter table lockout_game_state enable row level security;

create policy "lockout_challenges are publicly readable"
  on lockout_challenges for select using (true);

create policy "lockout_cells are publicly readable"
  on lockout_cells for select using (true);

create policy "lockout_game_state is publicly readable"
  on lockout_game_state for select using (true);
