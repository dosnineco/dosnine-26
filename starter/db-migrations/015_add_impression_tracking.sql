-- Add impression tracking columns to advertisements table
ALTER TABLE advertisements 
ADD COLUMN IF NOT EXISTS impressions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS clicks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_impression_at TIMESTAMPTZ;

-- Drop old functions if they exist (cleanup)
DROP FUNCTION IF EXISTS increment_ad_impressions(INTEGER);
DROP FUNCTION IF EXISTS increment_ad_clicks(INTEGER);
DROP FUNCTION IF EXISTS increment_ad_impressions(UUID);
DROP FUNCTION IF EXISTS increment_ad_clicks(UUID);

-- Create function to increment impressions
CREATE OR REPLACE FUNCTION increment_ad_impressions(ad_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE advertisements
  SET 
    impressions = impressions + 1,
    last_impression_at = NOW()
  WHERE id = ad_id;
END;
$$;

-- Create function to increment clicks
CREATE OR REPLACE FUNCTION increment_ad_clicks(ad_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE advertisements
  SET clicks = clicks + 1
  WHERE id = ad_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_ad_impressions(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_ad_clicks(UUID) TO anon, authenticated;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_advertisements_impressions ON advertisements(impressions DESC);
CREATE INDEX IF NOT EXISTS idx_advertisements_clicks ON advertisements(clicks DESC);
