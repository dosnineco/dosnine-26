-- Create agent_feedback table
CREATE TABLE IF NOT EXISTS agent_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  admin_message TEXT,
  agent_response TEXT,
  message_read BOOLEAN DEFAULT FALSE,
  response_read BOOLEAN DEFAULT FALSE,
  admin_clerk_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_agent_feedback_agent_id ON agent_feedback(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_feedback_created_at ON agent_feedback(created_at DESC);

-- Enable Row Level Security
ALTER TABLE agent_feedback ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow all operations for API" ON agent_feedback;

-- Policy: Allow all authenticated operations (security handled in API layer)
-- Since we're using Clerk authentication (not Supabase Auth), auth.uid() is always null
-- We handle authorization in the API endpoints instead
CREATE POLICY "Allow all operations for API"
  ON agent_feedback
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_agent_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agent_feedback_updated_at ON agent_feedback;

CREATE TRIGGER agent_feedback_updated_at
  BEFORE UPDATE ON agent_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_feedback_updated_at();
