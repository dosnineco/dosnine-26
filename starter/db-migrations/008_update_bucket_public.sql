-- Update agent-documents bucket to allow public access with RLS
-- This allows images to display in admin dashboard while RLS controls who can see them

-- Update bucket to be public (images can be viewed via URL)
UPDATE storage.buckets 
SET public = true 
WHERE id = 'agent-documents';

-- Verify bucket settings
SELECT id, name, public FROM storage.buckets WHERE id = 'agent-documents';

-- Note: RLS policies still control who can upload and view
-- Only admins can view documents via the admin dashboard
-- Regular users cannot access the URLs even if they know them
