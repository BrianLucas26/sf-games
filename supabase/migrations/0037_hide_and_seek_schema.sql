-- Hide and Seek: two teams alternate hiding and seeking over an even number
-- of rounds. Each round: a hiding period (hiders travel, seekers wait), then
-- seeking -- seekers ask questions from the bank in content/hide-and-seek-
-- questions.ts, every answer lets the hiders draw curses from the deck in
-- content/hide-and-seek-curses.ts, and the round's hide time runs from the
-- end of the hiding period until the seekers find them (or the optional seek
-- cap runs out). Question/curse *text* is copied into these tables when used,
-- same denormalize-from-git convention as lockout_cells.prompt (see 0024).
--
-- Secrecy follows turf_war_secret_zones / lockout_pending_vetoes: the hiders'
-- hand and pending draws, and the seekers' map markup, are readable only by
-- that team. The deck itself is readable by nobody (service role only).

create table hide_and_seek_game_state (
  game_id uuid primary key references games (id) on delete cascade,
  hiding_period_minutes int not null check (hiding_period_minutes > 0),
  total_rounds int not null check (total_rounds >= 2 and total_rounds % 2 = 0),
  max_seek_minutes int not null default 0 check (max_seek_minutes >= 0), -- 0 = no cap
  hand_limit int not null check (hand_limit >= 1),
  win_condition text not null check (win_condition in ('total_time', 'longest_single')),
  current_round int not null default 1,
  winner_team_id uuid references teams (id),
  ended_reason text check (ended_reason in ('total_time', 'longest_single', 'tie'))
);

create table hide_and_seek_rounds (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games (id) on delete cascade,
  round_number int not null,
  hider_team_id uuid not null references teams (id),
  seeker_team_id uuid not null references teams (id),
  status text not null default 'active' check (status in ('active', 'completed')),
  hiding_started_at timestamptz not null,
  -- Seeking starts here. The hiding -> seeking switch is derived from now()
  -- vs this column (client and server both), so it needs no tick.
  hiding_ends_at timestamptz not null,
  seek_ends_at timestamptz, -- null = no seek cap
  -- Seekers claim, hiders confirm. The clock stops at the claim, so the
  -- confirmation round-trip doesn't cost the seekers time.
  found_claimed_at timestamptz,
  found_claimed_by_player_id uuid references players (id) on delete set null,
  ended_at timestamptz,
  end_reason text check (end_reason in ('found', 'time_cap')),
  hide_seconds int,
  unique (game_id, round_number)
);

create table hide_and_seek_questions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games (id) on delete cascade,
  round_id uuid not null references hide_and_seek_rounds (id) on delete cascade,
  question_key text not null,
  category text not null,
  prompt text not null,
  answer_options text[], -- null = free-text answer
  draw_count int not null,
  keep_count int not null,
  asked_by_player_id uuid references players (id) on delete set null,
  asked_at timestamptz not null default now(),
  -- Optional: the asking seeker's GPS fix, so hiders can answer relative
  -- questions ("north of us?") against where the seekers actually were.
  asked_from_lat double precision,
  asked_from_lng double precision,
  answer text,
  answered_by_player_id uuid references players (id) on delete set null,
  answered_at timestamptz,
  -- Once per round -- the grayed-out state in the bank is just this row existing.
  unique (round_id, question_key)
);

-- At most one unanswered question per round: the atomic guard against two
-- seekers asking at the same instant.
create unique index hide_and_seek_questions_one_pending_idx
  on hide_and_seek_questions (round_id) where answered_at is null;

-- Draw pile only. Nothing is ever read by a client; reshuffling rebuilds the
-- pile from the content file minus whatever is in the hiders' hand, so there
-- is no discard pile to keep in sync.
create table hide_and_seek_decks (
  round_id uuid primary key references hide_and_seek_rounds (id) on delete cascade,
  game_id uuid not null references games (id) on delete cascade,
  draw_pile text[] not null
);

-- One per answered question: "you drew N, keep K". Resolved once the hiders
-- choose (or when the round ends first).
create table hide_and_seek_curse_offers (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games (id) on delete cascade,
  round_id uuid not null references hide_and_seek_rounds (id) on delete cascade,
  team_id uuid not null references teams (id),
  question_id uuid references hide_and_seek_questions (id) on delete cascade,
  keep_count int not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table hide_and_seek_hand_cards (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games (id) on delete cascade,
  round_id uuid not null references hide_and_seek_rounds (id) on delete cascade,
  team_id uuid not null references teams (id),
  curse_key text not null,
  name text not null,
  description text not null,
  duration_minutes int,
  blocks_questions boolean not null,
  status text not null check (status in ('offered', 'held', 'played', 'discarded')),
  offer_id uuid references hide_and_seek_curse_offers (id) on delete cascade,
  drawn_at timestamptz not null default now()
);

-- Public once played: the seekers need to see what they're under.
create table hide_and_seek_active_curses (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games (id) on delete cascade,
  round_id uuid not null references hide_and_seek_rounds (id) on delete cascade,
  curse_key text not null,
  name text not null,
  description text not null,
  duration_minutes int,
  blocks_questions boolean not null,
  played_by_player_id uuid references players (id) on delete set null,
  played_at timestamptz not null default now(),
  expires_at timestamptz, -- null = task curse, cleared by a seeker
  cleared_at timestamptz,
  cleared_by_player_id uuid references players (id) on delete set null
);

-- Seekers' shared map markup. Soft-deleted (deleted_at) rather than deleted,
-- since realtime DELETE events can't be filtered by game_id and wouldn't
-- reach the other seekers' maps.
create table hide_and_seek_map_marks (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games (id) on delete cascade,
  round_id uuid not null references hide_and_seek_rounds (id) on delete cascade,
  team_id uuid not null references teams (id),
  kind text not null check (kind in ('half_plane', 'circle', 'freehand', 'pin', 'region')),
  data jsonb not null,
  created_by_player_id uuid references players (id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index hide_and_seek_rounds_game_id_idx on hide_and_seek_rounds (game_id);
create index hide_and_seek_questions_round_id_idx on hide_and_seek_questions (round_id);
create index hide_and_seek_curse_offers_round_team_idx on hide_and_seek_curse_offers (round_id, team_id);
create index hide_and_seek_hand_cards_round_team_idx on hide_and_seek_hand_cards (round_id, team_id);
create index hide_and_seek_active_curses_round_id_idx on hide_and_seek_active_curses (round_id);
create index hide_and_seek_map_marks_round_team_idx on hide_and_seek_map_marks (round_id, team_id);

alter table hide_and_seek_game_state enable row level security;
alter table hide_and_seek_rounds enable row level security;
alter table hide_and_seek_questions enable row level security;
alter table hide_and_seek_decks enable row level security;
alter table hide_and_seek_curse_offers enable row level security;
alter table hide_and_seek_hand_cards enable row level security;
alter table hide_and_seek_active_curses enable row level security;
alter table hide_and_seek_map_marks enable row level security;

create policy "hide_and_seek_game_state is publicly readable"
  on hide_and_seek_game_state for select using (true);

create policy "hide_and_seek_rounds are publicly readable"
  on hide_and_seek_rounds for select using (true);

create policy "hide_and_seek_questions are publicly readable"
  on hide_and_seek_questions for select using (true);

create policy "hide_and_seek_active_curses are publicly readable"
  on hide_and_seek_active_curses for select using (true);

-- hide_and_seek_decks: RLS on, no policy -- service role only.

create policy "team members can read only their own curse offers"
  on hide_and_seek_curse_offers for select
  using (
    exists (
      select 1 from players p
      where p.auth_user_id = auth.uid()
        and p.game_id = hide_and_seek_curse_offers.game_id
        and p.team_id = hide_and_seek_curse_offers.team_id
    )
  );

create policy "team members can read only their own hand"
  on hide_and_seek_hand_cards for select
  using (
    exists (
      select 1 from players p
      where p.auth_user_id = auth.uid()
        and p.game_id = hide_and_seek_hand_cards.game_id
        and p.team_id = hide_and_seek_hand_cards.team_id
    )
  );

create policy "team members can read only their own map marks"
  on hide_and_seek_map_marks for select
  using (
    exists (
      select 1 from players p
      where p.auth_user_id = auth.uid()
        and p.game_id = hide_and_seek_map_marks.game_id
        and p.team_id = hide_and_seek_map_marks.team_id
    )
  );

-- Opt-in to realtime -- required per-table regardless of RLS (see 0008).
alter publication supabase_realtime add table hide_and_seek_game_state;
alter publication supabase_realtime add table hide_and_seek_rounds;
alter publication supabase_realtime add table hide_and_seek_questions;
alter publication supabase_realtime add table hide_and_seek_curse_offers;
alter publication supabase_realtime add table hide_and_seek_hand_cards;
alter publication supabase_realtime add table hide_and_seek_active_curses;
alter publication supabase_realtime add table hide_and_seek_map_marks;

-- Ends a round and, if it was the last one, decides the game. Called by the
-- hide-and-seek-found edge function (hiders confirm a find), the
-- hide-and-seek-resolve-round fast path (a client's seek-cap countdown hit
-- zero), and hide_and_seek_tick() below as the pg_cron safety net for the
-- seek cap. Re-checks its own preconditions, so a late or duplicate call is
-- a harmless no-op.
create or replace function hide_and_seek_finish_round(p_round_id uuid, p_reason text)
returns void
language plpgsql
as $$
declare
  r record;
  gs record;
  end_at timestamptz;
  secs int;
  ranked record;
  winner uuid;
  reason text;
begin
  select * into r from hide_and_seek_rounds where id = p_round_id for update;
  if r is null or r.status <> 'active' then return; end if;

  if p_reason = 'found' then
    if r.found_claimed_at is null then return; end if;
    end_at := r.found_claimed_at;
  elsif p_reason = 'time_cap' then
    if r.seek_ends_at is null or now() < r.seek_ends_at then return; end if;
    -- A find claimed before the cap is waiting on the hiders' confirmation --
    -- let them confirm or reject it rather than overriding it here.
    if r.found_claimed_at is not null and r.found_claimed_at < r.seek_ends_at then return; end if;
    end_at := r.seek_ends_at;
  else
    raise exception 'Unknown finish reason: %', p_reason;
  end if;

  secs := greatest(0, floor(extract(epoch from (end_at - r.hiding_ends_at))))::int;

  update hide_and_seek_rounds
  set status = 'completed', ended_at = now(), end_reason = p_reason, hide_seconds = secs
  where id = p_round_id;

  -- Draws still awaiting a keep choice die with the round.
  update hide_and_seek_curse_offers
  set resolved_at = now()
  where round_id = p_round_id and resolved_at is null;

  select * into gs from hide_and_seek_game_state where game_id = r.game_id for update;
  if gs is null or r.round_number < gs.total_rounds then return; end if;

  -- Exactly 2 teams (enforced at hide-and-seek-start) -- [1] is always the
  -- higher score after the ordered array_agg.
  with per_team as (
    select t.id as team_id,
           coalesce(sum(hr.hide_seconds), 0)::int as total_seconds,
           coalesce(max(hr.hide_seconds), 0)::int as best_seconds
    from teams t
    left join hide_and_seek_rounds hr
      on hr.game_id = r.game_id and hr.hider_team_id = t.id and hr.status = 'completed'
    where t.game_id = r.game_id
    group by t.id
  ), scored as (
    select team_id,
           case when gs.win_condition = 'longest_single' then best_seconds else total_seconds end as score
    from per_team
  )
  select array_agg(team_id order by score desc, team_id) as team_ids,
         array_agg(score order by score desc, team_id) as scores
  into ranked
  from scored;

  if ranked.scores[1] > ranked.scores[2] then
    winner := ranked.team_ids[1];
    reason := gs.win_condition;
  else
    winner := null;
    reason := 'tie';
  end if;

  update hide_and_seek_game_state
  set winner_team_id = winner, ended_reason = reason
  where game_id = r.game_id;

  update games set status = 'completed', ended_at = now() where id = r.game_id;
end;
$$;

create or replace function hide_and_seek_tick()
returns void
language plpgsql
as $$
declare
  r record;
begin
  for r in
    select hr.id
    from hide_and_seek_rounds hr
    join games g on g.id = hr.game_id
    where g.status = 'active'
      and hr.status = 'active'
      and hr.seek_ends_at is not null
      and hr.seek_ends_at <= now()
  loop
    perform hide_and_seek_finish_round(r.id, 'time_cap');
  end loop;
end;
$$;

-- One statement each, covering both default grant layers (see 0012/0014).
revoke execute on function hide_and_seek_finish_round(uuid, text) from public, anon, authenticated;
revoke execute on function hide_and_seek_tick() from public, anon, authenticated;

select cron.schedule(
  'hide-and-seek-tick',
  '* * * * *', -- every minute
  $$select hide_and_seek_tick()$$
);
