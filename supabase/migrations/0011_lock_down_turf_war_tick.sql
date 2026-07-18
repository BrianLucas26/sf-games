-- turf_war_tick() is meant to run only via the pg_cron schedule (which
-- executes as the privileged role that created the job, unaffected by this
-- revoke) -- it was never locked down from direct PostgREST RPC calls like
-- its sibling turf_war_replenish_open_zones was, which meant any client with
-- the publishable key could invoke it directly. It would only ever fail
-- (RLS blocks the anon/authenticated role from inserting into
-- turf_war_secret_zones), never succeed maliciously, but it shouldn't be
-- reachable at all.
revoke all on function turf_war_tick() from public;
