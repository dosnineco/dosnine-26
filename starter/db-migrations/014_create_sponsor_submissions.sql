-- Create sponsor_submissions table for advertisement purchase requests
CREATE TABLE IF NOT EXISTS sponsor_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'contractor',
  description TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  website TEXT,
  image_url TEXT,
  is_featured BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create advertisements table for active ads
CREATE TABLE IF NOT EXISTS advertisements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'contractor',
  description TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  website TEXT,
  image_url TEXT,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_clerk_id TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);



-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can submit sponsorships" ON sponsor_submissions;
DROP POLICY IF EXISTS "Admins can view all submissions" ON sponsor_submissions;
DROP POLICY IF EXISTS "Admins can update submissions" ON sponsor_submissions;
DROP POLICY IF EXISTS "Anyone can view active advertisements" ON advertisements;
DROP POLICY IF EXISTS "Authenticated users can view all advertisements" ON advertisements;
DROP POLICY IF EXISTS "Authenticated users can create advertisements" ON advertisements;
DROP POLICY IF EXISTS "Authenticated users can update advertisements" ON advertisements;
DROP POLICY IF EXISTS "Authenticated users can delete advertisements" ON advertisements;

-- Anonymous and authenticated users can insert submissions
CREATE POLICY "Anyone can submit sponsorships"
  ON sponsor_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Authenticated users can read all submissions
CREATE POLICY "Admins can view all submissions"
  ON sponsor_submissions
  FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can update submissions
CREATE POLICY "Admins can update submissions"
  ON sponsor_submissions
  FOR UPDATE
  TO authenticated
  USING (true);

-- Everyone can read active ads
CREATE POLICY "Anyone can view active advertisements"
  ON advertisements
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Authenticated users can view all ads (for admin)
CREATE POLICY "Authenticated users can view all advertisements"
  ON advertisements
  FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert ads
CREATE POLICY "Authenticated users can create advertisements"
  ON advertisements
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update ads
CREATE POLICY "Authenticated users can update advertisements"
  ON advertisements
  FOR UPDATE
  TO authenticated
  USING (true);

-- Authenticated users can delete ads
CREATE POLICY "Authenticated users can delete advertisements"
  ON advertisements
  FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sponsor_submissions_status ON sponsor_submissions(status);
CREATE INDEX IF NOT EXISTS idx_sponsor_submissions_submitted_at ON sponsor_submissions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_advertisements_active ON advertisements(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_advertisements_featured ON advertisements(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_advertisements_created_at ON advertisements(created_at DESC);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sponsor_submissions_updated_at
  BEFORE UPDATE ON sponsor_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_advertisements_updated_at
  BEFORE UPDATE ON advertisements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
