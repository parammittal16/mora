-- Private bucket for authenticated intake uploads. Public pages should read
-- through signed URLs or a controlled publishing flow, not by scraping links.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mora-intake-images',
  'mora-intake-images',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can upload their own intake images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'mora-intake-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users can read their own intake images"
on storage.objects for select to authenticated
using (
  bucket_id = 'mora-intake-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users can update their own intake images"
on storage.objects for update to authenticated
using (
  bucket_id = 'mora-intake-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'mora-intake-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users can delete their own intake images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'mora-intake-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
