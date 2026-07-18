-- Challenge content moves out of the DB entirely and into git
-- (content/lockout-challenges.ts, content/turf-war-challenges.ts) -- static
-- reference text that's never mutated at runtime doesn't need to be a DB
-- table, and this way it's editable with zero commands: edit the file, push
-- to main (see .github/workflows/deploy-functions.yml for how lockout-start
-- picks up the change).

-- lockout_cells: store the assigned prompt text directly (denormalized,
-- copied at game-start time) instead of a challenge_id FK -- there's no
-- longer a lockout_challenges table to reference. Backfill existing rows
-- from the join before dropping the column, so no test-game history is lost.
alter table lockout_cells add column prompt text;

update lockout_cells c
set prompt = lc.prompt
from lockout_challenges lc
where lc.id = c.challenge_id;

alter table lockout_cells alter column prompt set not null;
alter table lockout_cells drop column challenge_id;

drop table lockout_challenges;
drop table turf_war_challenges;
