-- Team ordering (Lobby.tsx's left/right layout, Board.tsx's team-color
-- assignment) sorted by created_at -- but create-game inserts both teams
-- in one statement, so they share the exact same now() timestamp. With no
-- tiebreak, ordering silently fell back to physical row order, which an
-- UPDATE (renaming a team) can shift, making a renamed team visibly swap
-- sides/colors. A dedicated position column, set once at creation and
-- never touched again, is a genuinely stable sort key.
alter table teams add column position int not null default 0;

-- Backfill existing rows deterministically (created_at, then id as a
-- tiebreak for any same-timestamp rows) so already-created games don't
-- have every team collapse to position 0.
update teams t
set position = sub.rn
from (
  select id, row_number() over (partition by game_id order by created_at, id) - 1 as rn
  from teams
) sub
where sub.id = t.id;
