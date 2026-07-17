insert into game_types (slug, name, description, is_active)
values (
  'turf-war',
  'Turf War',
  'Two teams race to claim SF neighborhoods by completing challenges and hold the largest connected territory by the end of the round.',
  true
)
on conflict (slug) do nothing;
