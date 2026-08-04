-- Widen Lockout's board size options from 3-5 to 3-7.
alter table lockout_game_state drop constraint lockout_game_state_board_size_check;
alter table lockout_game_state add constraint lockout_game_state_board_size_check
  check (board_size in (3, 4, 5, 6, 7));
