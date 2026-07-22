-- Optional longer elaboration for a challenge, shown in the cell detail
-- popup alongside the short prompt already shown on the grid tile itself.
-- Nullable: not every challenge in content/lockout-challenges.ts has one.
alter table lockout_cells add column description text;
