-- Check if agent-documents bucket exists
SELECT * FROM storage.buckets WHERE id = 'agent-documents';

-- If bucket doesn't exist, create it
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agent-documents', 
  'agent-documents', 
  false,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png'];

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can view verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can delete documents" ON storage.objects;

-- Policy 1: Allow authenticated users to upload to agent-documents bucket
CREATE POLICY "Users can upload verification documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'agent-documents');

-- Policy 2: Only admins can view documents
CREATE POLICY "Only admins can view verification documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'agent-documents' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.clerk_id = auth.uid()::text
    AND users.role = 'admin'
  )
);

-- Policy 3: Only admins can delete documents
CREATE POLICY "Only admins can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'agent-documents' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.clerk_id = auth.uid()::text
    AND users.role = 'admin'
  )
);

-- Verify policies are created
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%agent%';
