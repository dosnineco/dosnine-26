-- Create storage bucket for agent verification documents (ADMIN ONLY ACCESS)
INSERT INTO storage.buckets (id, name, public)
VALUES ('agent-documents', 'agent-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for agent verification documents
-- CRITICAL: Only admins can view documents to maintain security during verification

-- Policy 1: Authenticated users can upload documents (during registration)
CREATE POLICY "Users can upload verification documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'agent-documents'
);

-- Policy 2: ONLY ADMINS can view all verification documents
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

-- Policy 3: ONLY ADMINS can delete documents
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

-- Update users table to store document file paths
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS agent_license_file_url TEXT,
ADD COLUMN IF NOT EXISTS agent_registration_file_url TEXT;

-- Add comments
COMMENT ON COLUMN public.users.agent_license_file_url IS 'Storage path to agent license image (admin-only access)';
COMMENT ON COLUMN public.users.agent_registration_file_url IS 'Storage path to business registration or government ID image (admin-only access)';
