-- Replenishing the open pool (back up to open_slot_target) happens from three
-- places: a public claim, a discard being applied, and the pg_cron safety-net
-- sweep. Rather than duplicate the "pick next locked zone by draw_position,
-- skipping anything currently held as an unclaimed secret" logic in each of
-- those callers, it's one Postgres function all of them call.
--
-- security definer + a revoke/grant lets pg_cron's superuser-run tick call it
-- directly, and edge functions call it via RPC using the secret key, while
-- keeping it unreachable from anon/authenticated clients directly -- writes
-- still only ever happen through the edge-function trust boundary.

create or replace function turf_war_replenish_open_zones(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_open_slot_target int;
  v_open_count int;
  v_needed int;
begin
  select open_slot_target into v_open_slot_target
  from turf_war_game_state where game_id = p_game_id;

  if v_open_slot_target is null then
    return;
  end if;

  select count(*) into v_open_count
  from turf_war_zones
  where game_id = p_game_id and status = 'open';

  v_needed := v_open_slot_target - v_open_count;
  if v_needed <= 0 then
    return;
  end if;

  update turf_war_zones z
  set status = 'open', opened_at = now()
  where z.id in (
    select z2.id
    from turf_war_zones z2
    where z2.game_id = p_game_id
      and z2.status = 'locked'
      and not exists (
        select 1 from turf_war_secret_zones sz
        where sz.zone_id = z2.id and sz.claimed_at is null
      )
    order by z2.draw_position asc
    limit v_needed
  );
end;
$$;

revoke all on function turf_war_replenish_open_zones(uuid) from public;
grant execute on function turf_war_replenish_open_zones(uuid) to service_role;

-- Redefine the tick to call the shared replenish function after sweeping any
-- expired discard proposals (each affected game replenishes once, after its
-- discards are applied).
create or replace function turf_war_tick()
returns void
language plpgsql
as $$
declare
  game_state_rec record;
  team_rec record;
  expired_game_rec record;
  target_zone_id uuid;
begin
  -- 1) Assign a new secret zone per team for every game whose interval elapsed.
  for game_state_rec in
    select gs.*
    from turf_war_game_state gs
    join games g on g.id = gs.game_id
    where g.status = 'active'
      and now() - gs.last_secret_tick_at >= make_interval(mins => gs.secret_interval_minutes)
  loop
    for team_rec in select id from teams where game_id = game_state_rec.game_id loop
      select z.id into target_zone_id
      from turf_war_zones z
      where z.game_id = game_state_rec.game_id and z.status = 'locked'
      order by random()
      limit 1;

      if target_zone_id is not null then
        insert into turf_war_secret_zones (game_id, team_id, zone_id)
        values (game_state_rec.game_id, team_rec.id, target_zone_id);
      end if;
    end loop;

    update turf_war_game_state
    set last_secret_tick_at = now()
    where game_id = game_state_rec.game_id;
  end loop;

  -- 2) Safety-net sweep: apply any discard proposals nobody's client resolved
  -- in time, then replenish. The fast path is the opposing team's own client
  -- resolving it the instant their countdown hits zero.
  for expired_game_rec in
    select distinct p.game_id
    from turf_war_discard_proposals p
    where p.status = 'pending' and p.expires_at <= now()
  loop
    update turf_war_zones z
    set status = 'discarded', discarded_at = now()
    from turf_war_discard_proposals p
    where p.target_zone_id = z.id
      and p.game_id = expired_game_rec.game_id
      and p.status = 'pending'
      and p.expires_at <= now();

    update turf_war_discard_proposals
    set status = 'applied', resolved_at = now()
    where game_id = expired_game_rec.game_id
      and status = 'pending'
      and expires_at <= now();

    perform turf_war_replenish_open_zones(expired_game_rec.game_id);
  end loop;

  -- 3) End games whose round has elapsed.
  update games
  set status = 'completed', ended_at = now()
  where status = 'active'
    and id in (
      select game_id from turf_war_game_state where round_ends_at <= now()
    );
end;
$$;
