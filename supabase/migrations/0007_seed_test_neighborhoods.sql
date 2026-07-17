-- Placeholder test data for the 'sf-neighborhoods' region set, so the Turf
-- War flow (start/claim/discard/veto/standings) can be smoke-tested before
-- the real SF neighborhoods GeoJSON ingestion (a separate follow-up) lands.
-- A 2x3 grid of dummy squares with grid adjacency -- the real ingestion
-- script is expected to replace these rows entirely.

insert into map_region_sets (slug, name, source)
values ('sf-neighborhoods', 'San Francisco Neighborhoods (PLACEHOLDER TEST DATA)', 'placeholder')
on conflict (slug) do nothing;

insert into map_regions (region_set_id, slug, name, geometry, centroid_lat, centroid_lng)
select rs.id, v.slug, v.name, v.geometry::jsonb, v.centroid_lat, v.centroid_lng
from map_region_sets rs,
  (values
    ('test-a', 'Test Neighborhood A', '{"type":"Polygon","coordinates":[[[-122.45,37.75],[-122.43,37.75],[-122.43,37.77],[-122.45,37.77],[-122.45,37.75]]]}', 37.76, -122.44),
    ('test-b', 'Test Neighborhood B', '{"type":"Polygon","coordinates":[[[-122.43,37.75],[-122.41,37.75],[-122.41,37.77],[-122.43,37.77],[-122.43,37.75]]]}', 37.76, -122.42),
    ('test-c', 'Test Neighborhood C', '{"type":"Polygon","coordinates":[[[-122.41,37.75],[-122.39,37.75],[-122.39,37.77],[-122.41,37.77],[-122.41,37.75]]]}', 37.76, -122.40),
    ('test-d', 'Test Neighborhood D', '{"type":"Polygon","coordinates":[[[-122.45,37.77],[-122.43,37.77],[-122.43,37.79],[-122.45,37.79],[-122.45,37.77]]]}', 37.78, -122.44),
    ('test-e', 'Test Neighborhood E', '{"type":"Polygon","coordinates":[[[-122.43,37.77],[-122.41,37.77],[-122.41,37.79],[-122.43,37.79],[-122.43,37.77]]]}', 37.78, -122.42),
    ('test-f', 'Test Neighborhood F', '{"type":"Polygon","coordinates":[[[-122.41,37.77],[-122.39,37.77],[-122.39,37.79],[-122.41,37.79],[-122.41,37.77]]]}', 37.78, -122.40)
  ) as v(slug, name, geometry, centroid_lat, centroid_lng)
where rs.slug = 'sf-neighborhoods'
on conflict (region_set_id, slug) do nothing;

with pairs (region_slug, neighbor_slug) as (
  values
    ('test-a', 'test-b'), ('test-b', 'test-a'),
    ('test-b', 'test-c'), ('test-c', 'test-b'),
    ('test-d', 'test-e'), ('test-e', 'test-d'),
    ('test-e', 'test-f'), ('test-f', 'test-e'),
    ('test-a', 'test-d'), ('test-d', 'test-a'),
    ('test-b', 'test-e'), ('test-e', 'test-b'),
    ('test-c', 'test-f'), ('test-f', 'test-c')
)
insert into map_region_adjacency (region_id, neighbor_id)
select r1.id, r2.id
from pairs p
join map_regions r1 on r1.slug = p.region_slug
join map_regions r2 on r2.slug = p.neighbor_slug
join map_region_sets rs on rs.id = r1.region_set_id and rs.slug = 'sf-neighborhoods'
on conflict do nothing;

insert into turf_war_challenges (region_id, prompt)
select r.id, 'PLACEHOLDER: take a selfie somewhere in ' || r.name || '.'
from map_regions r
join map_region_sets rs on rs.id = r.region_set_id
where rs.slug = 'sf-neighborhoods'
on conflict (region_id) do nothing;
