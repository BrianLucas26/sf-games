-- Treasure Island is geographically isolated (no shared border with any
-- other neighborhood in the dataset -- confirmed zero adjacency edges when
-- seeded), which makes it a bad fit for a "largest connected territory"
-- game: it can never join a cluster. Removing it from play entirely rather
-- than leaving it as a permanently-disconnected claimable zone.
--
-- Pre-launch: safe to clear games again (same precedent as 0009) so the
-- region delete below doesn't hit the non-cascading FK from turf_war_zones.
delete from games;

delete from map_regions
where slug = 'treasure-island'
  and region_set_id = (select id from map_region_sets where slug = 'sf-neighborhoods');
