-- Storage for the "gps_photo" verification mode's proof-of-claim photos.
-- Public read (so a post-game recap page can show them), write restricted to
-- signed-in players -- anonymous-auth sessions still carry role 'authenticated'.

insert into storage.buckets (id, name, public)
values ('turf-war-claim-photos', 'turf-war-claim-photos', true)
on conflict (id) do nothing;

create policy "turf war claim photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'turf-war-claim-photos');

create policy "authenticated players can upload turf war claim photos"
  on storage.objects for insert
  with check (
    bucket_id = 'turf-war-claim-photos'
    and auth.role() = 'authenticated'
  );
