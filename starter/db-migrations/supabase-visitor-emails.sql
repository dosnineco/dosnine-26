-- Create visitor_emails table to capture all visitor emails
CREATE TABLE IF NOT EXISTS visitor_emails (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  user_agent TEXT,
  ip_address VARCHAR(45),
  referrer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  CONSTRAINT unique_email_per_day UNIQUE (email, DATE(created_at))
);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_visitor_emails_email ON visitor_emails(email);
CREATE INDEX IF NOT EXISTS idx_visitor_emails_created_at ON visitor_emails(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE visitor_emails ENABLE ROW LEVEL SECURITY;

-- Public insert policy (allow anyone to insert)
CREATE POLICY "Allow public email capture" ON visitor_emails
  FOR INSERT WITH CHECK (true);

-- Admin read policy (only admin can read)
CREATE POLICY "Admin can read visitor emails" ON visitor_emails
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
    )
  );

GRANT INSERT ON visitor_emails TO anon;
GRANT SELECT ON visitor_emails TO authenticated;
