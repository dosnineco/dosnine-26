-- Create storage bucket for HTV logos (PUBLIC READ ACCESS)
INSERT INTO storage.buckets (id, name, public)
VALUES ('htv-logos', 'htv-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for HTV logos
-- CRITICAL: Public can upload logos, anyone can view them

-- Policy 1: Public can upload logos
CREATE POLICY "Public can upload HTV logos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'htv-logos'
);

-- Policy 2: Public can view HTV logos
CREATE POLICY "Public can view HTV logos"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'htv-logos'
);

-- Policy 3: Public can delete their own logos (by auth user)
CREATE POLICY "Users can delete own HTV logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'htv-logos'
);

-- Policy 4: Allow admin to delete any logo
CREATE POLICY "Admin can delete any HTV logo"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'htv-logos' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.clerk_id = auth.uid()::text
    AND users.role = 'admin'
  )
);
