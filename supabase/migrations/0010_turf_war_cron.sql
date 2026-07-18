-- Enables the "no host" automation already written in turf_war_tick()
-- (0003_turf_war.sql / 0005_turf_war_replenish.sql): secret-zone drops,
-- expired discard-proposal sweeps, and game-end, all handled on a timer
-- rather than needing any player's browser to stay open as an authority.
create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'turf-war-tick',
  '* * * * *', -- every minute
  $$select turf_war_tick()$$
);
