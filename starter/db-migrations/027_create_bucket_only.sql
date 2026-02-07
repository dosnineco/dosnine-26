-- Create ONLY the storage bucket for HTV logos
-- Run this first, separately from the table creation

-- Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('htv-logos', 'htv-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public uploads
CREATE POLICY "htv_logos_public_insert"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'htv-logos');

-- Allow public reads
CREATE POLICY "htv_logos_public_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'htv-logos');

-- Allow authenticated deletes
CREATE POLICY "htv_logos_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'htv-logos');
