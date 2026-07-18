-- Superseded as the primary mechanism by the cleanup-games edge function:
-- deleting Storage *files* (not just their DB metadata rows) needs the
-- Storage API, which plain SQL can't call. Rescheduled at a much longer
-- interval as a pure safety net in case the edge function's GitHub Actions
-- trigger stops running for an extended period -- DB bloat is prevented
-- either way, but in that rare failure scenario this SQL-only path can
-- delete a game's rows before the edge function ever gets a chance to
-- preserve its photos, so it's a last resort, not the primary path.
select cron.unschedule('cleanup-stale-games');

select cron.schedule(
  'cleanup-stale-games-fallback',
  '0 */6 * * *', -- every 6 hours
  $$select cleanup_stale_games()$$
);

-- Read-only: returns ids of games that should be swept, using the exact
-- same staleness rules as cleanup_stale_games(). The cleanup-games edge
-- function (triggered every 15 minutes by GitHub Actions) calls this via
-- RPC to decide what to clean up, then handles Storage + DB deletion
-- together so photos are never orphaned in normal operation.
create or replace function stale_game_ids()
returns setof uuid
language sql
stable
as $$
  select id from games
  where status = 'lobby'
    and created_at < now() - interval '3 hours'
  union
  select id from games
  where status in ('completed', 'cancelled')
    and coalesce(ended_at, created_at) < now() - interval '12 hours'
  union
  select id from games
  where status = 'active'
    and created_at < now() - interval '24 hours';
$$;

revoke execute on function stale_game_ids() from public, anon, authenticated;
