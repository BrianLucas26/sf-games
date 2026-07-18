-- Win resolution for the time-limit path (bingo/majority wins are decided
-- synchronously in lockout-claim-cell). Client-triggered fast path calls this
-- via the lockout-resolve-game edge function the instant its countdown hits
-- zero; lockout_tick() below is the pg_cron safety net for when no client is
-- around to trigger it.
create or replace function lockout_resolve_game(p_game_id uuid)
returns void
language plpgsql
as $$
declare
  gs record;
  g record;
  counts record;
  winner uuid;
  reason text;
begin
  select * into gs from lockout_game_state where game_id = p_game_id;
  if gs is null then return; end if;

  select * into g from games where id = p_game_id;
  if g is null or g.status <> 'active' then return; end if;
  if gs.sudden_death_active then return; end if;
  if now() < gs.round_ends_at then return; end if;

  -- Exactly 2 teams (enforced at lockout-start) -- array_agg ordered by
  -- claimed_count desc means [1] is always >= [2].
  with per_team as (
    select t.id as team_id,
           count(c.id)::int as claimed_count,
           max(c.claimed_at) as last_claimed_at
    from teams t
    left join lockout_cells c
      on c.game_id = p_game_id and c.claimed_by_team_id = t.id
    where t.game_id = p_game_id
    group by t.id
  )
  select
    array_agg(team_id order by claimed_count desc, team_id) as team_ids,
    array_agg(claimed_count order by claimed_count desc, team_id) as counts,
    array_agg(last_claimed_at order by claimed_count desc, team_id) as last_claimed_ats
  into counts
  from per_team;

  if counts.counts[1] > counts.counts[2] then
    winner := counts.team_ids[1];
    reason := 'time_limit';
  elsif gs.tie_breaker = 'sudden_death' then
    update lockout_game_state set sudden_death_active = true where game_id = p_game_id;
    return;
  elsif gs.tie_breaker = 'first_to_score' then
    if counts.counts[1] = 0 then
      -- Nobody claimed anything -- no "first" to break the tie on.
      winner := null;
      reason := 'time_limit_tie';
    elsif counts.last_claimed_ats[1] <= counts.last_claimed_ats[2] then
      winner := counts.team_ids[1];
      reason := 'time_limit_tiebreak';
    else
      winner := counts.team_ids[2];
      reason := 'time_limit_tiebreak';
    end if;
  else
    winner := null;
    reason := 'time_limit_tie';
  end if;

  update games set status = 'completed', ended_at = now() where id = p_game_id;
  update lockout_game_state
  set winner_team_id = winner, ended_reason = reason
  where game_id = p_game_id;
end;
$$;

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
end;
$$;

-- Both revokes done in one statement each -- revoking `public` alone or the
-- named roles alone each independently leaves the function callable (see
-- 0011/0012's history): Postgres grants EXECUTE to PUBLIC on creation, and
-- Supabase separately grants EXECUTE directly to anon/authenticated.
revoke execute on function lockout_resolve_game(uuid) from public, anon, authenticated;
revoke execute on function lockout_tick() from public, anon, authenticated;

select cron.schedule(
  'lockout-tick',
  '* * * * *', -- every minute
  $$select lockout_tick()$$
);
