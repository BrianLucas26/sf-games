-- Add "combo" game mode: wins on either bingo or majority, whichever comes first.
alter table lockout_game_state drop constraint lockout_game_state_game_mode_check;
alter table lockout_game_state add constraint lockout_game_state_game_mode_check
  check (game_mode in ('bingo', 'majority', 'combo'));
