-- Create storage bucket for agent documents and payment proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('agent-documents', 'agent-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow ANY authenticated user to upload (simpler, no service role needed)
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'agent-documents');

-- Policy: Allow public read access to all agent documents
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'agent-documents');

-- Policy: Allow authenticated users to update documents
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'agent-documents');

-- Policy: Allow authenticated users to delete their own documents
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'agent-documents');
