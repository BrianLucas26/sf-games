-- Veto period: a pre-game study window where each team privately queues up
-- to `veto_limit` challenges to swap out before claiming opens. Modeled on
-- Turf War's secret-zone pattern for the hidden per-team state (see 0003).

alter table lockout_game_state add column veto_ends_at timestamptz;
alter table lockout_game_state add column vetoes_resolved boolean not null default false;
alter table lockout_game_state add column veto_limit int not null default 0;

alter table lockout_cells add column replaced_by_veto boolean not null default false;

create table lockout_pending_vetoes (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games (id) on delete cascade,
  team_id uuid not null references teams (id),
  cell_id uuid not null references lockout_cells (id),
  created_at timestamptz not null default now(),
  unique (game_id, team_id, cell_id)
);
-- Secrecy lives ONLY here, same convention as turf_war_secret_zones -- a
-- team's queued vetoes never touch any publicly-readable table until the
-- veto period resolves and lockout_cells itself changes.

create index lockout_pending_vetoes_game_team_idx on lockout_pending_vetoes (game_id, team_id);

alter table lockout_pending_vetoes enable row level security;

create policy "team members can read only their own pending vetoes"
  on lockout_pending_vetoes for select
  using (
    exists (
      select 1 from players p
      where p.auth_user_id = auth.uid()
        and p.game_id = lockout_pending_vetoes.game_id
        and p.team_id = lockout_pending_vetoes.team_id
    )
  );

-- Opt-in to realtime -- required per-table regardless of RLS (see 0008/0019).
alter publication supabase_realtime add table lockout_pending_vetoes;

-- Extend lockout_tick with a safety-net fallback for veto resolution. The
-- normal path is a client's fast-path call to lockout-resolve-vetoes the
-- instant its countdown hits zero (that function needs to read the
-- git-tracked challenge bank, which is only available to the Deno runtime,
-- not pg_cron -- there's no pg_net/http_post wiring in this project to let
-- cron invoke an edge function). So if no client happens to be watching when
-- the window closes, this sweep unblocks claiming after a grace period
-- WITHOUT replacing the vetoed challenges, rather than leaving the game
-- stuck forever.
create or replace function lockout_tick()
returns void
language plpgsql
as $$
declare
  r record;
begin
  for r in
    select g.id as game_id
    from games g
    join lockout_game_state s on s.game_id = g.id
    where g.status = 'active'
  loop
    perform lockout_resolve_game(r.game_id);
  end loop;

  update lockout_game_state
  set vetoes_resolved = true
  where vetoes_resolved = false
    and veto_ends_at is not null
    and veto_ends_at <= now() - interval '2 minutes';
end;
$$;
