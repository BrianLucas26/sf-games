-- The upload policy in 0004_storage.sql only checks auth.role() =
-- 'authenticated', which a trivial anonymous session satisfies -- and
-- Storage writes go straight through Supabase's Storage API, bypassing
-- edge functions entirely. Without a size/type limit, that's an open door
-- for a bot to fill the bucket with arbitrarily large or non-image files.
-- 10MB comfortably covers a real phone photo (even uncompressed HEIC/JPEG
-- at max resolution) with headroom, while capping worst-case abuse per file.
update storage.buckets
set file_size_limit = 10485760, -- 10 MiB
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
where id = 'turf-war-claim-photos';
