-- Generic (core-layer) housekeeping: game instances shouldn't linger in the
-- DB forever, for any game type. Runs every 15 minutes via pg_cron.
--   - Lobbies created but never started are swept after 3 hours -- covers a
--     host abandoning the lobby without explicitly cancelling.
--   - Finished games (completed or cancelled) are kept briefly so players
--     can still see final standings, then swept after 12 hours.
--   - Active games older than 24 hours are a safety net for any game type
--     whose own end-of-round logic (e.g. turf_war_tick) didn't fire --
--     should rarely if ever actually trigger.
-- Deleting a games row cascades to teams/players and every per-game-type
-- instance table that references games.id with on delete cascade.
create or replace function cleanup_stale_games()
returns void
language plpgsql
as $$
begin
  delete from games
  where status = 'lobby'
    and created_at < now() - interval '3 hours';

  delete from games
  where status in ('completed', 'cancelled')
    and coalesce(ended_at, created_at) < now() - interval '12 hours';

  delete from games
  where status = 'active'
    and created_at < now() - interval '24 hours';
end;
$$;

-- Same lesson as 0012: explicitly revoke from the named roles, not just
-- "from public" -- Supabase grants EXECUTE on new public-schema functions
-- directly to anon/authenticated by default.
revoke execute on function cleanup_stale_games() from anon, authenticated;

select cron.schedule(
  'cleanup-stale-games',
  '*/15 * * * *',
  $$select cleanup_stale_games()$$
);
