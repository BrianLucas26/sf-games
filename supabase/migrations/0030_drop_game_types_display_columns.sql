-- name/description are pure display text -- nothing ever filters, joins, or
-- does business logic on them (unlike slug/id/is_active). Moved to
-- content/game-types.ts, same reasoning as the challenge-content move in
-- 0024_remove_challenge_tables.sql.
alter table game_types drop column name;
alter table game_types drop column description;
