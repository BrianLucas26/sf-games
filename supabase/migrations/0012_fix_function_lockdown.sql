-- Supabase grants EXECUTE on new public-schema functions directly to the
-- anon and authenticated roles (via ALTER DEFAULT PRIVILEGES), separate from
-- and in addition to the PUBLIC pseudo-role -- `revoke ... from public` in
-- 0005/0011 didn't touch those direct grants, so both functions were still
-- callable by anyone with the publishable key. Revoking from the named roles
-- explicitly actually closes it; verified via information_schema.routine_privileges.
revoke execute on function turf_war_tick() from anon, authenticated;
revoke execute on function turf_war_replenish_open_zones(uuid) from anon, authenticated;
