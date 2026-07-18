-- Same opt-in requirement as 0008: the Lockout board watches cells (claims)
-- and game_state (sudden death, winner) live.
alter publication supabase_realtime add table lockout_cells;
alter publication supabase_realtime add table lockout_game_state;
