insert into game_types (slug, name, description, is_active)
values (
  'lockout',
  'Lockout',
  'Two teams race to complete challenges on a shared board -- first to a bingo or a majority wins.',
  true
)
on conflict (slug) do nothing;
