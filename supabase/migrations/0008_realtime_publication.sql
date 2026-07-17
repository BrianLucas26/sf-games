-- Tables the client subscribes to via supabase-js Realtime (Lobby.tsx watches
-- games/players; the Turf War board watches zones/discard proposals/secret
-- zones) must be explicitly added to the realtime publication -- it's opt-in
-- per table, not automatic just because RLS allows select.
alter publication supabase_realtime add table games;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table teams;
alter publication supabase_realtime add table turf_war_zones;
alter publication supabase_realtime add table turf_war_discard_proposals;
alter publication supabase_realtime add table turf_war_secret_zones;
