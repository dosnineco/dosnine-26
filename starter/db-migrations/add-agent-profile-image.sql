-- Add profile_image_url column to agents table
-- This will store the agent's profile photo in the agent-documents bucket

ALTER TABLE agents
ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN agents.profile_image_url IS 'Path to agent profile image in agent-documents storage bucket';
