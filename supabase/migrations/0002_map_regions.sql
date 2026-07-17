-- Shared spatial-regions layer. The *shape* (a named set of polygons plus their
-- adjacency graph) is reusable across any game that partitions the city into
-- zones -- Turf War's SF neighborhoods today, Territory Control's districts
-- later -- but each game points at its own region_set rather than assuming one
-- fixed dataset. Games with no spatial component (e.g. Lockout) never
-- reference these tables.

create table map_region_sets (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  source text,
  created_at timestamptz not null default now()
);

create table map_regions (
  id uuid primary key default gen_random_uuid(),
  region_set_id uuid not null references map_region_sets (id) on delete cascade,
  slug text not null,
  name text not null,
  geometry jsonb not null,
  centroid_lat double precision not null,
  centroid_lng double precision not null,
  created_at timestamptz not null default now(),
  unique (region_set_id, slug)
);

create table map_region_adjacency (
  region_id uuid not null references map_regions (id) on delete cascade,
  neighbor_id uuid not null references map_regions (id) on delete cascade,
  primary key (region_id, neighbor_id)
);
-- Both directions are stored as separate rows so adjacency lookups never need
-- a UNION; scoping to one region_set falls out naturally since both ids join
-- through map_regions.

create index map_regions_region_set_id_idx on map_regions (region_set_id);

alter table map_region_sets enable row level security;
alter table map_regions enable row level security;
alter table map_region_adjacency enable row level security;

-- Reference data: publicly readable, never written by the app (seeded once
-- per region_set via a one-time ingestion script).
create policy "map_region_sets are publicly readable"
  on map_region_sets for select using (true);

create policy "map_regions are publicly readable"
  on map_regions for select using (true);

create policy "map_region_adjacency is publicly readable"
  on map_region_adjacency for select using (true);
