-- Scaffold only -- no per-game schema yet (see src/games/territory-control/).
-- Seeded active so it shows up on the landing page with a "Coming Soon!"
-- badge (src/lib/comingSoon.ts); it can't actually be created since the
-- create page disables it there too.
insert into game_types (slug, name, description, is_active)
values (
  'territory-control',
  'Territory Control',
  'Complete challenges to claim SF districts -- most districts controlled by the end wins.',
  true
)
on conflict (slug) do nothing;
