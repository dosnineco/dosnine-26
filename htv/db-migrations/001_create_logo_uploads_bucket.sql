-- Create storage bucket for HTV logo uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('htv-logos', 'htv-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for htv-logos bucket
-- Allow anyone to upload (we'll validate via application logic)
CREATE POLICY "Allow public uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'htv-logos');

-- Allow anyone to read logos
CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'htv-logos');

-- Allow authenticated users to delete their own uploads (optional)
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'htv-logos');

-- Create table to track logo uploads with order info
CREATE TABLE IF NOT EXISTS public.htv_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  size TEXT NOT NULL,
  color TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 4,
  delivery_area TEXT NOT NULL,
  rush_order BOOLEAN DEFAULT false,
  logo_url TEXT,
  logo_filename TEXT,
  subtotal INTEGER NOT NULL,
  delivery_fee INTEGER NOT NULL,
  total INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, verified, processing, completed
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.htv_orders ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert orders (customer submissions)
-- Note: Public users cannot SELECT after insert, so application should not use .select() after .insert()
CREATE POLICY "Allow public inserts"
ON public.htv_orders FOR INSERT
TO public
WITH CHECK (true);

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.users
    WHERE clerk_id = auth.jwt() ->> 'sub'
    AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only allow admins to view orders
CREATE POLICY "Allow admin reads"
ON public.htv_orders FOR SELECT
TO authenticated
USING (is_admin());

-- Only allow admins to update orders
CREATE POLICY "Allow admin updates"
ON public.htv_orders FOR UPDATE
TO authenticated
USING (is_admin());

-- Only allow admins to delete orders
CREATE POLICY "Allow admin deletes"
ON public.htv_orders FOR DELETE
TO authenticated
USING (is_admin());

-- Create index for faster queries
CREATE INDEX idx_htv_orders_created_at ON public.htv_orders(created_at DESC);
CREATE INDEX idx_htv_orders_status ON public.htv_orders(status);
CREATE INDEX idx_htv_orders_phone ON public.htv_orders(phone);
