-- Supabase Storage Policies for property-images bucket
-- Run this in your Supabase SQL Editor

-- 1. Allow authenticated users to INSERT (upload) to property-images bucket
CREATE POLICY "Allow authenticated uploads to property-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'property-images');

-- 2. Allow public READ access to property-images (so images display on site)
CREATE POLICY "Allow public reads from property-images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'property-images');

-- 3. Allow authenticated users to UPDATE their own files
CREATE POLICY "Allow authenticated updates to property-images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'property-images')
WITH CHECK (bucket_id = 'property-images');

-- 4. Allow authenticated users to DELETE their own files
CREATE POLICY "Allow authenticated deletes from property-images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'property-images');
