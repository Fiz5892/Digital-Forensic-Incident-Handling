-- Create storage bucket for evidence files
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidence-files',
  'evidence-files',
  false,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/zip', 'application/x-rar-compressed', 'video/mp4', 'video/quicktime', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
);

-- RLS policies for evidence files bucket
create policy "Authenticated users can view evidence files"
on storage.objects
for select
using (
  bucket_id = 'evidence-files' 
  and auth.uid() is not null
);

create policy "Admins and investigators can upload evidence files"
on storage.objects
for insert
with check (
  bucket_id = 'evidence-files'
  and (
    has_role(auth.uid(), 'admin'::app_role) 
    or has_role(auth.uid(), 'investigator'::app_role)
  )
);

create policy "Admins and investigators can update evidence files"
on storage.objects
for update
using (
  bucket_id = 'evidence-files'
  and (
    has_role(auth.uid(), 'admin'::app_role) 
    or has_role(auth.uid(), 'investigator'::app_role)
  )
);

create policy "Admins can delete evidence files"
on storage.objects
for delete
using (
  bucket_id = 'evidence-files'
  and has_role(auth.uid(), 'admin'::app_role)
);