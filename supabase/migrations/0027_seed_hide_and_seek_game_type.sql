-- Scaffold only -- no per-game schema yet (see src/games/hide-and-seek/).
-- Seeded active so it shows up on the landing page with a "Coming Soon!"
-- badge (src/lib/comingSoon.ts); it can't actually be created since the
-- create page disables it there too.
insert into game_types (slug, name, description, is_active)
values (
  'hide-and-seek',
  'Hide and Seek',
  'One team hides across the city while the other searches for them.',
  true
)
on conflict (slug) do nothing;
