-- Add last_request_assigned_at column to agents table for fair distribution

ALTER TABLE public.agents 
ADD COLUMN IF NOT EXISTS last_request_assigned_at TIMESTAMPTZ;

-- Create index for faster sorting
CREATE INDEX IF NOT EXISTS idx_agents_last_request_assigned 
ON public.agents(last_request_assigned_at);

-- Update service_requests status to 'assigned' when agent is assigned
-- This helps track request lifecycle

COMMENT ON COLUMN agents.last_request_assigned_at IS 'Timestamp of last request assigned to this agent for fair round-robin distribution';
