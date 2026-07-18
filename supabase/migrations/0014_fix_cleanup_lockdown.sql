-- Postgres auto-grants EXECUTE to the PUBLIC pseudo-role on function
-- creation (distinct from, and in addition to, Supabase's separate default
-- grant of EXECUTE directly to anon/authenticated covered by 0012's fix).
-- 0013 only revoked the named anon/authenticated grants and missed the
-- PUBLIC one, so cleanup_stale_games was still callable via RPC through
-- every role's implicit PUBLIC membership. Revoking from PUBLIC covers all
-- roles at once; verified against information_schema.routine_privileges
-- that no function in this project grants EXECUTE to PUBLIC unless that's
-- intentional (turf_war_team_standings is the one meant to be public).
revoke execute on function cleanup_stale_games() from public;
