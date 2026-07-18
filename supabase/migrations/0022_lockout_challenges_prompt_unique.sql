-- Lets scripts/sync-lockout-challenges.mjs upsert by prompt text (see
-- supabase/seed/lockout-challenges.json) instead of only ever inserting.
alter table lockout_challenges add constraint lockout_challenges_prompt_key unique (prompt);
