-- Fixed-window rate limiter for the per-game write endpoints that Turnstile
-- doesn't (and shouldn't) cover: claim-zone, claim-cell, undo-claim,
-- select-team, propose-discard, veto-discard, download-game-photos. Turnstile
-- only gates the entry points (create/join) -- once a caller has a real
-- player row, nothing else throttled how many times they could spam these.
-- Keyed by the caller's auth user id (not IP), since every one of these
-- endpoints already resolves the caller via getRequestUser() -- rotating IPs
-- doesn't get a new identity here, only creating a new session would, which
-- Turnstile already gates at join/create time.
create table rate_limit_hits (
  subject text not null,
  action text not null,
  window_start timestamptz not null,
  count int not null default 1,
  primary key (subject, action, window_start)
);

alter table rate_limit_hits enable row level security;
-- No policies: only the service-role client (which bypasses RLS) ever
-- touches this table -- it's never read or written from the browser.

-- Atomic increment-and-read in one statement so concurrent requests in the
-- same window can't race past each other.
create or replace function increment_rate_limit(p_subject text, p_action text, p_window_start timestamptz)
returns int
language sql
as $$
  insert into rate_limit_hits (subject, action, window_start, count)
  values (p_subject, p_action, p_window_start, 1)
  on conflict (subject, action, window_start)
  do update set count = rate_limit_hits.count + 1
  returning count;
$$;

revoke execute on function increment_rate_limit(text, text, timestamptz) from public, anon, authenticated;

create or replace function cleanup_rate_limit_hits()
returns void
language sql
as $$
  delete from rate_limit_hits where window_start < now() - interval '1 hour';
$$;

revoke execute on function cleanup_rate_limit_hits() from public, anon, authenticated;

select cron.schedule(
  'cleanup-rate-limit-hits',
  '0 * * * *', -- hourly
  $$select cleanup_rate_limit_hits()$$
);
