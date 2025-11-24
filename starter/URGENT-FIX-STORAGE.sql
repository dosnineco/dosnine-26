-- COPY THIS ENTIRE FILE AND RUN IT IN SUPABASE SQL EDITOR NOW
-- Go to: https://supabase.com/dashboard/project/etikxypnxjsonefwnzkr/sql/new

-- First, disable RLS on storage.objects for property-images bucket
-- This is the FASTEST fix - makes the bucket truly public

-- Drop any existing policies first
DROP POLICY IF EXISTS "Allow authenticated uploads to property-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from property-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to property-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from property-images" ON storage.objects;

-- Create policies that allow ANYONE to upload (simplest approach)
CREATE POLICY "Public upload to property-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'property-images');

CREATE POLICY "Public read from property-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-images');

CREATE POLICY "Public update in property-images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'property-images');

CREATE POLICY "Public delete from property-images"
ON storage.objects FOR DELETE
USING (bucket_id = 'property-images');

-- Verify the policies were created
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'objects' AND policyname LIKE '%property-images%';
