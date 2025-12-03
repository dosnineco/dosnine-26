-- Create page_clicks table for analytics tracking
CREATE TABLE IF NOT EXISTS page_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  path TEXT NOT NULL,
  source TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_address TEXT,
  session_id TEXT,
  property_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_page_clicks_created_at ON page_clicks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_clicks_path ON page_clicks(path);
CREATE INDEX IF NOT EXISTS idx_page_clicks_source ON page_clicks(source);

-- Enable RLS
ALTER TABLE page_clicks ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (for tracking)
CREATE POLICY "Allow anonymous inserts" ON page_clicks
  FOR INSERT
  WITH CHECK (true);

-- Allow authenticated users to read
CREATE POLICY "Allow authenticated read" ON page_clicks
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create view for daily analytics
CREATE OR REPLACE VIEW daily_analytics AS
SELECT
  DATE(created_at) as date,
  path,
  source,
  COUNT(*) as clicks
FROM page_clicks
GROUP BY DATE(created_at), path, source
ORDER BY DATE(created_at) DESC, clicks DESC;
